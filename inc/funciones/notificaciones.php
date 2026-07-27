<?php
require_once __DIR__ . '/push.php';

/**
 * Centro de notificaciones: guardar + avisar.
 *
 * Antes cada feature llamaba directo a `rh_enviar_push()` y listo. El problema
 * es que el push es efímero: si el celular estaba apagado, si el token venció
 * o si el usuario entra desde la web, la notificación se perdía sin dejar
 * rastro. `rh_notificar()` guarda primero y manda el push después, así la
 * campanita siempre tiene el historial aunque el push falle.
 */

/**
 * Notifica a uno o varios usuarios.
 *
 * @param int[]      $userIds  destinatarios (se ignoran repetidos y vacíos)
 * @param string     $tipo     clave corta para agrupar/filtrar (ej. 'match_nuevo')
 * @param string     $ruta     a dónde lleva el toque, ej. '/(app)/match/12'
 * @param array      $extra    ['actorUserId' => int, 'mascotaId' => int]
 */
function rh_notificar(
    mysqli $conn,
    array $userIds,
    string $tipo,
    string $titulo,
    string $cuerpo,
    ?string $ruta = null,
    array $extra = []
): void {
    $userIds = array_values(array_unique(array_filter(array_map('intval', $userIds))));
    if (count($userIds) === 0) {
        return;
    }

    $actorUserId = isset($extra['actorUserId']) ? (int) $extra['actorUserId'] : null;
    $mascotaId = isset($extra['mascotaId']) ? (int) $extra['mascotaId'] : null;

    // El titulo/cuerpo vienen de datos de usuario (nombres, temas de cadena),
    // así que se recortan a lo que entra en la columna: si no, un nombre largo
    // hace fallar el INSERT entero y nadie se entera de nada.
    $titulo = mb_substr($titulo, 0, 120);
    $cuerpo = mb_substr($cuerpo, 0, 255);
    $ruta = $ruta !== null ? mb_substr($ruta, 0, 160) : null;

    $stmt = $conn->prepare(
        'INSERT INTO Notificacion (UserId, Tipo, Titulo, Cuerpo, Ruta, ActorUserId, MascotaId)
         VALUES (?, ?, ?, ?, ?, ?, ?)'
    );
    foreach ($userIds as $uid) {
        $stmt->bind_param('issssii', $uid, $tipo, $titulo, $cuerpo, $ruta, $actorUserId, $mascotaId);
        $stmt->execute();
    }
    $stmt->close();

    // El push es el aviso, no el registro: si falla, la fila ya quedó guardada.
    $placeholders = implode(',', array_fill(0, count($userIds), '?'));
    $stmt = $conn->prepare(
        "SELECT ExpoPushToken FROM Usuario
         WHERE UserId IN ($placeholders) AND ExpoPushToken IS NOT NULL AND ExpoPushToken <> ''"
    );
    $stmt->bind_param(str_repeat('i', count($userIds)), ...$userIds);
    $stmt->execute();
    $res = $stmt->get_result();
    $tokens = [];
    while ($fila = $res->fetch_assoc()) {
        $tokens[] = $fila['ExpoPushToken'];
    }
    $stmt->close();

    if (count($tokens) > 0) {
        rh_enviar_push($tokens, $titulo, $cuerpo, $ruta !== null ? ['ruta' => $ruta] : null);
    }
}

/**
 * Contadores para los badges del riel de flotantes.
 *
 * Van en una sola consulta y un solo endpoint a propósito: son tres burbujas
 * que se refrescan seguido, y tres requests separadas por cada refresco es
 * plata tirada.
 */
function rh_notificaciones_contadores(mysqli $conn, int $userId): array
{
    $stmt = $conn->prepare(
        'SELECT
            SUM(CASE WHEN MascotaId IS NULL THEN 1 ELSE 0 END) AS generales,
            SUM(CASE WHEN MascotaId IS NOT NULL THEN 1 ELSE 0 END) AS mascotas
         FROM Notificacion WHERE UserId = ? AND Leida = 0'
    );
    $stmt->bind_param('i', $userId);
    $stmt->execute();
    $fila = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    return [
        'generales' => (int) ($fila['generales'] ?? 0),
        'mascotas' => (int) ($fila['mascotas'] ?? 0),
    ];
}

/** Serializa una fila de Notificacion para la app. */
function rh_notificacion_serializar(array $n): array
{
    return [
        'notificacionId' => (int) $n['NotificacionId'],
        'tipo' => $n['Tipo'],
        'titulo' => $n['Titulo'],
        'cuerpo' => $n['Cuerpo'],
        'ruta' => $n['Ruta'],
        'actorUserId' => $n['ActorUserId'] !== null ? (int) $n['ActorUserId'] : null,
        'mascotaId' => $n['MascotaId'] !== null ? (int) $n['MascotaId'] : null,
        'leida' => (bool) $n['Leida'],
        'createdAt' => $n['CreatedAt'],
    ];
}
