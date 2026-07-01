<?php
require_once __DIR__ . '/../app/Router.php';

$router = new Router();

// CORS Headers for React
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Routes
$router->get('/api/signals', 'SignalController@index');
$router->post('/api/signals', 'SignalController@store');
$router->put('/api/signals/update', 'SignalController@updateStatus');

// The dispatch is handled in public/index.php
