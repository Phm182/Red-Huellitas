<?php
/**
 * Integración con Mercado Pago vía cURL crudo contra la API REST (Preapproval
 * API para suscripciones recurrentes) — sin SDK, mismo patrón que usa el
 * proyecto hermano Contapp. Requiere inc/config/mercadopago.local.php (ver
 * mercadopago.local.php.example) con credenciales reales; sin ese archivo
 * rh_mp_configurado() devuelve false y los endpoints que dependen de MP
 * responden 503 en vez de intentar la llamada.
 */

const RH_MP_API_BASE = 'https://api.mercadopago.com';
const RH_MP_TIMEOUT_SEGUNDOS = 10;

function rh_mp_config(): array
{
    $configFile = __DIR__ . '/../config/mercadopago.local.php';
    if (!is_file($configFile)) {
        return [];
    }
    return require $configFile;
}

function rh_mp_configurado(): bool
{
    $config = rh_mp_config();
    return !empty($config['MP_ACCESS_TOKEN']);
}

/**
 * true si además de las credenciales simples (suscripción, Fase 6a) también
 * está registrada la app "Marketplace" (Client ID/Secret) necesaria para que
 * un vendedor vincule su propia cuenta vía OAuth (Fase 6c).
 */
function rh_mp_marketplace_configurado(): bool
{
    $config = rh_mp_config();
    return !empty($config['MP_CLIENT_ID']) && !empty($config['MP_CLIENT_SECRET']) && !empty($config['MP_MARKETPLACE_REDIRECT_URI']);
}

/**
 * Llama a la API de Mercado Pago. Lanza RuntimeException si no hay
 * credenciales configuradas o si la llamada falla a nivel transporte —
 * el llamador decide cómo traducir eso a una respuesta JSON. $tokenOverride
 * permite operar en nombre de un vendedor conectado (Fase 6c) en vez de la
 * cuenta propia de la plataforma.
 */
function rh_mp_api_request(string $method, string $path, ?array $body = null, ?string $tokenOverride = null): array
{
    $token = $tokenOverride;
    if ($token === null) {
        $config = rh_mp_config();
        $token = $config['MP_ACCESS_TOKEN'] ?? '';
    }
    if ($token === '') {
        throw new RuntimeException('Mercado Pago no está configurado');
    }

    $ch = curl_init(RH_MP_API_BASE . $path);
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Authorization: Bearer ' . $token,
        'Content-Type: application/json',
    ]);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, RH_MP_TIMEOUT_SEGUNDOS);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
    if ($body !== null) {
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($body));
    }

    $response = curl_exec($ch);
    if ($response === false) {
        $error = curl_error($ch);
        curl_close($ch);
        throw new RuntimeException('Error de conexión con Mercado Pago: ' . $error);
    }
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    $data = json_decode($response, true) ?? [];
    return ['httpCode' => $httpCode, 'data' => $data];
}

/**
 * Llama al endpoint /oauth/token (canje de code / refresh) — no requiere
 * Authorization: Bearer, client_id/client_secret van en el body.
 */
function rh_mp_oauth_token_request(array $body): array
{
    $ch = curl_init(RH_MP_API_BASE . '/oauth/token');
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($body));
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, RH_MP_TIMEOUT_SEGUNDOS);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);

    $response = curl_exec($ch);
    if ($response === false) {
        $error = curl_error($ch);
        curl_close($ch);
        throw new RuntimeException('Error de conexión con Mercado Pago: ' . $error);
    }
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    $data = json_decode($response, true) ?? [];
    return ['httpCode' => $httpCode, 'data' => $data];
}

function rh_mp_parse_external_reference(?string $ref): ?array
{
    if ($ref === null) {
        return null;
    }
    $partes = explode(':', $ref);
    if (count($partes) !== 4 || $partes[0] !== 'rh' || $partes[1] !== 'suscripcion') {
        return null;
    }
    return ['userId' => (int) $partes[2], 'planId' => (int) $partes[3]];
}

/** Devuelve el PedidoId si $ref tiene la forma "rh:pedido:{id}", o null. */
function rh_mp_parse_pedido_reference(?string $ref): ?int
{
    if ($ref === null) {
        return null;
    }
    $partes = explode(':', $ref);
    if (count($partes) !== 3 || $partes[0] !== 'rh' || $partes[1] !== 'pedido') {
        return null;
    }
    return (int) $partes[2];
}

/**
 * URL de autorización OAuth para que un vendedor vincule su propia cuenta de
 * Mercado Pago (app "Marketplace" — MP_CLIENT_ID, distinto del access token
 * simple usado para la suscripción de la plataforma).
 */
function rh_mp_oauth_authorize_url(string $state): string
{
    $config = rh_mp_config();
    $params = http_build_query([
        'client_id' => $config['MP_CLIENT_ID'] ?? '',
        'response_type' => 'code',
        'platform_id' => 'mp',
        'redirect_uri' => $config['MP_MARKETPLACE_REDIRECT_URI'] ?? '',
        'state' => $state,
    ]);
    return 'https://auth.mercadopago.com/authorization?' . $params;
}

function rh_mp_oauth_exchange_code(string $code): array
{
    $config = rh_mp_config();
    return rh_mp_oauth_token_request([
        'client_id' => $config['MP_CLIENT_ID'] ?? '',
        'client_secret' => $config['MP_CLIENT_SECRET'] ?? '',
        'grant_type' => 'authorization_code',
        'code' => $code,
        'redirect_uri' => $config['MP_MARKETPLACE_REDIRECT_URI'] ?? '',
    ]);
}

function rh_mp_oauth_refresh(string $refreshToken): array
{
    $config = rh_mp_config();
    return rh_mp_oauth_token_request([
        'client_id' => $config['MP_CLIENT_ID'] ?? '',
        'client_secret' => $config['MP_CLIENT_SECRET'] ?? '',
        'grant_type' => 'refresh_token',
        'refresh_token' => $refreshToken,
    ]);
}

/**
 * Re-consulta un preapproval contra la API de Mercado Pago y aplica su
 * estado actual: actualiza SuscripcionMpEstado siempre, y si está
 * 'authorized' aplica el pago (idempotente vía el dedup de MpPaymentId).
 * Requiere que quien llame también haya hecho require_once de
 * funciones/suscripcion.php.
 */
function rh_mp_procesar_preapproval(mysqli $conn, string $preapprovalId): void
{
    $resultado = rh_mp_api_request('GET', "/preapproval/$preapprovalId");
    $preapproval = $resultado['data'];
    $ref = rh_mp_parse_external_reference($preapproval['external_reference'] ?? null);
    if ($ref === null) {
        return;
    }

    $estado = $preapproval['status'] ?? null;
    $stmt = $conn->prepare('UPDATE Usuario SET SuscripcionMpEstado = ? WHERE UserId = ?');
    $stmt->bind_param('si', $estado, $ref['userId']);
    $stmt->execute();
    $stmt->close();

    if ($estado === 'authorized') {
        $monto = (float) ($preapproval['auto_recurring']['transaction_amount'] ?? 0);
        rh_suscripcion_aplicar_pago($conn, $ref['userId'], $ref['planId'], 'mercadopago', $monto, "preapproval:$preapprovalId", 1);
    }
}
