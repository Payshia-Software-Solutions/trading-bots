<?php
class ApiController {
    
    // Respond with JSON helper
    private function jsonResponse($data, $statusCode = 200) {
        header('Content-Type: application/json');
        http_response_code($statusCode);
        echo json_encode($data);
        exit();
    }

    public function healthCheck() {
        $this->jsonResponse([
            'status' => 'ok',
            'message' => 'PHP MVC Backend is running.',
            'timestamp' => date('c')
        ]);
    }

    public function getSignals() {
        // For Phase 1, we just return empty or mock structure
        // Later this will connect to the Model and DB
        $this->jsonResponse([
            'status' => 'success',
            'data' => []
        ]);
    }

    public function saveSignal() {
        // Read JSON body
        $json = file_get_contents('php://input');
        $data = json_decode($json, true);

        if (!$data) {
            $this->jsonResponse(['error' => 'Invalid JSON'], 400);
        }

        // Logic to save to DB will go here...

        $this->jsonResponse([
            'status' => 'success',
            'message' => 'Signal saved successfully',
            'received' => $data
        ]);
    }
}
