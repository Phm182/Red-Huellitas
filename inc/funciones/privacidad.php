<?php
/**
 * Cuenta privada: quién puede ver qué.
 *
 * Todo lo que exponga datos de un usuario (su perfil, sus publicaciones, sus
 * Huellitas, sus mascotas, sus seguidores) tiene que pasar por acá. Es el
 * punto donde esto se rompe fácil: alcanza con olvidarse de un endpoint para
 * que la privacidad quede de adorno.
 */

/**
 * ¿`$viewerUserId` puede ver el contenido de `$targetUserId`?
 *
 * Sí cuando: es él mismo, el perfil es público, ya lo sigue, o es admin
 * (moderación tiene que poder revisar denuncias sobre cuentas privadas).
 */
function rh_puede_ver_perfil(mysqli $conn, int $viewerUserId, int $targetUserId): bool
{
    if ($viewerUserId === $targetUserId) {
        return true;
    }

    $stmt = $conn->prepare('SELECT PerfilPrivado FROM Usuario WHERE UserId = ?');
    $stmt->bind_param('i', $targetUserId);
    $stmt->execute();
    $fila = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if (!$fila) {
        return false;
    }
    if ((int) $fila['PerfilPrivado'] === 0) {
        return true;
    }

    $stmt = $conn->prepare('SELECT SeguimientoId FROM Seguimiento WHERE UserIdSeguidor = ? AND UserIdSeguido = ?');
    $stmt->bind_param('ii', $viewerUserId, $targetUserId);
    $stmt->execute();
    $sigue = (bool) $stmt->get_result()->fetch_assoc();
    $stmt->close();
    if ($sigue) {
        return true;
    }

    $stmt = $conn->prepare('SELECT Rol FROM Usuario WHERE UserId = ?');
    $stmt->bind_param('i', $viewerUserId);
    $stmt->execute();
    $rol = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    return $rol && $rol['Rol'] === 'admin';
}

/** Corta con 403 si no puede ver. Para usar arriba de todo en un endpoint. */
function rh_require_ver_perfil(mysqli $conn, int $viewerUserId, int $targetUserId): void
{
    if (!rh_puede_ver_perfil($conn, $viewerUserId, $targetUserId)) {
        json_error('Esta cuenta es privada. Seguila para ver su contenido.', 403);
    }
}

/** ¿El perfil es privado? */
function rh_perfil_es_privado(mysqli $conn, int $userId): bool
{
    $stmt = $conn->prepare('SELECT PerfilPrivado FROM Usuario WHERE UserId = ?');
    $stmt->bind_param('i', $userId);
    $stmt->execute();
    $fila = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    return $fila ? (int) $fila['PerfilPrivado'] === 1 : false;
}

/**
 * Estado del vínculo del viewer con un usuario, para que la app sepa qué
 * botón dibujar: "Seguir", "Solicitado" o "Siguiendo".
 */
function rh_estado_seguimiento(mysqli $conn, int $viewerUserId, int $targetUserId): string
{
    if ($viewerUserId === $targetUserId) {
        return 'propio';
    }

    $stmt = $conn->prepare('SELECT SeguimientoId FROM Seguimiento WHERE UserIdSeguidor = ? AND UserIdSeguido = ?');
    $stmt->bind_param('ii', $viewerUserId, $targetUserId);
    $stmt->execute();
    $sigue = (bool) $stmt->get_result()->fetch_assoc();
    $stmt->close();
    if ($sigue) {
        return 'siguiendo';
    }

    $stmt = $conn->prepare(
        "SELECT SolicitudId FROM SolicitudSeguimiento
         WHERE UserIdSolicitante = ? AND UserIdDestino = ? AND Estado = 'pendiente'"
    );
    $stmt->bind_param('ii', $viewerUserId, $targetUserId);
    $stmt->execute();
    $pendiente = (bool) $stmt->get_result()->fetch_assoc();
    $stmt->close();

    return $pendiente ? 'solicitado' : 'ninguno';
}
