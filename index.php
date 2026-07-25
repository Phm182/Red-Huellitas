<?php
/**
 * Login web (entrada del subdominio).
 * Autentica contra inc/ajax/auth/login.php y guarda el token en localStorage.
 */
?><!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Iniciar sesión — Red Huellitas</title>
  <link rel="icon" href="imgLogo/Icono.png" type="image/png">
  <style>
    :root {
      --bg: #FAF7F2;
      --surface: #FFFFFF;
      --text: #2A2420;
      --muted: #7A7168;
      --primary: #E8873A;
      --primary-text: #FFFFFF;
      --border: #E5DFD6;
      --danger: #D64545;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      display: grid;
      place-items: center;
      padding: 1.5rem;
      font-family: "Segoe UI", system-ui, sans-serif;
      color: var(--text);
      background:
        radial-gradient(ellipse 80% 50% at 10% 0%, rgba(232,135,58,.18), transparent 55%),
        radial-gradient(ellipse 70% 45% at 90% 100%, rgba(60,154,95,.12), transparent 50%),
        var(--bg);
    }
    main {
      width: min(24rem, 100%);
      padding: 2rem 1.6rem 1.75rem;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 1.1rem;
      box-shadow: 0 18px 50px rgba(42, 36, 32, .08);
    }
    .brand {
      display: grid;
      justify-items: center;
      gap: .65rem;
      margin-bottom: 1.5rem;
      text-align: center;
    }
    .brand img {
      width: min(11rem, 70%);
      height: auto;
      display: block;
    }
    .brand h1 {
      margin: 0;
      font-size: 1.35rem;
      letter-spacing: -.02em;
    }
    .brand p {
      margin: 0;
      color: var(--muted);
      font-size: .92rem;
      line-height: 1.4;
    }
    label {
      display: block;
      margin: 0 0 .35rem;
      font-size: .85rem;
      font-weight: 600;
      color: var(--muted);
    }
    input {
      width: 100%;
      margin-bottom: .95rem;
      padding: .75rem .85rem;
      border: 1px solid var(--border);
      border-radius: .65rem;
      font: inherit;
      color: var(--text);
      background: #fff;
    }
    input:focus {
      outline: 2px solid rgba(232,135,58,.35);
      border-color: var(--primary);
    }
    button {
      width: 100%;
      margin-top: .35rem;
      padding: .85rem 1rem;
      border: 0;
      border-radius: .7rem;
      font: inherit;
      font-weight: 650;
      cursor: pointer;
      color: var(--primary-text);
      background: var(--primary);
    }
    button:hover { filter: brightness(1.03); }
    button:disabled { opacity: .65; cursor: wait; }
    .error {
      display: none;
      margin: 0 0 .9rem;
      padding: .7rem .8rem;
      border-radius: .55rem;
      background: #fdecec;
      color: var(--danger);
      font-size: .9rem;
    }
    .error.show { display: block; }
    .hint {
      margin: 1.1rem 0 0;
      text-align: center;
      color: var(--muted);
      font-size: .82rem;
    }
  </style>
</head>
<body>
  <main>
    <div class="brand">
      <img src="imgLogo/Logo.png" alt="Red Huellitas">
      <h1>Iniciar sesión</h1>
      <p>Entrá con tu email y contraseña</p>
    </div>

    <div id="error" class="error" role="alert"></div>

    <form id="loginForm" autocomplete="on">
      <label for="email">Email</label>
      <input id="email" name="email" type="email" required autocomplete="username" placeholder="tu@email.com">

      <label for="password">Contraseña</label>
      <input id="password" name="password" type="password" required autocomplete="current-password" placeholder="••••••••">

      <button id="submitBtn" type="submit">Entrar</button>
    </form>

    <p class="hint">¿No tenés cuenta? Registrate desde la app móvil.</p>
  </main>

  <script>
    (function () {
      var TOKEN_KEY = 'rh_token';
      var USER_KEY = 'rh_user';

      if (localStorage.getItem(TOKEN_KEY)) {
        window.location.replace('inicio.php');
        return;
      }

      var form = document.getElementById('loginForm');
      var errorEl = document.getElementById('error');
      var btn = document.getElementById('submitBtn');

      form.addEventListener('submit', async function (e) {
        e.preventDefault();
        errorEl.classList.remove('show');
        errorEl.textContent = '';
        btn.disabled = true;

        var body = new FormData();
        body.append('email', document.getElementById('email').value.trim());
        body.append('password', document.getElementById('password').value);

        try {
          var res = await fetch('inc/ajax/auth/login.php', {
            method: 'POST',
            body: body,
            credentials: 'same-origin'
          });
          var data = await res.json().catch(function () { return null; });

          if (!res.ok || !data || !data.success) {
            throw new Error((data && data.message) || 'No se pudo iniciar sesión');
          }

          localStorage.setItem(TOKEN_KEY, data.data.token);
          localStorage.setItem(USER_KEY, JSON.stringify(data.data.user || {}));
          window.location.href = 'inicio.php';
        } catch (err) {
          errorEl.textContent = err.message || 'Error de conexión';
          errorEl.classList.add('show');
          btn.disabled = false;
        }
      });
    })();
  </script>
</body>
</html>
