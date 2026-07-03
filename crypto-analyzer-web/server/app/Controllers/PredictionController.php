<?php
require_once __DIR__ . '/../../config/database.php';

class PredictionController {
    private $db;

    public function __construct() {
        $database = new Database();
        $this->db = $database->getConnection();
    }

    // GET /api/predictions — List all snapshots
    public function index() {
        header('Content-Type: application/json');
        try {
            $query = "SELECT * FROM prediction_snapshots ORDER BY created_at DESC LIMIT 100";
            $stmt = $this->db->prepare($query);
            $stmt->execute();
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
            echo json_encode($rows);
        } catch(PDOException $e) {
            http_response_code(500);
            echo json_encode(["error" => $e->getMessage()]);
        }
    }

    // POST /api/predictions — Save a new snapshot
    public function store() {
        header('Content-Type: application/json');
        $data = json_decode(file_get_contents("php://input"), true);

        if (empty($data['pair']) || empty($data['entry_price'])) {
            http_response_code(400);
            echo json_encode(["message" => "Missing required fields."]);
            return;
        }

        try {
            $query = "INSERT INTO prediction_snapshots 
                (pair, mode, risk_mode, direction, score,
                 entry_price,
                 wave1_price, wave2_price, wave3_price, wave4_price, wave5_price,
                 wave1_time, wave2_time, wave3_time, wave4_time, wave5_time)
                VALUES 
                (:pair, :mode, :risk_mode, :direction, :score,
                 :entry_price,
                 :wave1_price, :wave2_price, :wave3_price, :wave4_price, :wave5_price,
                 :wave1_time, :wave2_time, :wave3_time, :wave4_time, :wave5_time)";

            $stmt = $this->db->prepare($query);
            $stmt->bindParam(":pair", $data['pair']);
            $stmt->bindParam(":mode", $data['mode']);
            $risk_mode = $data['risk_mode'] ?? 'safe';
            $stmt->bindParam(":risk_mode", $risk_mode);
            $stmt->bindParam(":direction", $data['direction']);
            $stmt->bindParam(":score", $data['score']);
            $stmt->bindParam(":entry_price", $data['entry_price']);
            $stmt->bindParam(":wave1_price", $data['wave1_price']);
            $stmt->bindParam(":wave2_price", $data['wave2_price']);
            $stmt->bindParam(":wave3_price", $data['wave3_price']);
            $stmt->bindParam(":wave4_price", $data['wave4_price']);
            $stmt->bindParam(":wave5_price", $data['wave5_price']);
            $stmt->bindParam(":wave1_time", $data['wave1_time']);
            $stmt->bindParam(":wave2_time", $data['wave2_time']);
            $stmt->bindParam(":wave3_time", $data['wave3_time']);
            $stmt->bindParam(":wave4_time", $data['wave4_time']);
            $stmt->bindParam(":wave5_time", $data['wave5_time']);

            if ($stmt->execute()) {
                http_response_code(201);
                echo json_encode(["message" => "Snapshot saved", "id" => $this->db->lastInsertId()]);
            } else {
                http_response_code(503);
                echo json_encode(["message" => "Failed to save snapshot."]);
            }
        } catch(PDOException $e) {
            http_response_code(500);
            echo json_encode(["error" => $e->getMessage()]);
        }
    }

    // POST /api/predictions/audit/:id — Audit a specific snapshot with real prices
    public function audit() {
        header('Content-Type: application/json');
        $data = json_decode(file_get_contents("php://input"), true);

        if (empty($data['id']) || empty($data['actuals'])) {
            http_response_code(400);
            echo json_encode(["message" => "Missing id or actuals."]);
            return;
        }

        $actuals = $data['actuals'];

        // Fetch original snapshot
        $stmt = $this->db->prepare("SELECT * FROM prediction_snapshots WHERE id = :id");
        $stmt->bindParam(":id", $data['id']);
        $stmt->execute();
        $snap = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$snap) {
            http_response_code(404);
            echo json_encode(["message" => "Snapshot not found."]);
            return;
        }

        // Calculate per-wave accuracy
        $waves = ['wave1', 'wave2', 'wave3', 'wave4', 'wave5'];
        $totalAccuracy = 0;
        $counted = 0;
        foreach ($waves as $w) {
            $predicted = (float)$snap[$w . '_price'];
            $actual = isset($actuals[$w]) ? (float)$actuals[$w] : null;
            if ($predicted > 0 && $actual !== null && $actual > 0) {
                $diff = abs($predicted - $actual) / $predicted * 100;
                $accuracy = max(0, 100 - $diff);
                $totalAccuracy += $accuracy;
                $counted++;
            }
        }

        $overallAccuracy = $counted > 0 ? round($totalAccuracy / $counted, 2) : 0;

        // Update snapshot with audit data
        $query = "UPDATE prediction_snapshots SET 
            wave1_actual = :w1, wave2_actual = :w2, wave3_actual = :w3,
            wave4_actual = :w4, wave5_actual = :w5,
            overall_accuracy = :accuracy,
            audit_status = 'AUDITED', audited_at = NOW()
            WHERE id = :id";

        $stmt = $this->db->prepare($query);
        $stmt->bindParam(":w1", $actuals['wave1'] ?? null);
        $stmt->bindParam(":w2", $actuals['wave2'] ?? null);
        $stmt->bindParam(":w3", $actuals['wave3'] ?? null);
        $stmt->bindParam(":w4", $actuals['wave4'] ?? null);
        $stmt->bindParam(":w5", $actuals['wave5'] ?? null);
        $stmt->bindParam(":accuracy", $overallAccuracy);
        $stmt->bindParam(":id", $data['id']);
        $stmt->execute();

        // Auto-update model weights based on cumulative errors
        $this->recalibrateWeights($snap['direction']);

        echo json_encode([
            "message" => "Audit complete",
            "overall_accuracy" => $overallAccuracy,
        ]);
    }

    // GET /api/predictions/weights — Get current model calibration weights
    public function getWeights() {
        header('Content-Type: application/json');
        try {
            $stmt = $this->db->prepare("SELECT weight_key, weight_value, description FROM model_weights");
            $stmt->execute();
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $weights = [];
            foreach ($rows as $row) {
                $weights[$row['weight_key']] = (float)$row['weight_value'];
            }
            echo json_encode($weights);
        } catch(PDOException $e) {
            http_response_code(500);
            echo json_encode(["error" => $e->getMessage()]);
        }
    }

    // Internal — Recalibrate model weights based on past audit results
    private function recalibrateWeights($direction) {
        // Fetch last 10 audited snapshots for this direction
        $stmt = $this->db->prepare(
            "SELECT wave1_price, wave1_actual, wave3_price, wave3_actual, wave5_price, wave5_actual
             FROM prediction_snapshots 
             WHERE audit_status = 'AUDITED' AND direction = :dir AND wave1_actual IS NOT NULL
             ORDER BY audited_at DESC LIMIT 10"
        );
        $stmt->bindParam(":dir", $direction);
        $stmt->execute();
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        if (count($rows) < 3) return; // need at least 3 data points

        // Calculate average ratio: actual / predicted for each wave
        $w1Ratios = array_filter(array_map(fn($r) => $r['wave1_price'] > 0 ? $r['wave1_actual'] / $r['wave1_price'] : null, $rows));
        $w3Ratios = array_filter(array_map(fn($r) => $r['wave3_price'] > 0 ? $r['wave3_actual'] / $r['wave3_price'] : null, $rows));
        $w5Ratios = array_filter(array_map(fn($r) => $r['wave5_price'] > 0 ? $r['wave5_actual'] / $r['wave5_price'] : null, $rows));

        $avgW1 = count($w1Ratios) > 0 ? array_sum($w1Ratios) / count($w1Ratios) : 1.0;
        $avgW3 = count($w3Ratios) > 0 ? array_sum($w3Ratios) / count($w3Ratios) : 1.0;
        $avgW5 = count($w5Ratios) > 0 ? array_sum($w5Ratios) / count($w5Ratios) : 1.0;

        // Dampen adjustment (don't swing too aggressively — blend 80% old, 20% new)
        $blendedW1 = round(0.8 + 0.2 * $avgW1, 6);
        $blendedW3 = round(0.8 + 0.2 * $avgW3, 6);
        $blendedW5 = round(0.8 + 0.2 * $avgW5, 6);

        $prefix = $direction === 'BULLISH' ? 'bullish' : 'bearish';

        $stmt = $this->db->prepare(
            "UPDATE model_weights SET weight_value = :val WHERE weight_key = :key"
        );
        foreach ([
            "{$prefix}_wave1_mult" => $blendedW1,
            "{$prefix}_wave3_mult" => $blendedW3,
            "{$prefix}_wave5_mult" => $blendedW5,
        ] as $key => $val) {
            $stmt->bindParam(":val", $val);
            $stmt->bindParam(":key", $key);
            $stmt->execute();
        }
    }
}
