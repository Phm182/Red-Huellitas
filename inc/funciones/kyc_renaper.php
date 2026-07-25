<?php
/**
 * Integración Renaper / SID — validación facial contra el registro oficial.
 *
 * Renaper ofrece (vía convenio) "Validación por medio de fotografía de rostro":
 * se envía DNI + selfie y el servicio compara con la foto en el padrón.
 * Sin convenio, este módulo queda desactivado y no rompe el flujo Gemini.
 *
 * También admite un proveedor HTTP genérico (intermediario) con el mismo
 * contrato de request/response documentado abajo.
 */

const RH_KYC_TIMEOUT_DEFAULT = 45;

function rh_kyc_config(): array
{
    $configFile = __DIR__ . '/../config/kyc.local.php';
    if (!is_file($configFile)) {
        return [];
    }
    return require $configFile;
}

function rh_kyc_configurado(): bool
{
    $c = rh_kyc_config();
    return !empty($c['KYC_HABILITADO'])
        && !empty($c['KYC_BASE_URL'])
        && (!empty($c['KYC_API_KEY']) || (!empty($c['KYC_CLIENT_ID']) && !empty($c['KYC_CLIENT_SECRET'])));
}

/**
 * Confronte facial: selfie vs foto oficial Renaper para un DNI.
 *
 * @return array{
 *   ok: bool,
 *   match: ?bool,
 *   score: ?float,
 *   externoId: ?string,
 *   estado: ?string,
 *   error: ?string,
 *   raw: ?array
 * }
 */
function rh_kyc_validar_facial(string $dniNumero, string $rutaSelfie, ?string $sexo = null): array
{
    $fallo = fn (string $msg): array => [
        'ok' => false,
        'match' => null,
        'score' => null,
        'externoId' => null,
        'estado' => 'error',
        'error' => $msg,
        'raw' => null,
    ];

    if (!rh_kyc_configurado()) {
        return $fallo('KYC / Renaper no configurado');
    }
    if (!preg_match('/^\d{7,8}$/', $dniNumero)) {
        return $fallo('Número de DNI inválido para Renaper');
    }
    if (!is_file($rutaSelfie) || !is_readable($rutaSelfie)) {
        return $fallo('No se encontró la selfie');
    }

    $bytes = @file_get_contents($rutaSelfie);
    if ($bytes === false || $bytes === '') {
        return $fallo('No se pudo leer la selfie');
    }

    $finfo = finfo_open(FILEINFO_MIME_TYPE);
    $mime = finfo_file($finfo, $rutaSelfie) ?: 'image/jpeg';
    finfo_close($finfo);

    $c = rh_kyc_config();
    $url = rtrim((string) $c['KYC_BASE_URL'], '/') . '/' . ltrim((string) ($c['KYC_ENDPOINT_FACIAL'] ?? '/api/v1/validacion/facial'), '/');
    $timeout = (int) ($c['KYC_TIMEOUT_SEGUNDOS'] ?? RH_KYC_TIMEOUT_DEFAULT);

    // Contrato genérico alineado a SID / intermediarios: DNI + foto base64.
    $payload = [
        'documento' => $dniNumero,
        'sexo' => $sexo,
        'foto' => base64_encode($bytes),
        'mime_type' => $mime,
    ];

    $headers = ['Content-Type: application/json', 'Accept: application/json'];
    if (!empty($c['KYC_API_KEY'])) {
        $headers[] = 'Authorization: Bearer ' . $c['KYC_API_KEY'];
        $headers[] = 'x-api-key: ' . $c['KYC_API_KEY'];
    }
    if (!empty($c['KYC_CLIENT_ID'])) {
        $headers[] = 'X-Client-Id: ' . $c['KYC_CLIENT_ID'];
    }
    if (!empty($c['KYC_CLIENT_SECRET'])) {
        $headers[] = 'X-Client-Secret: ' . $c['KYC_CLIENT_SECRET'];
    }

    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, $timeout);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);

    $raw = curl_exec($ch);
    $httpCode = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $errCurl = curl_error($ch);
    curl_close($ch);

    if ($raw === false) {
        error_log('rh_kyc: cURL — ' . $errCurl);
        return $fallo('No se pudo conectar con Renaper/SID');
    }

    $respuesta = json_decode($raw, true);
    if (!is_array($respuesta)) {
        error_log('rh_kyc: respuesta no-JSON (HTTP ' . $httpCode . ')');
        return $fallo('Respuesta inválida de Renaper/SID');
    }

    if ($httpCode >= 400) {
        $detalle = $respuesta['message'] ?? $respuesta['error'] ?? ('HTTP ' . $httpCode);
        error_log('rh_kyc: ' . $detalle);
        return $fallo('Renaper/SID rechazó el pedido');
    }

    // Normaliza scores: algunos APIs usan 0–1, otros 0–100.
    $scoreRaw = $respuesta['score']
        ?? $respuesta['confidence']
        ?? $respuesta['reconocimiento']['score']
        ?? $respuesta['recognitionConfidence']['value']
        ?? null;
    $score = null;
    if (is_numeric($scoreRaw)) {
        $score = (float) $scoreRaw;
        if ($score > 1.0) {
            $score = $score / 100.0;
        }
        $score = max(0.0, min(1.0, $score));
    }

    $match = $respuesta['match']
        ?? $respuesta['coincide']
        ?? $respuesta['valid']
        ?? null;
    if ($match === null && $score !== null) {
        $umbral = (float) ($c['KYC_UMBRAL_FACE'] ?? 0.85);
        $match = $score >= $umbral;
    }
    if (is_string($match)) {
        $match = in_array(strtolower($match), ['true', '1', 'ok', 'si', 'sí', 'match'], true);
    }

    $externoId = isset($respuesta['id']) ? (string) $respuesta['id']
        : (isset($respuesta['transaction_id']) ? (string) $respuesta['transaction_id'] : null);
    $estado = $match === true ? 'match' : ($match === false ? 'no_match' : 'desconocido');

    return [
        'ok' => true,
        'match' => is_bool($match) ? $match : null,
        'score' => $score,
        'externoId' => $externoId,
        'estado' => $estado,
        'error' => null,
        'raw' => $respuesta,
    ];
}
