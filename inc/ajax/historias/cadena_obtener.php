<?php
/**
 * Detalle de una cadena: tema, creador, participantes y las historias
 * vigentes en orden cronológico, para verlas como un carrusel continuo.
 */
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/historias.php';

$userId = rh_require_auth($conn);

$cadenaId = (int) ($_GET['cadenaId'] ?? 0);
if ($cadenaId <= 0) {
    json_error('Falta cadenaId');
}

$stmt = $conn->prepare(
    "SELECT Cadena.*,
            creador.Username AS CreadorUsername,
            creador.NombreCompleto AS CreadorNombre,
            creador.AvatarPath AS CreadorAvatar,
            (SELECT COUNT(*) FROM CadenaParticipante WHERE CadenaId = Cadena.CadenaId) AS TotalParticipantes
     FROM Cadena
     JOIN Usuario creador ON creador.UserId = Cadena.CreadorUserId
     WHERE Cadena.CadenaId = ? AND Cadena.Estado = 'A'"
);
$stmt->bind_param('i', $cadenaId);
$stmt->execute();
$cadena = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!$cadena) {
    json_error('Cadena no encontrada', 404);
}

// Orden cronológico ascendente: la cadena se lee como se fue armando, del
// primero que la arrancó al último que se sumó.
$stmt = $conn->prepare(
    "SELECT Historia.*, Usuario.Username, Usuario.NombreCompleto, Usuario.AvatarPath
     FROM Historia
     JOIN Usuario ON Usuario.UserId = Historia.UserId
     WHERE Historia.CadenaId = ? AND Historia.Estado = 'A' AND Historia.ExpiraEn > NOW()
     ORDER BY Historia.HistoriaId ASC"
);
$stmt->bind_param('i', $cadenaId);
$stmt->execute();
$result = $stmt->get_result();

$historias = [];
while ($row = $result->fetch_assoc()) {
    $publica = rh_historia_publico($conn, $row, $userId);
    $publica['autor'] = rh_usuario_resumen($row);
    $historias[] = $publica;
}
$stmt->close();

json_success([
    'cadena' => rh_cadena_publica($conn, $cadena, $userId),
    'participantes' => rh_cadena_participantes($conn, $cadenaId),
    'historias' => $historias,
]);
