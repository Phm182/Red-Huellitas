<?php
/**
 * Se acabaron los segundos del turno en HuePool. Mismo criterio que
 * `soccer_turno_vencido.php`: el servidor valida de verdad que pasó el
 * tiempo desde `turnoEmpezoEn`, nunca confía en que el cliente "dice" que se
 * acabó.
 */
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/juegos.php';
require_once __DIR__ . '/../../funciones/pool.php';

$userId = rh_require_auth($conn);

$desafioId = (int) ($_POST['desafioId'] ?? 0);
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
if ($d['JuegoCodigo'] !== 'huepool' || $d['Modo'] !== 'turnos') {
    json_error('Este duelo no es de HuePool');
}

$retador = (int) $d['UserIdRetador'];
$retado = (int) $d['UserIdRetado'];

if ($userId !== $retador && $userId !== $retado) {
    json_error('Este desafío no es tuyo', 403);
}
if (!in_array($d['Estado'], ['pendiente', 'aceptado'], true)) {
    json_error('Este duelo ya terminó', 409);
}
if (strtotime($d['ExpiraEn']) <= time()) {
    json_error('El desafío venció', 409);
}
if ((int) $d['TurnoDeUserId'] !== $userId) {
    json_error('No es tu turno', 409);
}

$rival = $userId === $retador ? $retado : $retador;

$estado = rh_pool_decodificar($d['Tablero'] ?? '');
if ($estado === null) {
    json_error('Estado inválido', 409);
}

$turnoEmpezoEnAntes = (int) ($estado['turnoEmpezoEn'] ?? time());
$transcurrido = time() - $turnoEmpezoEnAntes;

if ($transcurrido < RH_POOL_SEGUNDOS_POR_TURNO) {
    json_error('Todavía no pasó el tiempo del turno', 409);
}

$duracionTurno = min(RH_POOL_SEGUNDOS_POR_TURNO, $transcurrido);
$segundosNetosAntes = (int) ($estado['segundosNetosUsados'] ?? 0);
$segundosNetos = rh_pool_sumar_segundos_netos($segundosNetosAntes, $duracionTurno);
$terminoPorTiempo = $segundosNetos >= RH_POOL_TOPE_SEGUNDOS_NETOS;

$estado['segundosNetosUsados'] = $segundosNetos;
$estado['turnoEmpezoEn'] = time();
$tablero = rh_pool_codificar($estado);

// Mismo guard de concurrencia que `pool_mover.php`. Persiste el reloj
// SIEMPRE primero, cierre por tiempo o no.
$stmt = $conn->prepare(
    "UPDATE JuegoDesafio SET Tablero = ?
      WHERE DesafioId = ? AND TurnoDeUserId = ? AND Estado IN ('pendiente','aceptado')"
);
$stmt->bind_param('sii', $tablero, $desafioId, $userId);
$stmt->execute();
$afectadas = $stmt->affected_rows;
$stmt->close();

if ($afectadas === 0) {
    json_error('No es tu turno', 409);
}

$progreso = null;
$resultadoPropio = null;

if ($terminoPorTiempo) {
    $grupoJ1 = $estado['grupoJ1'];
    $grupoJ2 = $estado['grupoJ2'];
    $enMesaJ1 = $grupoJ1 !== null ? count(array_filter($estado['bolas'], fn ($b) => $b['enMesa'] && rh_pool_grupo_de((int) $b['n']) === $grupoJ1)) : null;
    $enMesaJ2 = $grupoJ2 !== null ? count(array_filter($estado['bolas'], fn ($b) => $b['enMesa'] && rh_pool_grupo_de((int) $b['n']) === $grupoJ2)) : null;
    $ganador = null;
    if ($enMesaJ1 !== null && $enMesaJ2 !== null && $enMesaJ1 !== $enMesaJ2) {
        $ganador = $enMesaJ1 < $enMesaJ2 ? $retador : $retado;
    }
    $puntosRetador = $ganador === null ? rh_pool_puntos(false) : rh_pool_puntos($ganador === $retador);
    $puntosRetado = $ganador === null ? rh_pool_puntos(false) : rh_pool_puntos($ganador === $retado);
    $d['Tablero'] = $tablero;
    $cierre = rh_juego_cerrar_desafio_turnos($conn, $d, $ganador, $puntosRetador, $puntosRetado);
    $progreso = $userId === $retador ? $cierre['progresoRetador'] : $cierre['progresoRetado'];
    $resultadoPropio = $ganador === null ? 'empate' : ($ganador === $userId ? 'gane' : 'perdiste');
} else {
    rh_juego_avanzar_turno($conn, $desafioId, $rival, $userId, (int) $d['PlazoTurnoSegundos'], $d['JuegoCodigo']);
}

$stmt = $conn->prepare('SELECT * FROM JuegoDesafio WHERE DesafioId = ?');
$stmt->bind_param('i', $desafioId);
$stmt->execute();
$d = $stmt->get_result()->fetch_assoc();
$stmt->close();

json_success([
    'desafio' => rh_juego_serializar_desafio($conn, $d, $userId),
    'resultado' => $resultadoPropio,
    'progreso' => $progreso,
]);
