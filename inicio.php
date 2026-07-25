<?php
/**
 * Destino post-login web (placeholder hasta haber panel web).
 */
?><!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Inicio — Red Huellitas</title>
  <link rel="icon" href="imgLogo/Icono.png" type="image/png">
  <style>
    :root {
      --bg: #FAF7F2;
      --surface: #FFFFFF;
      --text: #2A2420;
      --muted: #7A7168;
      --primary: #E8873A;
      --border: #E5DFD6;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      font-family: "Segoe UI", system-ui, sans-serif;
      color: var(--text);
      background: var(--bg);
    }
    header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      padding: 1rem 1.25rem;
      background: var(--surface);
      border-bottom: 1px solid var(--border);
    }
    header img { height: 2.25rem; width: auto; }
    button {
      border: 1px solid var(--border);
      background: #fff;
      color: var(--text);
      border-radius: .55rem;
      padding: .5rem .85rem;
      font: inherit;
      cursor: pointer;
    }
    main {
      width: min(36rem, 92vw);
      margin: 2.5rem auto;
      padding: 1.75rem;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 1rem;
    }
    h1 { margin: 0 0 .5rem; font-size: 1.45rem; }
    p { margin: 0; color: var(--muted); line-height: 1.45; }
  </style>
</head>
<body>
  <header>
    <img src="imgLogo/Logo.png" alt="Red Huellitas">
    <button type="button" id="logoutBtn">Cerrar sesión</button>
  </header>
  <main>
    <h1 id="greeting">Hola</h1>
    <p>Sesión iniciada. La experiencia completa está en la app móvil; este panel web es temporal en el subdominio.</p>
  </main>
  <script>
    (function () {
      var TOKEN_KEY = 'rh_token';
      var USER_KEY = 'rh_user';
      if (!localStorage.getItem(TOKEN_KEY)) {
        window.location.replace('index.php');
        return;
      }
      try {
        var user = JSON.parse(localStorage.getItem(USER_KEY) || '{}');
        var name = user.nombreCompleto || user.username || user.email || '';
        if (name) {
          document.getElementById('greeting').textContent = 'Hola, ' + name;
        }
      } catch (e) {}

      document.getElementById('logoutBtn').addEventListener('click', function () {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        window.location.href = 'index.php';
      });
    })();
  </script>
</body>
</html>
