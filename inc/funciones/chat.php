<?php
require_once __DIR__ . '/uploads.php';

/**
 * Chat directo 1 a 1.
 *
 * Sin websockets: en hosting compartido con PHP no hay forma honesta de tener
 * push bidireccional, así que la app hace polling cortito mientras la
 * conversación está abierta. Para un chat de a dos alcanza.
 */

/**
 * ¿Hay relación previa entre dos usuarios?
 *
 * Define si un mensaje entra como charla o como solicitud. Cuenta que uno siga
 * al otro (en cualquier dirección), que tengan un match de mascotas, o que haya
 * un pedido de compra en común: en esos tres casos ya se conocen y mandarlos a
 * la bandeja de solicitudes sería un estorbo.
 */
/**
 * Ids de sticker válidos. Tiene que coincidir con `src/chat/stickers.tsx`.
 *
 * Es una lista blanca y no texto libre: `Mensaje.Texto` se usa como id, y sin
 * validar acá cualquiera podría inyectar contenido arbitrario en un mensaje
 * que la app dibuja distinto. Un id desconocido no rompe la app (no dibuja
 * nada), pero mejor no dejarlo entrar.
 */
const RH_STICKERS = [
    'huella',
    'perro_feliz',
    'gato_curioso',
    'hueso',
    'corazon_huella',
    'pelota',
    'adopta',
    'dormido',
];

function rh_sticker_valido(string $id): bool
{
    return in_array($id, RH_STICKERS, true);
}

function rh_chat_hay_relacion(mysqli $conn, int $a, int $b): bool
{
    $stmt = $conn->prepare(
        'SELECT 1 FROM Seguimiento
         WHERE (UserIdSeguidor = ? AND UserIdSeguido = ?) OR (UserIdSeguidor = ? AND UserIdSeguido = ?)
         LIMIT 1'
    );
    $stmt->bind_param('iiii', $a, $b, $b, $a);
    $stmt->execute();
    $hay = (bool) $stmt->get_result()->fetch_row();
    $stmt->close();
    if ($hay) {
        return true;
    }

    $stmt = $conn->prepare(
        'SELECT 1 FROM MascotaMatch
         WHERE (UserIdA = ? AND UserIdB = ?) OR (UserIdA = ? AND UserIdB = ?)
         LIMIT 1'
    );
    $stmt->bind_param('iiii', $a, $b, $b, $a);
    $stmt->execute();
    $hay = (bool) $stmt->get_result()->fetch_row();
    $stmt->close();
    if ($hay) {
        return true;
    }

    $stmt = $conn->prepare(
        'SELECT 1 FROM Pedido
         WHERE (CompradorUserId = ? AND VendedorUserId = ?) OR (CompradorUserId = ? AND VendedorUserId = ?)
         LIMIT 1'
    );
    $stmt->bind_param('iiii', $a, $b, $b, $a);
    $stmt->execute();
    $hay = (bool) $stmt->get_result()->fetch_row();
    $stmt->close();
    if ($hay) {
        return true;
    }

    // Postulación de adopción: aunque el perfil sea privado, el contacto
    // queda habilitado mientras exista el vínculo (publicación activa).
    $stmt = $conn->prepare(
        'SELECT 1
         FROM AdopcionPostulacion p
         JOIN Adopcion a ON a.AdopcionId = p.AdopcionId AND a.Estado = \'A\'
         WHERE (a.UserId = ? AND p.UserId = ?) OR (a.UserId = ? AND p.UserId = ?)
         LIMIT 1'
    );
    $stmt->bind_param('iiii', $a, $b, $b, $a);
    $stmt->execute();
    $hay = (bool) $stmt->get_result()->fetch_row();
    $stmt->close();

    return $hay;
}

/**
 * Busca la conversación existente entre dos usuarios. Devuelve 0 si no hay.
 *
 * Abrir un chat NO crea nada: la conversación nace recién con el primer
 * mensaje (ver `enviar.php`). Si se creara al abrir, con sólo entrar a la
 * pantalla —sin escribir— ya aparecería en el listado de charlas de los dos.
 */
function rh_chat_buscar(mysqli $conn, int $yo, int $otro): int
{
    $stmt = $conn->prepare(
        'SELECT a.ConversacionId
         FROM ConversacionParticipante a
         JOIN ConversacionParticipante b ON b.ConversacionId = a.ConversacionId AND b.UserId = ?
         WHERE a.UserId = ?
         LIMIT 1'
    );
    $stmt->bind_param('ii', $otro, $yo);
    $stmt->execute();
    $fila = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    return $fila ? (int) $fila['ConversacionId'] : 0;
}

/**
 * Busca la conversación entre dos usuarios o la crea.
 *
 * Buscar-o-crear en vez de crear siempre: sin esto, escribir dos veces a la
 * misma persona dejaría dos hilos y los mensajes repartidos entre ambos. Sólo
 * lo llama `enviar.php`, al mandarse el primer mensaje.
 */
function rh_chat_obtener_o_crear(mysqli $conn, int $yo, int $otro): int
{
    $existente = rh_chat_buscar($conn, $yo, $otro);
    if ($existente > 0) {
        return $existente;
    }

    $conn->query('INSERT INTO Conversacion () VALUES ()');
    $conversacionId = (int) $conn->insert_id;

    // El que abre siempre queda activo; el otro entra como solicitud si no se
    // conocen de antes.
    $estadoOtro = rh_chat_hay_relacion($conn, $yo, $otro) ? 'activa' : 'solicitud';

    $stmt = $conn->prepare(
        'INSERT INTO ConversacionParticipante (ConversacionId, UserId, Estado) VALUES (?, ?, ?)'
    );
    $activa = 'activa';
    $stmt->bind_param('iis', $conversacionId, $yo, $activa);
    $stmt->execute();
    $stmt->bind_param('iis', $conversacionId, $otro, $estadoOtro);
    $stmt->execute();
    $stmt->close();

    return $conversacionId;
}

/** Los datos de un usuario con la misma forma que `otro` en una conversación. */
function rh_chat_usuario_como_otro(mysqli $conn, int $userId): ?array
{
    $stmt = $conn->prepare(
        'SELECT UserId, Username, NombreCompleto, AvatarPath, MensajePersonal FROM Usuario WHERE UserId = ?'
    );
    $stmt->bind_param('i', $userId);
    $stmt->execute();
    $fila = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    if (!$fila) {
        return null;
    }
    return [
        'userId' => (int) $fila['UserId'],
        'username' => $fila['Username'],
        'nombreCompleto' => $fila['NombreCompleto'],
        'avatarPath' => $fila['AvatarPath'],
        'avatarBust' => rh_avatar_bust($fila['AvatarPath'] ?? null),
        'mensajePersonal' => $fila['MensajePersonal'],
    ];
}

/** El otro participante de una conversación de a dos. */
function rh_chat_otro_participante(mysqli $conn, int $conversacionId, int $yo): ?array
{
    $stmt = $conn->prepare(
        'SELECT u.UserId, u.Username, u.NombreCompleto, u.AvatarPath, u.MensajePersonal
         FROM ConversacionParticipante cp
         JOIN Usuario u ON u.UserId = cp.UserId
         WHERE cp.ConversacionId = ? AND cp.UserId <> ?
         LIMIT 1'
    );
    $stmt->bind_param('ii', $conversacionId, $yo);
    $stmt->execute();
    $fila = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    if (!$fila) {
        return null;
    }
    return [
        'userId' => (int) $fila['UserId'],
        'username' => $fila['Username'],
        'nombreCompleto' => $fila['NombreCompleto'],
        'avatarPath' => $fila['AvatarPath'],
        'avatarBust' => rh_avatar_bust($fila['AvatarPath'] ?? null),
        'mensajePersonal' => $fila['MensajePersonal'],
    ];
}

/** ¿El usuario participa de esta conversación? Devuelve su estado o null. */
function rh_chat_estado_participante(mysqli $conn, int $conversacionId, int $userId): ?string
{
    $stmt = $conn->prepare(
        'SELECT Estado FROM ConversacionParticipante WHERE ConversacionId = ? AND UserId = ?'
    );
    $stmt->bind_param('ii', $conversacionId, $userId);
    $stmt->execute();
    $fila = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    return $fila ? $fila['Estado'] : null;
}

function rh_mensaje_serializar(array $m): array
{
    $salida = [
        'mensajeId' => (int) $m['MensajeId'],
        'userIdEmisor' => (int) $m['UserIdEmisor'],
        'texto' => $m['Texto'],
        'tipo' => $m['Tipo'],
        'createdAt' => $m['CreatedAt'],
    ];
    // Respuesta o reacción a una historia: viaja con qué historia era.
    if (!empty($m['HistoriaId']) || !empty($m['HistoriaMediaPath'])) {
        $salida['historia'] = [
            'historiaId' => (int) ($m['HistoriaId'] ?? 0),
            'mediaPath' => $m['HistoriaMediaPath'] ?? null,
        ];
    }
    return $salida;
}

/** ¿Ya corrió la migración 074 (mensajes de historia)? Se cachea por request. */
function rh_chat_soporta_historias(mysqli $conn): bool
{
    static $ok = null;
    if ($ok === null) {
        $r = $conn->query(
            "SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Mensaje' AND COLUMN_NAME = 'HistoriaMediaPath'"
        );
        $ok = $r && (int) ($r->fetch_row()[0] ?? 0) > 0;
    }
    return $ok;
}

/**
 * Miniatura de una historia para mostrar en el chat.
 *
 * Una foto se copia achicada (360 px) a `uploads/historias_chat/`: la historia
 * vence a las 24 hs y `limpiar_historias.php` borra el archivo original una
 * semana después, pero el mensaje del chat tiene que seguir mostrando algo. Un
 * video no tiene cuadro para extraer en el servidor: devuelve null y la app
 * dibuja un ícono de video.
 */
function rh_chat_miniatura_historia(string $mediaPath, string $tipoMedia, int $historiaId): ?string
{
    if ($tipoMedia !== 'foto') {
        return null;
    }
    $origen = __DIR__ . '/../../uploads/' . $mediaPath;
    if (!is_file($origen)) {
        return null;
    }

    $relativa = 'historias_chat/' . $historiaId . '.jpg';
    $dir = __DIR__ . '/../../uploads/historias_chat';
    $destino = $dir . '/' . $historiaId . '.jpg';
    if (is_file($destino)) {
        return $relativa;
    }
    require_once __DIR__ . '/uploads.php';
    if (!function_exists('imagecreatefromstring') || !rh_asegurar_directorio($dir)) {
        return $mediaPath;
    }

    $bin = @file_get_contents($origen);
    $img = $bin !== false ? @imagecreatefromstring($bin) : false;
    if (!$img) {
        return $mediaPath;
    }
    $w = imagesx($img);
    $h = imagesy($img);
    $nw = min(360, $w);
    $nh = max(1, (int) round($h * $nw / max(1, $w)));
    $mini = imagecreatetruecolor($nw, $nh);
    imagecopyresampled($mini, $img, 0, 0, 0, 0, $nw, $nh, $w, $h);
    imagejpeg($mini, $destino, 78);
    imagedestroy($img);
    imagedestroy($mini);

    return is_file($destino) ? $relativa : $mediaPath;
}

/**
 * Deja en la charla con el autor de una historia la respuesta o reacción de
 * quien la vio, con la miniatura de la historia.
 *
 * $tipo: 'historia' (respuesta de texto) o 'historia_reaccion' (Texto = clave).
 * $historia: fila con HistoriaId, UserId (el autor), TipoMedia y MediaPath.
 *
 * Nunca rompe lo que lo llamó: si la migración no corrió, si el chat entre los
 * dos no está permitido (menores) o algo falla, simplemente no deja el mensaje.
 */
function rh_chat_mensaje_de_historia(mysqli $conn, int $emisorId, array $historia, string $tipo, string $texto): void
{
    try {
        if (!rh_chat_soporta_historias($conn)) {
            return;
        }
        $autorId = (int) $historia['UserId'];
        if ($autorId === $emisorId || !in_array($tipo, ['historia', 'historia_reaccion'], true)) {
            return;
        }

        $conversacionId = rh_chat_buscar($conn, $emisorId, $autorId);
        if ($conversacionId > 0) {
            $permiso = rh_chat_permitido($conn, $emisorId, $autorId, $conversacionId);
        } else {
            $permiso = rh_chat_permitido($conn, $emisorId, $autorId);
        }
        if (!$permiso['ok']) {
            error_log('rh_chat_mensaje_de_historia: chat no permitido ' . $emisorId . '->' . $autorId);
            return;
        }
        if ($conversacionId <= 0) {
            $conversacionId = rh_chat_obtener_o_crear($conn, $emisorId, $autorId);
        }

        $historiaId = (int) $historia['HistoriaId'];
        // La miniatura nunca debe impedir que el mensaje llegue: si falla (foto
        // enorme, poca memoria), se usa la ruta original.
        try {
            $mini = rh_chat_miniatura_historia((string) $historia['MediaPath'], (string) $historia['TipoMedia'], $historiaId);
        } catch (Throwable $e) {
            error_log('rh_chat_miniatura_historia: ' . $e->getMessage());
            $mini = $historia['TipoMedia'] === 'foto' ? (string) $historia['MediaPath'] : null;
        }

        $stmt = $conn->prepare(
            'INSERT INTO Mensaje (ConversacionId, UserIdEmisor, Texto, Tipo, HistoriaId, HistoriaMediaPath)
             VALUES (?, ?, ?, ?, ?, ?)'
        );
        $stmt->bind_param('iissis', $conversacionId, $emisorId, $texto, $tipo, $historiaId, $mini);
        $stmt->execute();
        $mensajeId = (int) $stmt->insert_id;
        $stmt->close();

        $conn->query('UPDATE Conversacion SET UltimoMensajeEn = NOW() WHERE ConversacionId = ' . $conversacionId);

        // Quien manda da por leído lo suyo.
        $stmt = $conn->prepare(
            'UPDATE ConversacionParticipante SET UltimaLecturaMensajeId = ? WHERE ConversacionId = ? AND UserId = ?'
        );
        $stmt->bind_param('iii', $mensajeId, $conversacionId, $emisorId);
        $stmt->execute();
        $stmt->close();
    } catch (Throwable $e) {
        error_log('rh_chat_mensaje_de_historia: ' . $e->getMessage());
    }
}
