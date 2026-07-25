<?php
/**
 * Entrada web del subdominio. Sin este archivo el hosting responde 403
 * (Options -Indexes y no hay DirectoryIndex).
 */
header('Content-Type: text/html; charset=utf-8');

$apiOk = false;
$dbOk = false;
$dbMsg = '';

$bd = __DIR__ . '/inc/funciones/bd.php';
if (is_readable($bd)) {
    require_once $bd;
    if (isset($conn) && $conn instanceof mysqli && !$conn->connect_error) {
        $dbOk = true;
        $apiOk = is_dir(__DIR__ . '/inc/ajax');
    } else {
        $dbMsg = isset($conn) ? $conn->connect_error : 'Sin conexión';
    }
} else {
    $dbMsg = 'Falta inc/funciones/bd.php en el server (copiá desde bd.php.example y configurá credenciales)';
}
?>
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Red Huellitas</title>
  <style>
    :root { color-scheme: light; }
    body {
      margin: 0; min-height: 100vh; display: grid; place-items: center;
      font-family: "Segoe UI", system-ui, sans-serif;
      background: linear-gradient(160deg, #e8f5e9 0%, #fff8e7 55%, #f3e5f5 100%);
      color: #1b2e1f;
    }
    main {
      width: min(28rem, 92vw); padding: 2rem 1.75rem;
      background: rgba(255,255,255,.82); border-radius: 1rem;
      box-shadow: 0 12px 40px rgba(27,46,31,.08);
    }
    h1 { margin: 0 0 .35rem; font-size: 1.65rem; letter-spacing: -.02em; }
    p { margin: 0 0 1.25rem; color: #4a5c4e; line-height: 1.45; }
    ul { list-style: none; margin: 0; padding: 0; display: grid; gap: .55rem; }
    li {
      display: flex; justify-content: space-between; gap: 1rem;
      padding: .65rem .8rem; border-radius: .55rem; background: #f4f7f4;
      font-size: .95rem;
    }
    .ok { color: #1b7a3a; font-weight: 600; }
    .bad { color: #b42318; font-weight: 600; }
    code { font-size: .85em; background: #eef2ee; padding: .1em .35em; border-radius: .3em; }
    footer { margin-top: 1.25rem; font-size: .8rem; color: #6b7a6d; }
  </style>
</head>
<body>
  <main>
    <h1>Red Huellitas</h1>
    <p>API del backend. La app móvil apunta a <code>/inc</code>.</p>
    <ul>
      <li>
        <span>Base de datos</span>
        <span class="<?= $dbOk ? 'ok' : 'bad' ?>"><?= $dbOk ? 'OK' : 'Error' ?></span>
      </li>
      <li>
        <span>Endpoints <code>/inc/ajax</code></span>
        <span class="<?= $apiOk ? 'ok' : 'bad' ?>"><?= $apiOk ? 'OK' : 'Faltan' ?></span>
      </li>
    </ul>
    <?php if ($dbMsg !== ''): ?>
      <footer><?= htmlspecialchars($dbMsg, ENT_QUOTES, 'UTF-8') ?></footer>
    <?php else: ?>
      <footer>Ejemplo: <code>/inc/ajax/auth/me.php</code></footer>
    <?php endif; ?>
  </main>
</body>
</html>
