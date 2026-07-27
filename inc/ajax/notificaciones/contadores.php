<?php
/**
 * Los tres badges del riel de flotantes en una sola request.
 *
 * Va todo junto a propósito: la app lo llama cada 30s y tres endpoints
 * separados serían tres viajes por cada refresco.
 */
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/notificaciones.php';

$userId = rh_require_auth($conn);

$contadores = rh_notificaciones_contadores($conn, $userId);

// Mensajes sin leer: sólo de charlas aceptadas. Las solicitudes se cuentan
// aparte para que un desconocido no te infle el badge principal.
$mensajes = 0;
$solicitudesChat = 0;
$existeChat = $conn->query("SHOW TABLES LIKE 'ConversacionParticipante'");
if ($existeChat && $existeChat->num_rows > 0) {
    $stmt = $conn->prepare(
        "SELECT
            SUM(CASE WHEN cp.Estado = 'activa' THEN 1 ELSE 0 END) AS activas,
            SUM(CASE WHEN cp.Estado = 'solicitud' THEN 1 ELSE 0 END) AS solicitudes
         FROM ConversacionParticipante cp
         WHERE cp.UserId = ?
           AND EXISTS (
             SELECT 1 FROM Mensaje m
             WHERE m.ConversacionId = cp.ConversacionId
               AND m.UserIdEmisor <> cp.UserId
               AND m.MensajeId > COALESCE(cp.UltimaLecturaMensajeId, 0)
           )"
    );
    $stmt->bind_param('i', $userId);
    $stmt->execute();
    $fila = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    $mensajes = (int) ($fila['activas'] ?? 0);
    $solicitudesChat = (int) ($fila['solicitudes'] ?? 0);
}

// Solicitudes de seguimiento pendientes (cuenta privada).
$stmt = $conn->prepare("SELECT COUNT(*) AS n FROM SolicitudSeguimiento WHERE UserIdDestino = ? AND Estado = 'pendiente'");
$stmt->bind_param('i', $userId);
$stmt->execute();
$solicitudesSeguir = (int) $stmt->get_result()->fetch_assoc()['n'];
$stmt->close();

json_success([
    'notificaciones' => $contadores['generales'] + $solicitudesSeguir,
    'mascotas' => $contadores['mascotas'],
    'mensajes' => $mensajes,
    'solicitudesChat' => $solicitudesChat,
    'solicitudesSeguir' => $solicitudesSeguir,
]);
