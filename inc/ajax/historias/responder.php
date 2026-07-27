<?php
/**
 * Responder directamente al autor de una historia.
 *
 * No se puede responder la propia: no tiene sentido y ensuciaría la bandeja
 * del autor con mensajes suyos.
 */
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/push.php';
require_once __DIR__ . '/../../funciones/notificaciones.php';

$userId = rh_require_auth($conn);

$historiaId = (int) ($_POST['historiaId'] ?? 0);
$texto = trim($_POST['texto'] ?? '');

if ($historiaId <= 0) {
    json_error('Falta historiaId');
}
if ($texto === '') {
    json_error('Escribí un mensaje');
}
if (mb_strlen($texto) > 500) {
    json_error('El mensaje no puede superar los 500 caracteres');
}

$stmt = $conn->prepare(
    "SELECT Historia.UserId, Usuario.ExpoPushToken, autor.NombreCompleto AS QuienResponde
     FROM Historia
     JOIN Usuario ON Usuario.UserId = Historia.UserId
     JOIN Usuario autor ON autor.UserId = ?
     WHERE Historia.HistoriaId = ? AND Historia.Estado = 'A' AND Historia.ExpiraEn > NOW()"
);
$stmt->bind_param('ii', $userId, $historiaId);
$stmt->execute();
$historia = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!$historia) {
    json_error('Esta historia ya no está disponible', 404);
}
if ((int) $historia['UserId'] === $userId) {
    json_error('No podés responder tu propia historia');
}

$stmt = $conn->prepare('INSERT INTO HistoriaRespuesta (HistoriaId, UserId, Texto) VALUES (?, ?, ?)');
$stmt->bind_param('iis', $historiaId, $userId, $texto);
$stmt->execute();
$stmt->close();

if (!empty($historia['ExpoPushToken'])) {
    try {
        rh_notificar(
            $conn,
            [(int) $historia['UserId']],
            'historia_respuesta',
            'Respondieron tu Huellita',
            sprintf('%s: %s', $historia['QuienResponde'], mb_substr($texto, 0, 80)),
            '/(app)/historias/ver/' . (int) $historia['UserId'],
            ['actorUserId' => $userId]
        );
    } catch (Throwable $e) {
        error_log('historias/responder.php: ' . $e->getMessage());
    }
}

json_success(null, 'Respuesta enviada', 201);
