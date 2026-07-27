<?php
/**
 * Autenticación por token bearer (tabla UsuarioSesion) para Red Huellitas.
 * Requiere que bd.php ($conn) y respuesta.php (json_error) ya estén incluidos.
 */

const RH_SESION_DURACION_DIAS = 30;

function rh_hash_password(string $password): string
{
    return password_hash($password, PASSWORD_DEFAULT);
}

function rh_verify_password(string $password, ?string $hash): bool
{
    if ($hash === null || $hash === '') {
        return false;
    }
    return password_verify($password, $hash);
}

/**
 * Crea una sesión nueva para el usuario y devuelve el token en texto plano.
 */
function rh_crear_sesion(mysqli $conn, int $userId, ?string $dispositivo = null): string
{
    $token = bin2hex(random_bytes(32));
    $expira = date('Y-m-d H:i:s', strtotime('+' . RH_SESION_DURACION_DIAS . ' days'));

    $stmt = $conn->prepare(
        'INSERT INTO UsuarioSesion (UserId, Token, Dispositivo, ExpiraEn) VALUES (?, ?, ?, ?)'
    );
    $stmt->bind_param('isss', $userId, $token, $dispositivo, $expira);
    $stmt->execute();
    $stmt->close();

    return $token;
}

function rh_obtener_bearer_token(): ?string
{
    $header = $_SERVER['HTTP_AUTHORIZATION'] ?? null;

    if (!$header && function_exists('getallheaders')) {
        foreach (getallheaders() as $name => $value) {
            if (strcasecmp($name, 'Authorization') === 0) {
                $header = $value;
                break;
            }
        }
    }

    if (!$header || stripos($header, 'Bearer ') !== 0) {
        return null;
    }

    return trim(substr($header, 7));
}

/**
 * Valida el token bearer de la request actual.
 * Si es válido, devuelve el UserId asociado; si no, corta la ejecución con 401.
 */
function rh_require_auth(mysqli $conn): int
{
    $token = rh_obtener_bearer_token();
    if (!$token) {
        json_error('No autenticado', 401);
    }

    $stmt = $conn->prepare(
        'SELECT UserId FROM UsuarioSesion
         WHERE Token = ? AND RevocadoEn IS NULL AND ExpiraEn > NOW()'
    );
    $stmt->bind_param('s', $token);
    $stmt->execute();
    $result = $stmt->get_result();
    $row = $result->fetch_assoc();
    $stmt->close();

    if (!$row) {
        json_error('Sesión inválida o expirada', 401);
    }

    return (int) $row['UserId'];
}

/**
 * Igual que rh_require_auth, pero además exige que el usuario sea admin.
 * Corta con 401 si no hay sesión, o con 403 si la hay pero no es admin.
 *
 * Todo el panel de moderación pasa por acá: las bandejas exponen DNI y
 * selfies de terceros, así que el chequeo no puede quedar sólo en el
 * frontend ni repetirse a mano en cada endpoint.
 */
function rh_require_admin(mysqli $conn): int
{
    $userId = rh_require_auth($conn);

    $stmt = $conn->prepare('SELECT Rol FROM Usuario WHERE UserId = ?');
    $stmt->bind_param('i', $userId);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if (!$row || $row['Rol'] !== 'admin') {
        json_error('No tenés permiso para esta acción', 403);
    }

    return $userId;
}

function rh_revocar_sesion_actual(mysqli $conn): void
{
    $token = rh_obtener_bearer_token();
    if (!$token) {
        return;
    }
    $stmt = $conn->prepare('UPDATE UsuarioSesion SET RevocadoEn = NOW() WHERE Token = ?');
    $stmt->bind_param('s', $token);
    $stmt->execute();
    $stmt->close();
}

/**
 * true si el usuario tiene su verificación de cuenta (DNI+selfie) aprobada.
 * Usado para gatear funciones que requieren cuenta verificada (ej. Mis Mascotas).
 */
function rh_usuario_verificado(mysqli $conn, int $userId): bool
{
    $stmt = $conn->prepare('SELECT EstadoRevision FROM UsuarioVerificacion WHERE UserId = ?');
    $stmt->bind_param('i', $userId);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    return $row !== null && $row['EstadoRevision'] === 'aprobado';
}

/**
 * Resumen público mínimo de un usuario (para listas: búsqueda, seguidores,
 * seguidos). No incluye email/whatsapp/zona — solo lo necesario para
 * mostrar una fila clickeable en una lista.
 */
function rh_usuario_resumen(array $u): array
{
    require_once __DIR__ . '/uploads.php';
    return [
        'userId' => (int) $u['UserId'],
        'username' => $u['Username'],
        'nombreCompleto' => $u['NombreCompleto'],
        'avatarPath' => $u['AvatarPath'],
        'avatarBust' => rh_avatar_bust($u['AvatarPath'] ?? null),
    ];
}

/**
 * Serializa un row de Usuario (array asociativo de la DB) al shape público
 * que se devuelve al cliente (nunca expone PasswordHash/GoogleSub).
 * Recibe $conn para resolver el Codigo de TipoUsuarioCatalogo a partir de
 * Usuario.TipoUsuarioId (misma idea que rh_post_publico($conn, $row, ...)).
 */
function rh_usuario_publico(mysqli $conn, array $u): array
{
    require_once __DIR__ . '/uploads.php';
    $tipoUsuarioCodigo = null;
    if (!empty($u['TipoUsuarioId'])) {
        $stmt = $conn->prepare('SELECT Codigo FROM TipoUsuarioCatalogo WHERE TipoUsuarioId = ?');
        $stmt->bind_param('i', $u['TipoUsuarioId']);
        $stmt->execute();
        $tipo = $stmt->get_result()->fetch_assoc();
        $stmt->close();
        $tipoUsuarioCodigo = $tipo['Codigo'] ?? null;
    }

    return [
        'userId' => (int) $u['UserId'],
        'email' => $u['Email'],
        'nombreCompleto' => $u['NombreCompleto'],
        'username' => $u['Username'],
        'zonaLat' => $u['ZonaLat'] !== null ? (float) $u['ZonaLat'] : null,
        'zonaLng' => $u['ZonaLng'] !== null ? (float) $u['ZonaLng'] : null,
        'zonaDescripcion' => $u['ZonaDescripcion'],
        'whatsappNumero' => $u['WhatsappNumero'],
        'whatsappVisibilidad' => $u['WhatsappVisibilidad'],
        'avatarPath' => $u['AvatarPath'],
        'avatarBust' => rh_avatar_bust($u['AvatarPath'] ?? null),
        'onboardingCompleto' => $u['OnboardingCompleto'] === 'Y',
        'aceptoClausulaAntiCriaderos' => (bool) $u['AceptoClausulaAntiCriaderos'],
        'rol' => $u['Rol'],
        'tipoUsuarioCodigo' => $tipoUsuarioCodigo,
        'notificarProximidad' => (bool) ($u['NotificarProximidad'] ?? 1),
        'perfilPrivado' => (bool) ($u['PerfilPrivado'] ?? 0),
        'mensajePersonal' => $u['MensajePersonal'] ?? null,
    ];
}
