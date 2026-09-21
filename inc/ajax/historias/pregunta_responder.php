<?php
/**
 * Responde la caja de preguntas de una historia.
 *
 * A diferencia de la encuesta, acá sí se puede responder varias veces: son
 * mensajes, no un voto. Las respuestas sólo las lee el autor.
 */
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/chat.php';
require_once __DIR__ . '/../../funciones/menores.php';

$userId = rh_require_auth($conn);

$preguntaId = (int) ($_POST['preguntaId'] ?? 0);
$texto = trim($_POST['texto'] ?? '');

if ($preguntaId <= 0) {
    json_error('Falta preguntaId');
}
if ($texto === '') {
    json_error('Escribí una respuesta');
}
if (mb_strlen($texto) > 300) {
    json_error('La respuesta no puede superar los 300 caracteres');
}

$stmt = $conn->prepare(
    "SELECT HistoriaPregunta.PreguntaId, Historia.HistoriaId, Historia.UserId, Historia.TipoMedia, Historia.MediaPath
     FROM HistoriaPregunta
     JOIN Historia ON Historia.HistoriaId = HistoriaPregunta.HistoriaId
     WHERE HistoriaPregunta.PreguntaId = ? AND Historia.Estado = 'A' AND Historia.ExpiraEn > NOW()"
);
$stmt->bind_param('i', $preguntaId);
$stmt->execute();
$historia = $stmt->get_result()->fetch_assoc();
$existe = (bool) $historia;
$stmt->close();

if (!$existe) {
    json_error('Esta pregunta ya no está disponible', 404);
}

$stmt = $conn->prepare('INSERT INTO HistoriaPreguntaRespuesta (PreguntaId, UserId, Texto) VALUES (?, ?, ?)');
$stmt->bind_param('iis', $preguntaId, $userId, $texto);
$stmt->execute();
$stmt->close();

// También queda en la charla con el autor, con la miniatura de la historia.
rh_chat_mensaje_de_historia($conn, $userId, $historia, 'historia', $texto);

json_success(null, 'Respuesta enviada', 201);
