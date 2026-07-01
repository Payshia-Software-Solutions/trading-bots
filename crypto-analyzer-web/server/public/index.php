<?php
// Main entry point for the PHP backend
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS, PUT, DELETE");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../app/Router.php';

$router = new Router();

// Import routes
require_once __DIR__ . '/../routes/api.php';

// Dispatch
$requestUri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$method = $_SERVER['REQUEST_METHOD'];

// Remove base path if necessary (e.g. /trading-bots/crypto-analyzer-web/server/public)
$basePath = '/trading-bots/crypto-analyzer-web/server/public';
if (strpos($requestUri, $basePath) === 0) {
    $requestUri = substr($requestUri, strlen($basePath));
}

$router->dispatch($method, $requestUri);
