<?php
/**
 * Estado actual de un duelo de HueTaTeTi. Mirror de `reversi_ver.php`: además
 * del desafío serializado, manda `movimientosLegales` (acá simplemente todas
 * las celdas vacías) para que el cliente sepa dónde puede tocar.
 */
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/juegos.php';
require_once __DIR__ . '/../../funciones/tateti.php';

$userId = rh_require_auth($conn);

$desafioId = (int) ($_GET['desafioId'] ?? 0);
if ($desafioId <= 0) {
    json_error('Falta desafioId');
}

$stmt = $conn->prepare('SELECT * FROM JuegoDesafio WHERE DesafioId = ?');
$stmt->bind_param('i', $desafioId);
$stmt->execute();
$d = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!$d) {
    json_error('El desafío no existe', 404);
}
if ($d['JuegoCodigo'] !== 'huetateti') {
    json_error('Ese desafío no es de HueTaTeTi');
}
if ((int) $d['UserIdRetador'] !== $userId && (int) $d['UserIdRetado'] !== $userId) {
    json_error('Este desafío no es tuyo', 403);
}

$tablero = $d['Tablero'] ?? '';
$soyRetador = (int) $d['UserIdRetador'] === $userId;
$miLado = $soyRetador ? 1 : 2;
$esMiTurno = (int) ($d['TurnoDeUserId'] ?? 0) === $userId && in_array($d['Estado'], ['pendiente', 'aceptado'], true);

json_success([
    'desafio' => rh_juego_serializar_desafio($conn, $d, $userId),
    'movimientosLegales' => ($tablero !== '' && $esMiTurno) ? rh_tateti_movimientos_legales($tablero, $miLado) : [],
]);
