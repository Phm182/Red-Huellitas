<?php
/**
 * Se acabaron los 20 segundos del turno: el cliente activo lo llama al
 * llegar a 0 en su cronómetro local (mismo patrón que `huezip.tsx`), pero
 * el servidor es quien valida de verdad que pasaron ≥20 segundos desde
 * `turnoEmpezoEn` — nunca confía en que el cliente "dice" que se acabó el
 * tiempo (mismo criterio que toda la física de HueSoccer). Importa
 * rechazar un skip prematuro porque el tope de 3 minutos netos es
 * COMPARTIDO entre los dos jugadores: si alguien pudiera "pasar" su turno
 * instantáneamente, podría manipular a su favor cuánto del presupuesto
 * compartido consume cada uno.
 */
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/juegos.php';
require_once __DIR__ . '/../../funciones/soccer.php';

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
if ($d['JuegoCodigo'] !== 'huesoccer' || $d['Modo'] !== 'turnos') {
    json_error('Este duelo no es de HueSoccer');
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

$estado = rh_soccer_decodificar($d['Tablero'] ?? '');
if ($estado === null) {
    json_error('Estado inválido', 409);
}

$turnoEmpezoEnAntes = (int) ($estado['turnoEmpezoEn'] ?? time());
$transcurrido = time() - $turnoEmpezoEnAntes;

if ($transcurrido < RH_SOCCER_SEGUNDOS_POR_TURNO) {
    json_error('Todavía no pasaron los 20 segundos', 409);
}

$duracionTurno = min(RH_SOCCER_SEGUNDOS_POR_TURNO, $transcurrido);
$segundosNetosAntes = (int) ($estado['segundosNetosUsados'] ?? 0);
$segundosNetos = rh_soccer_sumar_segundos_netos($segundosNetosAntes, $duracionTurno);
$golesJ1 = (int) ($estado['golesJ1'] ?? 0);
$golesJ2 = (int) ($estado['golesJ2'] ?? 0);

$terminoPorTiempo = $segundosNetos >= RH_SOCCER_TOPE_SEGUNDOS_NETOS;

$estado['segundosNetosUsados'] = $segundosNetos;
$estado['turnoEmpezoEn'] = time();
$tablero = rh_soccer_codificar($estado);

// Se persiste el Tablero con el reloj actualizado SIEMPRE primero, cierre
// por tiempo o no — si esto quedara sólo dentro de una de las dos ramas
// (como pasaba en una versión anterior de este archivo), el partido podía
// cerrarse bien en Estado/GanadorUserId pero dejar el JSON del tablero con
// el `segundosNetosUsados` viejo, sin reflejar el acumulado real. No
// incrementa `Movimientos` (no hubo tiro real; nada del frontend depende
// de eso para saber de quién es el turno, sólo de `TurnoDeUserId`). Mismo
// guard de concurrencia que `soccer_mover.php`.
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
    $ganador = $golesJ1 === $golesJ2 ? null : ($golesJ1 > $golesJ2 ? $retador : $retado);
    $puntosRetador = $ganador === null ? rh_soccer_puntos(false) : rh_soccer_puntos($ganador === $retador);
    $puntosRetado = $ganador === null ? rh_soccer_puntos(false) : rh_soccer_puntos($ganador === $retado);
    $d['Tablero'] = $tablero;
    $cierre = rh_juego_cerrar_desafio_turnos($conn, $d, $ganador, $puntosRetador, $puntosRetado);
    $progreso = $userId === $retador ? $cierre['progresoRetador'] : $cierre['progresoRetado'];
    $resultadoPropio = $ganador === null ? 'empate' : ($ganador === $userId ? 'gane' : 'perdiste');
} else {
    // Sin notificación push específica de "se te acabó el tiempo": decisión
    // a propósito, ver comentario de cabecera. rh_juego_avanzar_turno() ya
    // notifica al rival "te toca jugar", que alcanza.
    rh_juego_avanzar_turno($conn, $desafioId, $rival, $userId, (int) $d['PlazoTurnoMinutos']);
}

$stmt = $conn->prepare('SELECT * FROM JuegoDesafio WHERE DesafioId = ?');
$stmt->bind_param('i', $desafioId);
$stmt->execute();
$d = $stmt->get_result()->fetch_assoc();
$stmt->close();

json_success([
    'desafio' => rh_juego_serializar_desafio($conn, $d, $userId),
    'gol' => null,
    'resultado' => $resultadoPropio,
    'progreso' => $progreso,
]);
