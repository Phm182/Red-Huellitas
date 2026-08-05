<?php
/**
 * Bandeja de desafíos: los que tenés que jugar, los que esperan al rival y el
 * historial de los terminados.
 */
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/juegos.php';

$userId = rh_require_auth($conn);

rh_juego_expirar_desafios($conn, $userId);

$stmt = $conn->prepare(
    "SELECT * FROM JuegoDesafio
      WHERE (UserIdRetador = ? OR UserIdRetado = ?)
        AND Estado <> 'rechazado'
      ORDER BY CreatedAt DESC
      LIMIT 60"
);
$stmt->bind_param('ii', $userId, $userId);
$stmt->execute();
$res = $stmt->get_result();

$miTurno = [];
$esperando = [];
$terminados = [];

while ($d = $res->fetch_assoc()) {
    $item = rh_juego_serializar_desafio($conn, $d, $userId);

    if ($d['Estado'] === 'terminado' || $d['Estado'] === 'expirado') {
        $terminados[] = $item;
    } elseif ($item['esMiTurno']) {
        // `esMiTurno` ya distingue los dos modos: en 'puntaje' es "todavía no
        // jugaste" y en 'turnos' es "el turno apunta a vos".
        $miTurno[] = $item;
    } else {
        $esperando[] = $item;
    }
}
$stmt->close();

json_success([
    'miTurno' => $miTurno,
    'esperando' => $esperando,
    'terminados' => $terminados,
]);
