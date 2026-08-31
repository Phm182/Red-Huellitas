<?php
/**
 * Un tiro de HueSoccer: el cliente ya simuló la física localmente (ver
 * inc/funciones/soccer.php para por qué) y manda acá el estado final de las
 * 10 fichas y la pelota. El servidor recorta cualquier posición fuera de la
 * cancha, decide por su cuenta si hubo gol (no confía en un flag del
 * cliente), controla el reloj de turno/tope de partido, y persiste.
 */
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/juegos.php';
require_once __DIR__ . '/../../funciones/soccer.php';

$userId = rh_require_auth($conn);

$desafioId = (int) ($_POST['desafioId'] ?? 0);
$tableroNuevoRaw = $_POST['tableroNuevo'] ?? '';

if ($desafioId <= 0) {
    json_error('Falta desafioId');
}

$estadoPropuesto = is_string($tableroNuevoRaw) ? json_decode($tableroNuevoRaw, true) : null;
if (!is_array($estadoPropuesto)) {
    json_error('Falta o es inválido tableroNuevo');
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

$normalizado = rh_soccer_normalizar($estadoPropuesto);
if ($normalizado === null) {
    json_error('Estado inválido', 409);
}

$anterior = rh_soccer_decodificar($d['Tablero'] ?? '') ?? [];
$golesJ1Antes = (int) ($anterior['golesJ1'] ?? 0);
$golesJ2Antes = (int) ($anterior['golesJ2'] ?? 0);
$cancha = $anterior['cancha'] ?? [
    'ancho' => RH_SOCCER_ANCHO,
    'alto' => RH_SOCCER_ALTO,
    'radioFicha' => RH_SOCCER_RADIO_FICHA,
    'radioPelota' => RH_SOCCER_RADIO_PELOTA,
    'profundidadArco' => RH_SOCCER_PROFUNDIDAD_ARCO,
];
$turnoEmpezoEnAntes = (int) ($anterior['turnoEmpezoEn'] ?? time());
$segundosNetosAntes = (int) ($anterior['segundosNetosUsados'] ?? 0);

// El gol lo decide el servidor mirando la posición REAL donde terminó la
// pelota (antes de recortarla a la cancha) — ver rh_soccer_gol_en().
$golDe = rh_soccer_gol_en($normalizado['pelotaCruda']);

$golesJ1 = $golesJ1Antes + ($golDe === 1 ? 1 : 0);
$golesJ2 = $golesJ2Antes + ($golDe === 2 ? 1 : 0);

// Después de gol, saque automático: la pelota vuelve al centro. Si no hubo
// gol, se guarda recortada a los límites de la cancha (o de la boca del
// arco, si quedó ahí sin cruzar del todo — ver rh_soccer_normalizar()).
$pelotaFinal = $golDe !== null
    ? ['x' => $cancha['ancho'] / 2, 'y' => $cancha['alto'] / 2]
    : $normalizado['pelotaRecortada'];

// Reloj: cuánto duró este turno (clampeado a los 20s de siempre — un
// request que tardó en llegar al server no debe inflar de más el
// acumulado), sumado al tope compartido del partido.
$duracionTurno = min(RH_SOCCER_SEGUNDOS_POR_TURNO, max(0, time() - $turnoEmpezoEnAntes));
$segundosNetos = rh_soccer_sumar_segundos_netos($segundosNetosAntes, $duracionTurno);

$movimientos = (int) $d['Movimientos'] + 1;

// j:1 en el tablero es siempre el retador (mismo criterio que 'miFicha' en
// rh_juego_serializar_desafio: '1' retador, '2' retado).
// Prioridad 1: llegar a los goles necesarios cierra el partido, aunque el
// mismo tiro también hubiera agotado el reloj neto.
$ganoPorGoles = $golesJ1 >= RH_SOCCER_GOLES_PARA_GANAR || $golesJ2 >= RH_SOCCER_GOLES_PARA_GANAR;
// Prioridad 2 (sólo si no ganó por goles): se acabó el tiempo neto del
// partido — gana quien tenga más goles ahora mismo, empate si están igual.
$terminoPorTiempo = !$ganoPorGoles && $segundosNetos >= RH_SOCCER_TOPE_SEGUNDOS_NETOS;

$estadoGuardar = [
    'fichas' => $normalizado['fichas'],
    'pelota' => $pelotaFinal,
    'golesJ1' => $golesJ1,
    'golesJ2' => $golesJ2,
    'cancha' => $cancha,
    // Si el partido sigue, arranca el reloj del próximo turno; si se cierra
    // acá mismo estos dos campos ya no importan, pero se guardan igual por
    // consistencia del shape.
    'turnoEmpezoEn' => time(),
    'segundosNetosUsados' => $segundosNetos,
];
$tablero = rh_soccer_codificar($estadoGuardar);

// Guard de concurrencia: si dos tiros llegaran a la vez, el segundo no
// encuentra fila con ese TurnoDeUserId y se rechaza.
$stmt = $conn->prepare(
    "UPDATE JuegoDesafio SET Tablero = ?, Movimientos = ?
      WHERE DesafioId = ? AND TurnoDeUserId = ? AND Estado IN ('pendiente','aceptado')"
);
$stmt->bind_param('siii', $tablero, $movimientos, $desafioId, $userId);
$stmt->execute();
$afectadas = $stmt->affected_rows;
$stmt->close();

if ($afectadas === 0) {
    json_error('No es tu turno', 409);
}

$progreso = null;
// null = el partido sigue.
$resultadoPropio = null;

if ($ganoPorGoles) {
    $ganador = $golesJ1 >= RH_SOCCER_GOLES_PARA_GANAR ? $retador : $retado;
    $puntosRetador = rh_soccer_puntos($ganador === $retador);
    $puntosRetado = rh_soccer_puntos($ganador === $retado);
    $d['Tablero'] = $tablero;
    $cierre = rh_juego_cerrar_desafio_turnos($conn, $d, $ganador, $puntosRetador, $puntosRetado);
    $progreso = $userId === $retador ? $cierre['progresoRetador'] : $cierre['progresoRetado'];
    $resultadoPropio = $ganador === $userId ? 'gane' : 'perdiste';
} elseif ($terminoPorTiempo) {
    $ganador = $golesJ1 === $golesJ2 ? null : ($golesJ1 > $golesJ2 ? $retador : $retado);
    $puntosRetador = $ganador === null ? rh_soccer_puntos(false) : rh_soccer_puntos($ganador === $retador);
    $puntosRetado = $ganador === null ? rh_soccer_puntos(false) : rh_soccer_puntos($ganador === $retado);
    $d['Tablero'] = $tablero;
    $cierre = rh_juego_cerrar_desafio_turnos($conn, $d, $ganador, $puntosRetador, $puntosRetado);
    $progreso = $userId === $retador ? $cierre['progresoRetador'] : $cierre['progresoRetado'];
    $resultadoPropio = $ganador === null ? 'empate' : ($ganador === $userId ? 'gane' : 'perdiste');
} else {
    rh_juego_avanzar_turno($conn, $desafioId, $rival, $userId, (int) $d['PlazoTurnoMinutos']);
    rh_notificar($conn, [$rival], 'juego_desafio', 'Te toca jugar',
        rh_juego_nombre($conn, $userId) . ' ya tiró en HueSoccer', '/(app)/hueplay/desafios',
        ['actorUserId' => $userId]);
}

$stmt = $conn->prepare('SELECT * FROM JuegoDesafio WHERE DesafioId = ?');
$stmt->bind_param('i', $desafioId);
$stmt->execute();
$d = $stmt->get_result()->fetch_assoc();
$stmt->close();

json_success([
    'desafio' => rh_juego_serializar_desafio($conn, $d, $userId),
    'gol' => $golDe,
    'resultado' => $resultadoPropio,
    'progreso' => $progreso,
]);
