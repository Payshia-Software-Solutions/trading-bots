<?php
require_once __DIR__ . '/../app/Router.php';

$router = new Router();

// CORS Headers for React
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Signal Routes
$router->get('/api/signals', 'SignalController@index');
$router->post('/api/signals', 'SignalController@store');
$router->put('/api/signals/update', 'SignalController@updateStatus');
$router->delete('/api/signals/delete', 'SignalController@destroy');

// Prediction Snapshot Routes
$router->get('/api/predictions', 'PredictionController@index');
$router->post('/api/predictions', 'PredictionController@store');
$router->post('/api/predictions/audit', 'PredictionController@audit');
$router->get('/api/predictions/weights', 'PredictionController@getWeights');

// Settings Routes
$router->get('/api/settings', 'SettingsController@index');
$router->post('/api/settings', 'SettingsController@store');

// Auth Routes
$router->post('/api/auth/register', 'AuthController@register');
$router->post('/api/auth/login', 'AuthController@login');
$router->post('/api/auth/google', 'AuthController@googleLogin');
$router->post('/api/auth/logout', 'AuthController@logout');
$router->post('/api/auth/me', 'AuthController@me');

// The dispatch is handled in public/index.php
