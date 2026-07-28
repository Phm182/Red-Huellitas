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
 * true si además del Access Token también hay Client ID + Secret + redirect
 * para OAuth de vendedores (“Conectar cuenta”).
 *
 * Si MP_CLIENT_ID viene vacío, se intenta sacar del Access Token
 * (APP_USR-{clientId}-… / TEST-{clientId}-…), que es el ID de la misma app
 * que ya configuraste — sirve igual en prueba o producción.
 */
function rh_mp_client_id(): string
{
    $config = rh_mp_config();
    $id = trim((string) ($config['MP_CLIENT_ID'] ?? ''));
    if ($id !== '') {
        return $id;
    }

    $token = (string) ($config['MP_ACCESS_TOKEN'] ?? '');
    // APP_USR-5120…-072714-…-user  ó  TEST-5120…-…
    if (preg_match('/^(?:APP_USR|TEST)-(\d+)-/', $token, $m)) {
        return $m[1];
    }

    return '';
}

/**
 * Redirect URI de Marketplace sin doble-encode.
 * Si en el .local.php quedó con %20, http_build_query lo convertiría en %2520
 * y Mercado Pago rechaza la vinculación.
 */
function rh_mp_marketplace_redirect_uri(): string
{
    $config = rh_mp_config();
    $uri = trim((string) ($config['MP_MARKETPLACE_REDIRECT_URI'] ?? ''));
    if ($uri === '') {
        return '';
    }
    return str_replace('%20', ' ', $uri);
}

function rh_mp_marketplace_configurado(): bool
{
    $config = rh_mp_config();
    $clientId = rh_mp_client_id();
    return $clientId !== ''
        && !empty($config['MP_CLIENT_SECRET'])
        && rh_mp_marketplace_redirect_uri() !== '';
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
 * Extrae nombre, email y teléfono del /users/me de Mercado Pago.
 *
 * @return array{nombre: ?string, email: ?string, telefono: ?string}
 */
function rh_mp_perfil_desde_api(array $data): array
{
    $first = trim((string) ($data['first_name'] ?? $data['firstName'] ?? ''));
    $last = trim((string) ($data['last_name'] ?? $data['lastName'] ?? ''));
    $nombre = trim($first . ' ' . $last);

    if ($nombre === '' && !empty($data['company']) && is_array($data['company'])) {
        $nombre = trim((string) (
            $data['company']['corporate_name']
            ?? $data['company']['brand_name']
            ?? $data['company']['business_name']
            ?? ''
        ));
    }

    if ($nombre === '') {
        $nick = trim((string) ($data['nickname'] ?? ''));
        // Evitar usar el email como “nombre”.
        if ($nick !== '' && strpos($nick, '@') === false) {
            $nombre = $nick;
        }
    }

    $email = trim((string) ($data['email'] ?? ''));
    $email = $email !== '' ? $email : null;

    $telefono = rh_mp_formatear_telefono($data['phone'] ?? null);
    if ($telefono === null) {
        $telefono = rh_mp_formatear_telefono($data['alternative_phone'] ?? null);
    }

    return [
        'nombre' => $nombre !== '' ? $nombre : null,
        'email' => $email,
        'telefono' => $telefono,
    ];
}

/**
 * @param mixed $phone
 */
function rh_mp_formatear_telefono($phone): ?string
{
    if (!is_array($phone)) {
        return null;
    }
    $area = trim((string) ($phone['area_code'] ?? ''));
    $number = trim((string) ($phone['number'] ?? ''));
    if ($number === '') {
        return null;
    }
    return trim($area . ' ' . $number);
}

/**
 * URL de la pantalla intermedia “cambiar cuenta” (mismo host que el redirect OAuth).
 */
function rh_mp_oauth_switch_base_url(): string
{
    $redirect = rh_mp_marketplace_redirect_uri();
    if ($redirect === '') {
        return '';
    }
    $switched = preg_replace('#/[^/]*$#', '/mp-rh-oauth-switch.php', $redirect);
    return is_string($switched) ? $switched : '';
}

/**
 * Solo la URL de autorización OAuth (sin logout).
 */
function rh_mp_oauth_authorize_url_direct(string $state): string
{
    $params = http_build_query(
        [
            'client_id' => rh_mp_client_id(),
            'response_type' => 'code',
            'platform_id' => 'mp',
            'state' => $state,
            'redirect_uri' => rh_mp_marketplace_redirect_uri(),
        ],
        '',
        '&',
        PHP_QUERY_RFC3986
    );
    return 'https://auth.mercadopago.com.ar/authorization?' . $params;
}

/**
 * URL de autorización OAuth para que un vendedor vincule su propia cuenta.
 * .com.ar para cuentas de Argentina (el .com genérico a veces rechaza la app).
 *
 * Si $forzarSelectorCuenta es true, abre una pantalla intermedia que cierra la
 * sesión de Mercado Libre/Pago y recién después pide login (para poder elegir
 * otra cuenta). Sin eso, MP reusa la sesión abierta y salta al callback.
 */
function rh_mp_oauth_authorize_url(string $state, bool $forzarSelectorCuenta = false): string
{
    $authorizeUrl = rh_mp_oauth_authorize_url_direct($state);

    if (!$forzarSelectorCuenta) {
        return $authorizeUrl;
    }

    $switchBase = rh_mp_oauth_switch_base_url();
    if ($switchBase !== '') {
        return $switchBase . '?' . http_build_query(
            ['state' => $state],
            '',
            '&',
            PHP_QUERY_RFC3986
        );
    }

    // Sin URL pública de switch: al menos ir al authorize de Mercado Pago.
    return $authorizeUrl;
}

function rh_mp_oauth_exchange_code(string $code): array
{
    $config = rh_mp_config();
    return rh_mp_oauth_token_request([
        'client_id' => rh_mp_client_id(),
        'client_secret' => $config['MP_CLIENT_SECRET'] ?? '',
        'grant_type' => 'authorization_code',
        'code' => $code,
        'redirect_uri' => rh_mp_marketplace_redirect_uri(),
    ]);
}

function rh_mp_oauth_refresh(string $refreshToken): array
{
    $config = rh_mp_config();
    return rh_mp_oauth_token_request([
        'client_id' => rh_mp_client_id(),
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
