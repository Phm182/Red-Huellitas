<?php
/**
 * Verificación de Google ID Token vía el endpoint tokeninfo de Google.
 * No requiere dependencias de composer; suficiente para Fase 1.
 * (Hardening futuro: verificar firma JWT localmente contra las JWKS de Google.)
 */

/**
 * Verifica un ID token de Google y devuelve su payload si es válido, o null si no.
 * Chequea: firma/validez (delegado a Google), issuer, y que el 'aud' esté en
 * la lista de client IDs configurados para esta app.
 */
function rh_verificar_google_id_token(string $idToken): ?array
{
    $configFile = __DIR__ . '/../config/google.local.php';
    $clientIds = [];
    if (is_file($configFile)) {
        $config = require $configFile;
        $clientIds = array_filter([
            $config['GOOGLE_CLIENT_ID_WEB'] ?? null,
            $config['GOOGLE_CLIENT_ID_ANDROID'] ?? null,
            $config['GOOGLE_CLIENT_ID_IOS'] ?? null,
        ]);
    }

    $url = 'https://oauth2.googleapis.com/tokeninfo?id_token=' . urlencode($idToken);

    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 8);
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($response === false || $httpCode !== 200) {
        return null;
    }

    $payload = json_decode($response, true);
    if (!is_array($payload)) {
        return null;
    }

    $issuerValido = in_array($payload['iss'] ?? '', ['accounts.google.com', 'https://accounts.google.com'], true);
    if (!$issuerValido) {
        return null;
    }

    if (!empty($clientIds) && !in_array($payload['aud'] ?? '', $clientIds, true)) {
        return null;
    }

    if (($payload['exp'] ?? 0) < time()) {
        return null;
    }

    return $payload;
}
