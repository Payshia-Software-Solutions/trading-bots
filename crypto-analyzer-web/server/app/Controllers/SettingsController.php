<?php
namespace App\Controllers;

require_once __DIR__ . '/../../config/database.php';
use Database;
use PDO;
use PDOException;

class SettingsController {
    private $db;

    public function __construct() {
        $database = new Database();
        $this->db = $database->getConnection();
    }

    public function index() {
        header('Content-Type: application/json');
        
        try {
            $query = "SELECT setting_key, setting_value FROM settings";
            $stmt = $this->db->prepare($query);
            $stmt->execute();
            
            $settings = [];
            while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
                $settings[$row['setting_key']] = $row['setting_value'];
            }
            
            echo json_encode($settings);
        } catch(PDOException $e) {
            http_response_code(500);
            echo json_encode(["error" => "Failed to fetch settings: " . $e->getMessage()]);
        }
    }

    public function store() {
        header('Content-Type: application/json');
        $data = json_decode(file_get_contents("php://input"), true);
        
        if (!empty($data)) {
            try {
                $this->db->beginTransaction();
                
                $query = "INSERT INTO settings (setting_key, setting_value) VALUES (:key, :val) ON DUPLICATE KEY UPDATE setting_value = :val";
                $stmt = $this->db->prepare($query);
                
                foreach ($data as $key => $value) {
                    $stmt->bindParam(":key", $key);
                    $stmt->bindParam(":val", $value);
                    $stmt->execute();
                }
                
                $this->db->commit();
                http_response_code(200);
                echo json_encode(["message" => "Settings updated successfully"]);
            } catch(PDOException $e) {
                $this->db->rollBack();
                http_response_code(500);
                echo json_encode(["error" => "Failed to update settings: " . $e->getMessage()]);
            }
        } else {
            http_response_code(400);
            echo json_encode(["message" => "Incomplete data."]);
        }
    }
}
