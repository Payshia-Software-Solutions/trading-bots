<?php
require_once __DIR__ . '/../../config/database.php';

class AuthController {
    private $db;

    public function __construct() {
        $database = new Database();
        $this->db = $database->getConnection();
    }

    private function generateToken() {
        return bin2hex(random_bytes(32));
    }

    public function register() {
        header('Content-Type: application/json');
        $data = json_decode(file_get_contents("php://input"), true);

        if (empty($data['name']) || empty($data['email']) || empty($data['password'])) {
            http_response_code(400);
            echo json_encode(["message" => "Name, email, and password are required."]);
            return;
        }

        // Check if email exists
        $stmt = $this->db->prepare("SELECT id FROM users WHERE email = ?");
        $stmt->execute([$data['email']]);
        if ($stmt->fetch()) {
            http_response_code(409);
            echo json_encode(["message" => "Email already exists."]);
            return;
        }

        $hash = password_hash($data['password'], PASSWORD_BCRYPT);
        
        $stmt = $this->db->prepare("INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)");
        if ($stmt->execute([$data['name'], $data['email'], $hash])) {
            $userId = $this->db->lastInsertId();
            $token = $this->generateToken();
            $expires = date('Y-m-d H:i:s', strtotime('+30 days'));
            
            $stmt = $this->db->prepare("INSERT INTO user_sessions (user_id, token, expires_at) VALUES (?, ?, ?)");
            $stmt->execute([$userId, $token, $expires]);

            echo json_encode([
                "message" => "Registration successful",
                "token" => $token,
                "user" => ["id" => $userId, "name" => $data['name'], "email" => $data['email']]
            ]);
        } else {
            http_response_code(500);
            echo json_encode(["message" => "Failed to create user."]);
        }
    }

    public function login() {
        header('Content-Type: application/json');
        $data = json_decode(file_get_contents("php://input"), true);

        if (empty($data['email']) || empty($data['password'])) {
            http_response_code(400);
            echo json_encode(["message" => "Email and password are required."]);
            return;
        }

        $stmt = $this->db->prepare("SELECT id, name, email, password_hash FROM users WHERE email = ?");
        $stmt->execute([$data['email']]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($user && password_verify($data['password'], $user['password_hash'])) {
            $token = $this->generateToken();
            $expires = date('Y-m-d H:i:s', strtotime('+30 days'));
            
            $stmt = $this->db->prepare("INSERT INTO user_sessions (user_id, token, expires_at) VALUES (?, ?, ?)");
            $stmt->execute([$user['id'], $token, $expires]);

            echo json_encode([
                "message" => "Login successful",
                "token" => $token,
                "user" => ["id" => $user['id'], "name" => $user['name'], "email" => $user['email']]
            ]);
        } else {
            http_response_code(401);
            echo json_encode(["message" => "Invalid email or password."]);
        }
    }

    public function googleLogin() {
        header('Content-Type: application/json');
        $data = json_decode(file_get_contents("php://input"), true);

        if (empty($data['credential'])) {
            http_response_code(400);
            echo json_encode(["message" => "Credential is required."]);
            return;
        }

        // Verify the credential with Google's endpoint
        $url = 'https://oauth2.googleapis.com/tokeninfo?id_token=' . $data['credential'];
        
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        $response = curl_exec($ch);
        curl_close($ch);

        $payload = json_decode($response, true);
        
        if (isset($payload['error']) || !isset($payload['email'])) {
            http_response_code(401);
            echo json_encode(["message" => "Invalid Google token."]);
            return;
        }

        $googleId = $payload['sub'];
        $email = $payload['email'];
        $name = $payload['name'] ?? 'User';

        $stmt = $this->db->prepare("SELECT id, name, email, google_id FROM users WHERE google_id = ? OR email = ?");
        $stmt->execute([$googleId, $email]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($user) {
            // Update google_id if matched by email
            if (empty($user['google_id'])) {
                $upd = $this->db->prepare("UPDATE users SET google_id = ? WHERE id = ?");
                $upd->execute([$googleId, $user['id']]);
            }
            $userId = $user['id'];
        } else {
            // Create user
            $stmt = $this->db->prepare("INSERT INTO users (name, email, google_id) VALUES (?, ?, ?)");
            if ($stmt->execute([$name, $email, $googleId])) {
                $userId = $this->db->lastInsertId();
            } else {
                http_response_code(500);
                echo json_encode(["message" => "Failed to create user from Google."]);
                return;
            }
        }

        // Create session
        $token = $this->generateToken();
        $expires = date('Y-m-d H:i:s', strtotime('+30 days'));
        
        $stmt = $this->db->prepare("INSERT INTO user_sessions (user_id, token, expires_at) VALUES (?, ?, ?)");
        $stmt->execute([$userId, $token, $expires]);

        echo json_encode([
            "message" => "Google Login successful",
            "token" => $token,
            "user" => ["id" => $userId, "name" => $name, "email" => $email]
        ]);
    }

    public function me() {
        header('Content-Type: application/json');
        $headers = apache_request_headers();
        $authHeader = isset($headers['Authorization']) ? $headers['Authorization'] : '';
        
        $token = '';
        if (preg_match('/Bearer\s(\S+)/', $authHeader, $matches)) {
            $token = $matches[1];
        } else {
            $data = json_decode(file_get_contents("php://input"), true);
            $token = $data['token'] ?? '';
        }

        if (empty($token)) {
            http_response_code(401);
            echo json_encode(["message" => "No token provided."]);
            return;
        }

        $stmt = $this->db->prepare("
            SELECT u.id, u.name, u.email 
            FROM users u
            JOIN user_sessions s ON u.id = s.user_id
            WHERE s.token = ? AND s.expires_at > NOW()
        ");
        $stmt->execute([$token]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($user) {
            echo json_encode(["user" => $user]);
        } else {
            http_response_code(401);
            echo json_encode(["message" => "Invalid or expired token."]);
        }
    }

    public function logout() {
        header('Content-Type: application/json');
        $data = json_decode(file_get_contents("php://input"), true);
        $token = $data['token'] ?? '';

        if ($token) {
            $stmt = $this->db->prepare("DELETE FROM user_sessions WHERE token = ?");
            $stmt->execute([$token]);
        }
        echo json_encode(["message" => "Logged out successfully."]);
    }
}
