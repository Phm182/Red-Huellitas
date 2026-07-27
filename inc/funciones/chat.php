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

    return $hay;
}

/**
 * Busca la conversación entre dos usuarios o la crea.
 *
 * Buscar-o-crear en vez de crear siempre: sin esto, abrir el chat dos veces
 * dejaría dos hilos con la misma persona y los mensajes repartidos entre
 * ambos.
 */
function rh_chat_obtener_o_crear(mysqli $conn, int $yo, int $otro): int
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
    if ($fila) {
        return (int) $fila['ConversacionId'];
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
    return [
        'mensajeId' => (int) $m['MensajeId'],
        'userIdEmisor' => (int) $m['UserIdEmisor'],
        'texto' => $m['Texto'],
        'tipo' => $m['Tipo'],
        'createdAt' => $m['CreatedAt'],
    ];
}
