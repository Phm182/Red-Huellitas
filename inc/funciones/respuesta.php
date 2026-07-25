<?php
/**
 * Helpers de respuesta JSON para Red Huellitas.
 * No modifica ni depende de contapp_json_encode()/contapp_json_response() de bd.php.
 */

// CORS: la app Expo en web corre en un puerto propio (ej: localhost:8081),
// distinto del backend PHP servido por Apache/XAMPP, así que el navegador
// bloquea el fetch sin estos headers. En nativo (iOS/Android) esto no aplica
// (CORS es una restricción exclusiva de navegadores), pero no molesta dejarlo.
if (!headers_sent()) {
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization');
}
if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if (!function_exists('json_encode_rh')) {
    function json_encode_rh($data, int $extraFlags = 0): string
    {
        $flags = JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | $extraFlags;
        $json = json_encode($data, $flags);
        if ($json === false) {
            return '{"success":false,"message":"Error al codificar respuesta JSON","data":null}';
        }
        return $json;
    }
}

if (!function_exists('json_response')) {
    function json_response(array $data, int $httpCode = 200): void
    {
        // Descarta BOM/warnings accidentalmente bufferizados por includes previos.
        while (ob_get_level() > 0) {
            ob_end_clean();
        }
        if (!headers_sent()) {
            header('Content-Type: application/json; charset=utf-8');
        }
        http_response_code($httpCode);
        echo json_encode_rh($data);
        exit;
    }
}

if (!function_exists('json_success')) {
    function json_success($data = null, string $message = 'OK', int $httpCode = 200): void
    {
        json_response(['success' => true, 'message' => $message, 'data' => $data], $httpCode);
    }
}

if (!function_exists('json_error')) {
    function json_error(string $message, int $httpCode = 400, $data = null): void
    {
        json_response(['success' => false, 'message' => $message, 'data' => $data], $httpCode);
    }
}
