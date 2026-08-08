<?php
/**
 * Bandeja de salas: invitaciones pendientes, salas armándose, en las que te
 * toca jugar, en las que esperás a otro, y las terminadas.
 */
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/juegos.php';
require_once __DIR__ . '/../../funciones/salas.php';

$userId = rh_require_auth($conn);

rh_salas_expirar($conn, $userId);

$stmt = $conn->prepare(
    "SELECT DISTINCT s.* FROM JuegoSala s
      INNER JOIN JuegoSalaJugador sj ON sj.SalaId = s.SalaId
     WHERE sj.UserId = ? AND sj.Estado <> 'rechazado' AND s.Estado <> 'cancelada'
     ORDER BY s.CreatedAt DESC
     LIMIT 60"
);
$stmt->bind_param('i', $userId);
$stmt->execute();
$salas = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
$stmt->close();

$invitaciones = [];
$armando = [];
$miTurno = [];
$esperando = [];
$terminadas = [];

foreach ($salas as $sala) {
    $salaId = (int) $sala['SalaId'];
    $jugadores = rh_sala_jugadores($conn, $salaId);
    $item = rh_sala_serializar($conn, $sala, $jugadores, $userId);

    $miAsiento = null;
    foreach ($jugadores as $j) {
        if ((int) $j['UserId'] === $userId) {
            $miAsiento = $j;
            break;
        }
    }

    if ($sala['Estado'] === 'terminada') {
        $terminadas[] = $item;
    } elseif ($miAsiento && $miAsiento['Estado'] === 'invitado') {
        $invitaciones[] = $item;
    } elseif ($sala['Estado'] === 'esperando') {
        $armando[] = $item;
    } elseif ($item['esMiTurno']) {
        $miTurno[] = $item;
    } else {
        $esperando[] = $item;
    }
}

json_success([
    'invitaciones' => $invitaciones,
    'armando' => $armando,
    'miTurno' => $miTurno,
    'esperando' => $esperando,
    'terminadas' => $terminadas,
]);
