<?php
/**
 * Pantalla intermedia para “Cambiar cuenta” de Mercado Pago.
 *
 * Mercado Pago no ofrece un logout OAuth confiable (y las URLs viejas de
 * Mercado Libre /jms/.../logout ya no existen). Por eso guiamos al usuario:
 * 1) cerrar sesión en mercadopago.com.ar
 * 2) continuar al authorize para entrar con otra cuenta.
 *
 * Público (lo abre el navegador desde la app). No es un fetch JSON.
 */
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/mercadopago.php';

$state = trim((string) ($_GET['state'] ?? ''));
$step = trim((string) ($_GET['step'] ?? 'start'));

if ($state === '') {
    http_response_code(400);
    header('Content-Type: text/html; charset=utf-8');
    echo '<!DOCTYPE html><html><body><p>Falta el estado de la autorización.</p></body></html>';
    exit;
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
    http_response_code(410);
    header('Content-Type: text/html; charset=utf-8');
    echo '<!DOCTYPE html><html><body><p>El enlace expiró. Volvé a Suscripciones y tocá Cambiar cuenta.</p></body></html>';
    exit;
}

$authorizeUrl = rh_mp_oauth_authorize_url_direct($state);

// Compat: si quedó un link viejo con logout1/logout2, ir directo al authorize.
if (in_array($step, ['logout1', 'logout2', 'auth'], true)) {
    header('Location: ' . $authorizeUrl, true, 302);
    exit;
}

$authorizeEsc = htmlspecialchars($authorizeUrl, ENT_QUOTES, 'UTF-8');
$mpHomeEsc = htmlspecialchars('https://www.mercadopago.com.ar/', ENT_QUOTES, 'UTF-8');
$returnUrl = htmlspecialchars(
    trim((string) (rh_mp_config()['MP_APP_RETURN_URL'] ?? 'http://localhost:8081/suscripcion')),
    ENT_QUOTES,
    'UTF-8'
);

echo <<<HTML
<!DOCTYPE html>
<html lang="es" data-theme="{$theme}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="{$theme}">
  <title>Red Huellitas · Cambiar cuenta</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@500;700;800&family=Outfit:wght@600;700&display=swap" rel="stylesheet">
  <style>
    html[data-theme="light"] {
      --bg: #F4F7F6; --surface: #FFFFFF; --text: #121816; --muted: #5F6F6A;
      --primary: #E23B4A; --primary-text: #FFFFFF; --border: #D7E2DE;
      --grad-top: #FFE4E8; --grad-bottom: #D9F0EC; --shadow: rgba(18, 24, 22, 0.08);
    }
    html[data-theme="dark"] {
      --bg: #0C1210; --surface: #17211E; --text: #F2F7F5; --muted: #9AADA6;
      --primary: #FF5C6A; --primary-text: #0C1210; --border: #2A3A35;
      --grad-top: #2A1218; --grad-bottom: #0F2421; --shadow: rgba(0, 0, 0, 0.35);
    }
    * { box-sizing: border-box; }
    body {
      margin: 0; min-height: 100vh; font-family: Nunito, system-ui, sans-serif; color: var(--text);
      background:
        radial-gradient(1200px 500px at 50% -10%, var(--grad-top) 0%, transparent 55%),
        radial-gradient(900px 420px at 100% 100%, var(--grad-bottom) 0%, transparent 50%),
        var(--bg);
      display: flex; align-items: center; justify-content: center; padding: 24px;
    }
    .card {
      width: 100%; max-width: 440px; background: var(--surface); border: 1px solid var(--border);
      border-radius: 20px; padding: 32px 28px 28px; text-align: center;
      box-shadow: 0 18px 40px var(--shadow);
    }
    .brand { font-family: Outfit, Nunito, sans-serif; font-weight: 700; font-size: 22px; margin: 0 0 18px; color: var(--primary); }
    h1 { font-family: Outfit, Nunito, sans-serif; font-size: 22px; margin: 0 0 12px; }
    p { color: var(--muted); font-size: 15px; line-height: 1.45; margin: 0 0 12px; }
    ol { text-align: left; color: var(--muted); font-size: 14px; line-height: 1.55; margin: 0 0 22px; padding-left: 1.2rem; }
    .btn {
      display: inline-flex; align-items: center; justify-content: center; width: 100%; min-height: 48px;
      border: none; border-radius: 12px; background: var(--primary); color: var(--primary-text);
      font-family: Nunito, system-ui, sans-serif; font-size: 16px; font-weight: 800; text-decoration: none;
      margin-bottom: 10px; cursor: pointer;
    }
    .btn-secondary {
      background: transparent; color: var(--text); border: 1px solid var(--border);
    }
    .hint { font-size: 12px; margin-top: 8px; }
  </style>
</head>
<body>
  <main class="card">
    <p class="brand">Red Huellitas</p>
    <h1>Elegí otra cuenta de Mercado Pago</h1>
    <p>Mercado Pago reusa la sesión que ya tenés abierta. Para cambiar de cuenta tenés que cerrar esa sesión y entrar con la otra.</p>
    <ol>
      <li>Tocá <strong>Abrir Mercado Pago</strong> y cerrá sesión (menú de tu perfil → Cerrar sesión).</li>
      <li>Volvé a esta ventana y tocá <strong>Ya cerré sesión — continuar</strong>.</li>
      <li>Iniciá sesión con la cuenta que quieras vincular y autorizá Red Huellitas.</li>
    </ol>
    <a class="btn btn-secondary" href="{$mpHomeEsc}" target="_blank" rel="noopener">1. Abrir Mercado Pago</a>
    <a class="btn" href="{$authorizeEsc}">2. Ya cerré sesión — continuar</a>
    <a class="btn btn-secondary" href="{$returnUrl}">Cancelar y volver</a>
    <p class="hint">Si no cerrás sesión antes, te va a volver a conectar la misma cuenta.</p>
  </main>
</body>
</html>
HTML;
