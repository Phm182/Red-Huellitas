<?php
/**
 * Registro web — mismos campos que app-movil/app/(auth)/registro.tsx
 */
?><!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Crear cuenta — Red Huellitas</title>
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
      width: min(26rem, 100%);
      padding: 2rem 1.6rem 1.75rem;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 1.1rem;
      box-shadow: 0 18px 50px rgba(42, 36, 32, .08);
    }
    .brand {
      display: grid;
      justify-items: center;
      gap: .55rem;
      margin-bottom: 1.35rem;
      text-align: center;
    }
    .brand img { width: min(10rem, 65%); height: auto; display: block; }
    .brand h1 { margin: 0; font-size: 1.35rem; letter-spacing: -.02em; }
    label {
      display: block;
      margin: 0 0 .35rem;
      font-size: .85rem;
      font-weight: 600;
      color: var(--muted);
    }
    input[type="text"],
    input[type="email"],
    input[type="password"] {
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
    .tipo-label { margin-top: .15rem; }
    .tipos {
      display: flex;
      flex-wrap: wrap;
      gap: .5rem;
      margin: 0 0 1rem;
    }
    .tipos button {
      width: auto;
      margin: 0;
      padding: .55rem 1rem;
      border: 1px solid var(--primary);
      border-radius: 999px;
      background: transparent;
      color: var(--primary);
      font-weight: 600;
    }
    .tipos button.active {
      background: var(--primary);
      color: var(--primary-text);
    }
    .clause {
      display: flex;
      gap: .75rem;
      align-items: flex-start;
      margin: 0 0 1rem;
      padding: .85rem;
      border: 1px solid var(--border);
      border-radius: .7rem;
      background: #fcfbf9;
      cursor: pointer;
    }
    .clause input {
      margin-top: .2rem;
      width: 1.1rem;
      height: 1.1rem;
      accent-color: var(--primary);
      flex-shrink: 0;
    }
    .clause strong {
      display: block;
      margin-bottom: .3rem;
      font-size: .92rem;
    }
    .clause span {
      display: block;
      color: var(--muted);
      font-size: .78rem;
      line-height: 1.4;
    }
    button[type="submit"] {
      width: 100%;
      margin-top: .2rem;
      padding: .85rem 1rem;
      border: 0;
      border-radius: .7rem;
      font: inherit;
      font-weight: 650;
      cursor: pointer;
      color: var(--primary-text);
      background: var(--primary);
    }
    button[type="submit"]:disabled {
      opacity: .55;
      cursor: not-allowed;
    }
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
      font-size: .9rem;
    }
    .hint a { color: var(--primary); font-weight: 600; text-decoration: none; }
  </style>
</head>
<body>
  <main>
    <div class="brand">
      <img src="imgLogo/Logo.png" alt="Red Huellitas">
      <h1>Crear cuenta</h1>
    </div>

    <div id="error" class="error" role="alert"></div>

    <form id="registroForm" autocomplete="on">
      <label for="nombreCompleto">Nombre completo</label>
      <input id="nombreCompleto" name="nombreCompleto" type="text" required autocomplete="name" placeholder="Tu nombre">

      <label for="email">Email</label>
      <input id="email" name="email" type="email" required autocomplete="username" placeholder="tu@email.com">

      <label for="password">Contraseña</label>
      <input id="password" name="password" type="password" required minlength="8" autocomplete="new-password" placeholder="Mínimo 8 caracteres">

      <label class="tipo-label">¿Qué tipo de cuenta sos?</label>
      <div class="tipos" id="tipos" role="group" aria-label="Tipo de cuenta"></div>
      <input type="hidden" id="tipoUsuarioCodigo" name="tipoUsuarioCodigo" value="individual">

      <label class="clause" for="aceptaClausula">
        <input id="aceptaClausula" name="aceptaClausula" type="checkbox" required>
        <div>
          <strong>Acepto la cláusula anti-criaderos y los términos de uso</strong>
          <span>Red Huellitas prohíbe terminantemente el uso de la plataforma para la cría y venta sistemática de animales ("criaderos ilegales"). Esta conducta puede constituir maltrato animal y está sujeta a sanciones legales según la normativa vigente. Al registrarte, declarás no dedicarte a esta actividad y aceptás que tu cuenta puede ser denunciada, suspendida o reportada a las autoridades correspondientes si se detecta esta práctica.</span>
        </div>
      </label>

      <button id="submitBtn" type="submit" disabled>Registrarme</button>
    </form>

    <p class="hint"><a href="index.php">¿Ya tenés cuenta? Iniciá sesión</a></p>
  </main>

  <script>
    (function () {
      var TOKEN_KEY = 'rh_token';
      var USER_KEY = 'rh_user';
      var FALLBACK_TIPOS = [
        { codigo: 'individual', nombre: 'Individual' },
        { codigo: 'refugio', nombre: 'Refugio / Protectora' }
      ];

      if (localStorage.getItem(TOKEN_KEY)) {
        window.location.replace('inicio.php');
        return;
      }

      var form = document.getElementById('registroForm');
      var errorEl = document.getElementById('error');
      var btn = document.getElementById('submitBtn');
      var tiposEl = document.getElementById('tipos');
      var tipoInput = document.getElementById('tipoUsuarioCodigo');
      var acepta = document.getElementById('aceptaClausula');

      function updateSubmitState() {
        var ok =
          document.getElementById('nombreCompleto').value.trim() &&
          document.getElementById('email').value.trim() &&
          document.getElementById('password').value.length >= 8 &&
          acepta.checked;
        btn.disabled = !ok;
      }

      ['nombreCompleto', 'email', 'password'].forEach(function (id) {
        document.getElementById(id).addEventListener('input', updateSubmitState);
      });
      acepta.addEventListener('change', updateSubmitState);

      function renderTipos(tipos) {
        tiposEl.innerHTML = '';
        tipos.forEach(function (tipo, idx) {
          var b = document.createElement('button');
          b.type = 'button';
          b.textContent = tipo.nombre;
          b.dataset.codigo = tipo.codigo;
          if ((tipoInput.value || 'individual') === tipo.codigo || (idx === 0 && !tipoInput.value)) {
            b.classList.add('active');
            tipoInput.value = tipo.codigo;
          }
          b.addEventListener('click', function () {
            tipoInput.value = tipo.codigo;
            Array.prototype.forEach.call(tiposEl.querySelectorAll('button'), function (el) {
              el.classList.toggle('active', el === b);
            });
          });
          tiposEl.appendChild(b);
        });
      }

      fetch('inc/ajax/noticias/tipos.php')
        .then(function (r) { return r.json(); })
        .then(function (data) {
          if (data && data.success && data.data && data.data.tipos && data.data.tipos.length) {
            renderTipos(data.data.tipos);
          } else {
            renderTipos(FALLBACK_TIPOS);
          }
        })
        .catch(function () { renderTipos(FALLBACK_TIPOS); });

      form.addEventListener('submit', async function (e) {
        e.preventDefault();
        errorEl.classList.remove('show');
        errorEl.textContent = '';
        btn.disabled = true;

        var body = new URLSearchParams();
        body.set('nombreCompleto', document.getElementById('nombreCompleto').value.trim());
        body.set('email', document.getElementById('email').value.trim());
        body.set('password', document.getElementById('password').value);
        body.set('tipoUsuarioCodigo', tipoInput.value || 'individual');
        body.set('aceptaClausulaAntiCriaderos', acepta.checked ? '1' : '0');

        try {
          var res = await fetch('inc/ajax/auth/registro.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: body.toString(),
            credentials: 'same-origin'
          });
          var data = await res.json().catch(function () { return null; });

          if (!data || !data.success) {
            throw new Error((data && data.message) || 'No se pudo registrar');
          }

          localStorage.setItem(TOKEN_KEY, data.data.token);
          localStorage.setItem(USER_KEY, JSON.stringify(data.data.user || {}));
          window.location.href = 'inicio.php';
        } catch (err) {
          errorEl.textContent = err.message || 'Error de conexión';
          errorEl.classList.add('show');
          updateSubmitState();
        }
      });
    })();
  </script>
</body>
</html>
