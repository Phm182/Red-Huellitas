<?php
/**
 * Vota una encuesta de historia. Un voto por usuario: volver a votar cambia
 * la opción en vez de sumar otro (PK compuesta + ON DUPLICATE KEY).
 */
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';

$userId = rh_require_auth($conn);

$encuestaId = (int) ($_POST['encuestaId'] ?? 0);
$opcion = strtoupper(trim($_POST['opcion'] ?? ''));

if ($encuestaId <= 0) {
    json_error('Falta encuestaId');
}
if (!in_array($opcion, ['A', 'B'], true)) {
    json_error("La opción debe ser 'A' o 'B'");
}

$stmt = $conn->prepare(
    "SELECT HistoriaEncuesta.EncuestaId
     FROM HistoriaEncuesta
     JOIN Historia ON Historia.HistoriaId = HistoriaEncuesta.HistoriaId
     WHERE HistoriaEncuesta.EncuestaId = ? AND Historia.Estado = 'A' AND Historia.ExpiraEn > NOW()"
);
$stmt->bind_param('i', $encuestaId);
$stmt->execute();
$existe = (bool) $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!$existe) {
    // La historia venció: la encuesta ya no acepta votos.
    json_error('Esta encuesta ya no está disponible', 404);
}

$stmt = $conn->prepare(
    'INSERT INTO HistoriaEncuestaVoto (EncuestaId, UserId, Opcion) VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE Opcion = VALUES(Opcion)'
);
$stmt->bind_param('iis', $encuestaId, $userId, $opcion);
$stmt->execute();
$stmt->close();

$stmt = $conn->prepare(
    "SELECT SUM(Opcion = 'A') AS VotosA, SUM(Opcion = 'B') AS VotosB
     FROM HistoriaEncuestaVoto WHERE EncuestaId = ?"
);
$stmt->bind_param('i', $encuestaId);
$stmt->execute();
$conteo = $stmt->get_result()->fetch_assoc();
$stmt->close();

json_success([
    'votosA' => (int) ($conteo['VotosA'] ?? 0),
    'votosB' => (int) ($conteo['VotosB'] ?? 0),
    'miVoto' => $opcion,
]);
