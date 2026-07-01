<?php
require_once __DIR__ . '/../../config/database.php';

class SignalController {
    private $db;

    public function __construct() {
        $database = new Database();
        $this->db = $database->getConnection();
    }

    // GET /api/signals
    public function index() {
        header('Content-Type: application/json');
        try {
            $query = "SELECT * FROM signals ORDER BY created_at DESC LIMIT 50";
            $stmt = $this->db->prepare($query);
            $stmt->execute();
            $signals = $stmt->fetchAll(PDO::FETCH_ASSOC);
            echo json_encode($signals);
        } catch(PDOException $e) {
            http_response_code(500);
            echo json_encode(["error" => "Failed to fetch signals: " . $e->getMessage()]);
        }
    }

    // POST /api/signals
    public function store() {
        header('Content-Type: application/json');
        $data = json_decode(file_get_contents("php://input"), true);
        
        if (!empty($data['pair']) && !empty($data['mode'])) {
            try {
                $query = "INSERT INTO signals (pair, mode, risk_mode, current_price, buy_target, sell_target, stop_loss, rr_ratio, score, status, confidence_level, risk_level) 
                          VALUES (:pair, :mode, :risk_mode, :current_price, :buy_target, :sell_target, :stop_loss, :rr_ratio, :score, :status, :confidence_level, :risk_level)";
                
                $stmt = $this->db->prepare($query);
                
                $stmt->bindParam(":pair", $data['pair']);
                $stmt->bindParam(":mode", $data['mode']);
                $risk_mode = isset($data['risk_mode']) ? $data['risk_mode'] : 'safe';
                $stmt->bindParam(":risk_mode", $risk_mode);
                $stmt->bindParam(":current_price", $data['current_price']);
                $stmt->bindParam(":buy_target", $data['buy_target']);
                $stmt->bindParam(":sell_target", $data['sell_target']);
                $stmt->bindParam(":stop_loss", $data['stop_loss']);
                $stmt->bindParam(":rr_ratio", $data['rr_ratio']);
                $stmt->bindParam(":score", $data['score']);
                $status = isset($data['status']) ? $data['status'] : 'PENDING';
                $stmt->bindParam(":status", $status);
                $confidence_level = isset($data['confidence_level']) ? $data['confidence_level'] : 'MODERATE';
                $stmt->bindParam(":confidence_level", $confidence_level);
                $risk_level = isset($data['risk_level']) ? $data['risk_level'] : 'MEDIUM';
                $stmt->bindParam(":risk_level", $risk_level);
                
                if ($stmt->execute()) {
                    http_response_code(201);
                    $data['id'] = $this->db->lastInsertId();
                    echo json_encode(["message" => "Signal created successfully", "signal" => $data]);
                } else {
                    http_response_code(503);
                    echo json_encode(["message" => "Unable to create signal."]);
                }
            } catch(PDOException $e) {
                http_response_code(500);
                echo json_encode(["error" => "Failed to create signal: " . $e->getMessage()]);
            }
        } else {
            http_response_code(400);
            $raw = file_get_contents("php://input");
            echo json_encode(["message" => "Incomplete data.", "raw" => $raw, "parsed" => $data]);
        }
    }

    // PUT /api/signals/update
    public function updateStatus() {
        header('Content-Type: application/json');
        $data = json_decode(file_get_contents("php://input"), true);
        
        if (!empty($data['id']) && !empty($data['status'])) {
            try {
                $query = "UPDATE signals SET status = :status WHERE id = :id";
                $stmt = $this->db->prepare($query);
                
                $stmt->bindParam(":status", $data['status']);
                $stmt->bindParam(":id", $data['id']);
                
                if ($stmt->execute()) {
                    http_response_code(200);
                    echo json_encode(["message" => "Signal updated successfully"]);
                } else {
                    http_response_code(503);
                    echo json_encode(["message" => "Unable to update signal."]);
                }
            } catch(PDOException $e) {
                http_response_code(500);
                echo json_encode(["error" => "Failed to update signal: " . $e->getMessage()]);
            }
        } else {
            http_response_code(400);
            echo json_encode(["message" => "Incomplete data."]);
        }
    }
}
