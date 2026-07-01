<?php
class Router {
    private $routes = [];

    public function add($method, $path, $handler) {
        $this->routes[] = [
            'method' => strtoupper($method),
            'path' => $path,
            'handler' => $handler
        ];
    }

    public function get($path, $handler) {
        $this->add('GET', $path, $handler);
    }

    public function post($path, $handler) {
        $this->add('POST', $path, $handler);
    }

    public function put($path, $handler) {
        $this->add('PUT', $path, $handler);
    }

    public function dispatch($method, $uri) {
        // Strip trailing slash if present
        $uri = rtrim($uri, '/');
        if (empty($uri)) $uri = '/';

        foreach ($this->routes as $route) {
            if ($route['method'] === $method && $route['path'] === $uri) {
                // If handler is a closure, call it directly
                if (is_callable($route['handler'])) {
                    call_user_func($route['handler']);
                    return;
                }
                
                // If it's a Controller@action string
                if (is_string($route['handler'])) {
                    list($controllerName, $action) = explode('@', $route['handler']);
                    require_once __DIR__ . '/Controllers/' . $controllerName . '.php';
                    $controller = new $controllerName();
                    $controller->$action();
                    return;
                }
            }
        }

        // 404
        http_response_code(404);
        echo json_encode(['error' => 'Route not found: ' . $uri]);
    }
}
