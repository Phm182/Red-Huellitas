<?php
/**
 * Reacción rápida a una Huellita.
 *
 * Una fila por (Historia, Usuario): tocar otra reacción reemplaza la anterior,
 * y tocar la misma la saca. Es el mismo comportamiento que las reacciones de
 * publicaciones, para que no haya dos lógicas distintas conviviendo.
 *
 * A diferencia de `responder.php`, esto no abre conversación: es un toque.
 */
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/privacidad.php';
require_once __DIR__ . '/../../funciones/notificaciones.php';

const RH_REACCIONES_HISTORIA = ['huella', 'amor', 'divertido', 'asombro', 'triste', 'abrazo', 'guau', 'michi'];

$userId = rh_require_auth($conn);

$historiaId = (int) ($_POST['historiaId'] ?? 0);
$tipo = trim($_POST['tipo'] ?? '');

if ($historiaId <= 0) {
    json_error('Falta historiaId');
}
if (!in_array($tipo, RH_REACCIONES_HISTORIA, true)) {
    json_error('Reacción inválida');
}

// La Huellita tiene que existir, estar vigente y ser visible para quien
// reacciona: sin el chequeo de privacidad se podría reaccionar a la historia
// de una cuenta privada que no seguís, y el dueño recibiría la notificación.
$stmt = $conn->prepare(
    "SELECT h.HistoriaId, h.UserId
       FROM Historia h
      WHERE h.HistoriaId = ? AND h.Estado = 'A' AND h.ExpiraEn > NOW()"
);
$stmt->bind_param('i', $historiaId);
$stmt->execute();
$historia = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!$historia) {
    json_error('La Huellita no existe o ya venció', 404);
}

$autorId = (int) $historia['UserId'];
if (!rh_puede_ver_perfil($conn, $userId, $autorId)) {
    json_error('No podés ver esta Huellita', 403);
}

// ¿Ya había reaccionado con lo mismo? Entonces es un destoque.
$stmt = $conn->prepare('SELECT Tipo FROM HistoriaReaccion WHERE HistoriaId = ? AND UserId = ?');
$stmt->bind_param('ii', $historiaId, $userId);
$stmt->execute();
$previa = $stmt->get_result()->fetch_assoc();
$stmt->close();

$quitada = $previa && $previa['Tipo'] === $tipo;

if ($quitada) {
    $stmt = $conn->prepare('DELETE FROM HistoriaReaccion WHERE HistoriaId = ? AND UserId = ?');
    $stmt->bind_param('ii', $historiaId, $userId);
    $stmt->execute();
    $stmt->close();
} else {
    // Un solo INSERT con ON DUPLICATE: reemplaza la reacción anterior sin
    // necesidad de borrar primero, y evita la carrera entre dos toques rápidos.
    $stmt = $conn->prepare(
        'INSERT INTO HistoriaReaccion (HistoriaId, UserId, Tipo) VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE Tipo = VALUES(Tipo), CreatedAt = NOW()'
    );
    $stmt->bind_param('iis', $historiaId, $userId, $tipo);
    $stmt->execute();
    $stmt->close();

    // Sólo se avisa la primera vez y nunca a uno mismo: cambiar de reacción no
    // tiene por qué volver a notificar.
    if (!$previa && $autorId !== $userId) {
        $stmt = $conn->prepare('SELECT NombreCompleto, Username FROM Usuario WHERE UserId = ?');
        $stmt->bind_param('i', $userId);
        $stmt->execute();
        $yo = $stmt->get_result()->fetch_assoc();
        $stmt->close();
        $nombre = !empty($yo['Username']) ? '@' . $yo['Username'] : ($yo['NombreCompleto'] ?? 'Alguien');

        rh_notificar(
            $conn,
            [$autorId],
            'historia_reaccion',
            'Reaccionaron a tu Huellita',
            "$nombre reaccionó a tu Huellita",
            '/(app)/historias/' . $historiaId,
            ['actorUserId' => $userId]
        );
    }
}

// Conteo por tipo para pintar la UI sin una segunda llamada.
$stmt = $conn->prepare(
    'SELECT Tipo, COUNT(*) AS Total FROM HistoriaReaccion WHERE HistoriaId = ? GROUP BY Tipo'
);
$stmt->bind_param('i', $historiaId);
$stmt->execute();
$res = $stmt->get_result();
$conteo = [];
while ($f = $res->fetch_assoc()) {
    $conteo[$f['Tipo']] = (int) $f['Total'];
}
$stmt->close();

json_success([
    'historiaId' => $historiaId,
    'miReaccion' => $quitada ? null : $tipo,
    'conteo' => $conteo,
    'total' => array_sum($conteo),
]);
