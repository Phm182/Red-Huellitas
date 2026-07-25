<?php
/**
 * Orquestación del avatar generado por IA del minijuego (Fase 7b).
 *
 * Separado de gemini.php a propósito: acá vive la lógica de negocio (cuotas,
 * guardado, actualización de la mascota) y allá sólo el cliente HTTP. Si algún
 * día se cambia de proveedor de IA, sólo se toca gemini.php.
 *
 * Requiere que quien llame haya hecho require_once de mascotas.php y uploads.php.
 */

require_once __DIR__ . '/gemini.php';

/**
 * Cuánto le queda al usuario hoy y si puede generar.
 *
 * Los conteos se hacen con CURDATE() de MySQL, no con date() de PHP: el corte
 * por día tiene que ser el mismo que usa el resto del sistema (ver el gotcha
 * de zonas horarias documentado en bd.php).
 *
 * Los intentos fallidos (Exito = 0) NO consumen cuota.
 *
 * @return array{puede: bool, restantesHoy: int, motivo: ?string}
 */
function rh_avatar_cuota_disponible(mysqli $conn, int $userId): array
{
    $config = rh_gemini_config();
    $limiteUsuario = (int) ($config['LIMITE_DIARIO_USUARIO'] ?? 3);
    $limiteGlobal = (int) ($config['LIMITE_DIARIO_GLOBAL'] ?? 400);

    $stmt = $conn->prepare(
        'SELECT
            SUM(UserId = ?) AS DelUsuario,
            COUNT(*)        AS Global
         FROM MascotaAvatarGeneracion
         WHERE Exito = 1 AND DATE(CreatedAt) = CURDATE()'
    );
    $stmt->bind_param('i', $userId);
    $stmt->execute();
    $fila = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    $delUsuario = (int) ($fila['DelUsuario'] ?? 0);
    $global = (int) ($fila['Global'] ?? 0);
    $restantes = max(0, $limiteUsuario - $delUsuario);

    if ($global >= $limiteGlobal) {
        return ['puede' => false, 'restantesHoy' => $restantes, 'motivo' => 'global'];
    }
    if ($delUsuario >= $limiteUsuario) {
        return ['puede' => false, 'restantesHoy' => 0, 'motivo' => 'usuario'];
    }

    return ['puede' => true, 'restantesHoy' => $restantes, 'motivo' => null];
}

/** Deja registro del intento, haya salido bien o mal. */
function rh_avatar_registrar(mysqli $conn, int $mascotaId, int $userId, bool $exito, ?string $detalle = null): void
{
    $stmt = $conn->prepare(
        'INSERT INTO MascotaAvatarGeneracion (MascotaId, UserId, Exito, Detalle) VALUES (?, ?, ?, ?)'
    );
    $exitoInt = $exito ? 1 : 0;
    $detalleCorto = $detalle === null ? null : mb_substr($detalle, 0, 255);
    $stmt->bind_param('iiis', $mascotaId, $userId, $exitoInt, $detalleCorto);
    $stmt->execute();
    $stmt->close();
}

/**
 * Borra el archivo del avatar anterior, si había. Evita acumular PNGs viejos
 * cada vez que alguien regenera.
 */
function rh_avatar_borrar_archivo(?string $avatarPath): void
{
    if ($avatarPath === null || $avatarPath === '') {
        return;
    }
    $ruta = __DIR__ . '/../../uploads/' . $avatarPath;
    if (is_file($ruta)) {
        @unlink($ruta);
    }
}

/**
 * Genera el avatar de una mascota y lo deja guardado y asociado.
 *
 * @return array{ok: bool, error: ?string, codigo: int, avatarPath: ?string}
 *         `codigo` es el HTTP que debería devolver el endpoint.
 */
function rh_avatar_generar(mysqli $conn, array $juego, array $mascota, int $userId): array
{
    $mascotaId = (int) $mascota['MascotaId'];
    $fallo = fn (string $msg, int $codigo): array =>
        ['ok' => false, 'error' => $msg, 'codigo' => $codigo, 'avatarPath' => null];

    if (!rh_gemini_configurado()) {
        return $fallo('La generación de avatares no está disponible todavía', 503);
    }

    $cuota = rh_avatar_cuota_disponible($conn, $userId);
    if (!$cuota['puede']) {
        return $fallo(
            $cuota['motivo'] === 'global'
                ? 'Se alcanzó el límite de avatares del día. Probá mañana.'
                : 'Ya generaste todos tus avatares de hoy. Probá mañana.',
            429
        );
    }

    // La foto de origen es la primera de la galería (convención del proyecto).
    $fotos = rh_mascota_fotos($conn, $mascotaId);
    if (count($fotos) === 0) {
        return $fallo('Primero subí una foto de tu mascota para poder generar el avatar', 400);
    }

    $rutaFoto = __DIR__ . '/../../uploads/' . $fotos[0]['path'];

    $resultado = rh_gemini_generar_avatar($rutaFoto);
    if (!$resultado['ok']) {
        rh_avatar_registrar($conn, $mascotaId, $userId, false, $resultado['error']);
        return $fallo($resultado['error'], 502);
    }

    $nombre = 'avatar_' . bin2hex(random_bytes(4)) . '.png';
    $destino = rh_dir_fotos_mascota($mascotaId) . '/' . $nombre;

    if (@file_put_contents($destino, $resultado['imagen']) === false) {
        rh_avatar_registrar($conn, $mascotaId, $userId, false, 'No se pudo guardar el archivo');
        return $fallo('No se pudo guardar el avatar generado', 500);
    }

    // Recién acá se borra el anterior: si algo falló antes, el avatar viejo
    // sigue intacto.
    rh_avatar_borrar_archivo($juego['AvatarPath']);

    $avatarPath = 'mascotas/' . $mascotaId . '/' . $nombre;
    $stmt = $conn->prepare('UPDATE MascotaJuego SET AvatarPath = ? WHERE MascotaId = ?');
    $stmt->bind_param('si', $avatarPath, $mascotaId);
    $stmt->execute();
    $stmt->close();

    rh_avatar_registrar($conn, $mascotaId, $userId, true, null);

    return ['ok' => true, 'error' => null, 'codigo' => 200, 'avatarPath' => $avatarPath];
}

/** Vuelve a la foto real: borra el archivo generado y limpia la columna. */
function rh_avatar_quitar(mysqli $conn, array $juego): void
{
    rh_avatar_borrar_archivo($juego['AvatarPath']);

    $mascotaId = (int) $juego['MascotaId'];
    $stmt = $conn->prepare('UPDATE MascotaJuego SET AvatarPath = NULL WHERE MascotaId = ?');
    $stmt->bind_param('i', $mascotaId);
    $stmt->execute();
    $stmt->close();
}
