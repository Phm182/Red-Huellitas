<?php
/**
 * Callback del flujo OAuth de vinculación de cuenta de Mercado Pago del
 * vendedor. Endpoint público (lo redirige el navegador desde Mercado Pago,
 * no es un fetch de la app) — responde HTML con el look de Red Huellitas.
 */
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/mercadopago.php';

/**
 * URL de vuelta a la app (pantalla Suscripciones).
 * Configurable con MP_APP_RETURN_URL en mercadopago.local.php.
 */
function rh_mp_app_return_url(): string
{
    $config = rh_mp_config();
    $url = trim((string) ($config['MP_APP_RETURN_URL'] ?? ''));
    if ($url !== '') {
        return $url;
    }
    return 'http://localhost:8081/suscripcion';
}

/**
 * @param 'light'|'dark' $theme
 * @param array{nombre?: ?string, email?: ?string, telefono?: ?string}|null $perfil
 * @param string|null $retryUrl Si es la misma cuenta, link para reintentar el cambio.
 */
function rh_mp_callback_page(
    string $titulo,
    bool $ok,
    string $theme = 'light',
    ?array $perfil = null,
    ?string $retryUrl = null
): void {
    header('Content-Type: text/html; charset=utf-8');

    $theme = $theme === 'dark' ? 'dark' : 'light';
    $tituloEsc = htmlspecialchars($titulo, ENT_QUOTES, 'UTF-8');
    $returnUrl = htmlspecialchars(rh_mp_app_return_url(), ENT_QUOTES, 'UTF-8');
    $icono = $ok ? '✓' : '!';
    $btnLabel = $ok ? 'Volver a Suscripciones' : 'Volver a Suscripciones';
    $iconBg = $ok ? 'var(--icon-ok-bg)' : 'var(--icon-err-bg)';
    $iconColor = $ok ? 'var(--icon-ok)' : 'var(--icon-err)';

    $nombre = trim((string) (($perfil ?? [])['nombre'] ?? ''));
    $email = trim((string) (($perfil ?? [])['email'] ?? ''));
    $telefono = trim((string) (($perfil ?? [])['telefono'] ?? ''));

    $perfilHtml = '';
    if ($perfil !== null && ($nombre !== '' || $email !== '' || $telefono !== '')) {
        $perfilHtml .= '<div class="perfil">';
        $perfilHtml .= '<p class="como">Cuenta activa en Mercado Pago</p>';
        if ($nombre !== '') {
            $perfilHtml .= '<p class="nombre">' . htmlspecialchars($nombre, ENT_QUOTES, 'UTF-8') . '</p>';
        }
        if ($email !== '') {
            $perfilHtml .= '<p class="dato">' . htmlspecialchars($email, ENT_QUOTES, 'UTF-8') . '</p>';
        }
        if ($telefono !== '') {
            $perfilHtml .= '<p class="dato">' . htmlspecialchars($telefono, ENT_QUOTES, 'UTF-8') . '</p>';
        }
        $perfilHtml .= '</div>';
    } elseif (!$ok && $retryUrl === null) {
        $perfilHtml = '<p class="msg">Podés volver a intentar desde Suscripciones en la app.</p>';
    } elseif ($ok) {
        $perfilHtml = '<p class="msg">Tu cuenta quedó vinculada. Ya podés volver a Suscripciones.</p>';
    }

    $retryHtml = '';
    if ($retryUrl !== null && $retryUrl !== '') {
        $retryEsc = htmlspecialchars($retryUrl, ENT_QUOTES, 'UTF-8');
        $perfilHtml .= '<p class="msg">Para vincular otra, tenés que iniciar sesión con esa otra cuenta en Mercado Pago.</p>';
        $retryHtml = '<a class="btn" href="' . $retryEsc . '" style="margin-bottom:10px;">Elegir otra cuenta</a>';
    }

    echo <<<HTML
<!DOCTYPE html>
<html lang="es" data-theme="{$theme}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="{$theme}">
  <title>Red Huellitas · Mercado Pago</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@500;700;800&family=Outfit:wght@600;700&display=swap" rel="stylesheet">
  <style>
    html[data-theme="light"] {
      --bg: #F4F7F6;
      --surface: #FFFFFF;
      --text: #121816;
      --muted: #5F6F6A;
      --primary: #E23B4A;
      --primary-text: #FFFFFF;
      --border: #D7E2DE;
      --grad-top: #FFE4E8;
      --grad-bottom: #D9F0EC;
      --icon-ok-bg: #D8F3EF;
      --icon-ok: #128A5E;
      --icon-err-bg: #FFE8EA;
      --icon-err: #E23B4A;
      --shadow: rgba(18, 24, 22, 0.08);
    }
    html[data-theme="dark"] {
      --bg: #0C1210;
      --surface: #17211E;
      --text: #F2F7F5;
      --muted: #9AADA6;
      --primary: #FF5C6A;
      --primary-text: #0C1210;
      --border: #2A3A35;
      --grad-top: #2A1218;
      --grad-bottom: #0F2421;
      --icon-ok-bg: #14332F;
      --icon-ok: #3DDC97;
      --icon-err-bg: #3A1C22;
      --icon-err: #FF5C6A;
      --shadow: rgba(0, 0, 0, 0.35);
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      font-family: Nunito, system-ui, sans-serif;
      color: var(--text);
      background:
        radial-gradient(1200px 500px at 50% -10%, var(--grad-top) 0%, transparent 55%),
        radial-gradient(900px 420px at 100% 100%, var(--grad-bottom) 0%, transparent 50%),
        var(--bg);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }
    .card {
      width: 100%;
      max-width: 420px;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 20px;
      padding: 32px 28px 28px;
      text-align: center;
      box-shadow: 0 18px 40px var(--shadow);
    }
    .brand {
      font-family: Outfit, Nunito, sans-serif;
      font-weight: 700;
      font-size: 22px;
      letter-spacing: -0.02em;
      margin: 0 0 22px;
      color: var(--primary);
    }
    .icon {
      width: 72px;
      height: 72px;
      margin: 0 auto 18px;
      border-radius: 999px;
      background: {$iconBg};
      color: {$iconColor};
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 34px;
      font-weight: 800;
      line-height: 1;
    }
    h1 {
      font-family: Outfit, Nunito, sans-serif;
      font-size: 22px;
      font-weight: 700;
      margin: 0 0 16px;
      line-height: 1.25;
    }
    .perfil { margin: 0 0 24px; }
    .como {
      margin: 0 0 4px;
      color: var(--muted);
      font-size: 13px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .nombre {
      margin: 0 0 10px;
      color: var(--text);
      font-family: Outfit, Nunito, sans-serif;
      font-size: 20px;
      font-weight: 700;
      line-height: 1.3;
    }
    .dato {
      margin: 0 0 4px;
      color: var(--muted);
      font-size: 15px;
      line-height: 1.4;
    }
    .msg {
      margin: 0 0 24px;
      color: var(--muted);
      font-size: 15px;
      line-height: 1.45;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      min-height: 48px;
      padding: 12px 18px;
      border: none;
      border-radius: 12px;
      background: var(--primary);
      color: var(--primary-text);
      font-family: Nunito, system-ui, sans-serif;
      font-size: 16px;
      font-weight: 800;
      text-decoration: none;
      cursor: pointer;
    }
    .btn:hover { filter: brightness(0.96); }
    .hint {
      margin-top: 14px;
      font-size: 12px;
      color: var(--muted);
    }
  </style>
</head>
<body>
  <main class="card">
    <p class="brand">Red Huellitas</p>
    <div class="icon" aria-hidden="true">{$icono}</div>
    <h1>{$tituloEsc}</h1>
    {$perfilHtml}
    {$retryHtml}
    <a class="btn" href="{$returnUrl}">{$btnLabel}</a>
    <p class="hint">Si el botón no abre la app, volvé a la pestaña de Red Huellitas y entrá a Suscripciones.</p>
  </main>
  <script>
    (function () {
      var btn = document.querySelector('.btn');
      if (!btn) return;
      btn.addEventListener('click', function () {
        setTimeout(function () {
          try { window.close(); } catch (e) {}
        }, 400);
      });
    })();
  </script>
</body>
</html>
HTML;
    exit;
}

$code = $_GET['code'] ?? null;
$state = $_GET['state'] ?? null;

if (!$code || !$state) {
    rh_mp_callback_page('Faltan datos de la autorización', false);
}

$stmt = $conn->prepare('SELECT UserId, Theme FROM UsuarioMpOauthPendiente WHERE State = ?');
if ($stmt === false) {
    $stmt = $conn->prepare('SELECT UserId FROM UsuarioMpOauthPendiente WHERE State = ?');
    $stmt->bind_param('s', $state);
    $stmt->execute();
    $pendiente = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    $theme = 'light';
} else {
    $stmt->bind_param('s', $state);
    $stmt->execute();
    $pendiente = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    $theme = (($pendiente['Theme'] ?? '') === 'dark') ? 'dark' : 'light';
}

if (!$pendiente) {
    rh_mp_callback_page('El enlace de conexión expiró o ya se usó', false, $theme);
}

$userId = (int) $pendiente['UserId'];

$stmt = $conn->prepare('DELETE FROM UsuarioMpOauthPendiente WHERE State = ?');
$stmt->bind_param('s', $state);
$stmt->execute();
$stmt->close();

try {
    $resultado = rh_mp_oauth_exchange_code($code);
} catch (RuntimeException $e) {
    rh_mp_callback_page('No pudimos conectar con Mercado Pago', false, $theme);
}

if ($resultado['httpCode'] >= 400 || empty($resultado['data']['access_token'])) {
    rh_mp_callback_page('Mercado Pago rechazó la autorización', false, $theme);
}

$accessToken = $resultado['data']['access_token'];
$refreshToken = $resultado['data']['refresh_token'] ?? null;
$mpUserId = (string) ($resultado['data']['user_id'] ?? '');
$expiresIn = (int) ($resultado['data']['expires_in'] ?? 0);
$expiresAt = $expiresIn > 0 ? date('Y-m-d H:i:s', time() + $expiresIn) : null;

$perfil = ['nombre' => null, 'email' => null, 'telefono' => null];
try {
    $me = rh_mp_api_request('GET', '/users/me', null, $accessToken);
    if (!empty($me['data']) && is_array($me['data'])) {
        $perfil = rh_mp_perfil_desde_api($me['data']);
        if ($mpUserId === '' && !empty($me['data']['id'])) {
            $mpUserId = (string) $me['data']['id'];
        }
    }
} catch (RuntimeException $e) {
    // best-effort
}

$mpEmail = $perfil['email'];
$mpNombre = $perfil['nombre'];
$mpTelefono = $perfil['telefono'];

$prevMpUserId = '';
$prevStmt = $conn->prepare('SELECT MpUserId FROM UsuarioMpCuenta WHERE UserId = ?');
if ($prevStmt !== false) {
    $prevStmt->bind_param('i', $userId);
    $prevStmt->execute();
    $prevRow = $prevStmt->get_result()->fetch_assoc();
    $prevStmt->close();
    $prevMpUserId = (string) ($prevRow['MpUserId'] ?? '');
}
$mismaCuenta = $prevMpUserId !== '' && $mpUserId !== '' && $prevMpUserId === $mpUserId;

$stmt = $conn->prepare(
    'INSERT INTO UsuarioMpCuenta (UserId, MpUserId, MpEmail, MpNombre, MpTelefono, AccessToken, RefreshToken, ExpiresAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE MpUserId = VALUES(MpUserId), MpEmail = VALUES(MpEmail),
        MpNombre = VALUES(MpNombre), MpTelefono = VALUES(MpTelefono),
        AccessToken = VALUES(AccessToken), RefreshToken = VALUES(RefreshToken), ExpiresAt = VALUES(ExpiresAt)'
);
if ($stmt === false) {
    $stmt = $conn->prepare(
        'INSERT INTO UsuarioMpCuenta (UserId, MpUserId, MpEmail, AccessToken, RefreshToken, ExpiresAt)
         VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE MpUserId = VALUES(MpUserId), MpEmail = VALUES(MpEmail),
            AccessToken = VALUES(AccessToken), RefreshToken = VALUES(RefreshToken), ExpiresAt = VALUES(ExpiresAt)'
    );
    $stmt->bind_param('isssss', $userId, $mpUserId, $mpEmail, $accessToken, $refreshToken, $expiresAt);
} else {
    $stmt->bind_param(
        'isssssss',
        $userId,
        $mpUserId,
        $mpEmail,
        $mpNombre,
        $mpTelefono,
        $accessToken,
        $refreshToken,
        $expiresAt
    );
}
$stmt->execute();
$stmt->close();

if ($mismaCuenta) {
    $retryState = bin2hex(random_bytes(16));
    $ins = $conn->prepare('INSERT INTO UsuarioMpOauthPendiente (State, UserId, Theme) VALUES (?, ?, ?)');
    if ($ins === false) {
        $ins = $conn->prepare('INSERT INTO UsuarioMpOauthPendiente (State, UserId) VALUES (?, ?)');
        $ins->bind_param('si', $retryState, $userId);
    } else {
        $ins->bind_param('sis', $retryState, $userId, $theme);
    }
    $ins->execute();
    $ins->close();
    $retryUrl = rh_mp_oauth_authorize_url($retryState, true);
    rh_mp_callback_page(
        'Seguís con la misma cuenta',
        false,
        $theme,
        $perfil,
        $retryUrl
    );
}

rh_mp_callback_page('Cuenta de Mercado Pago conectada', true, $theme, $perfil);
