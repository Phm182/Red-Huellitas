<?php
/**
 * Un tiro de HuePool: el cliente ya simuló la física localmente (ver
 * inc/funciones/pool.php para por qué) y manda acá la posición final de
 * cada bola que seguía en mesa. El servidor recorta cualquier posición fuera
 * de la mesa, decide por su cuenta qué bolas se embocaron (mirando si el
 * centro de cada una cayó dentro de una tronera, no un flag del cliente), y
 * de ahí deriva toda la mecánica de Bola 8: asignación de grupo, si sigue
 * tirando el mismo jugador, falta (blanca embocada) y quién ganó.
 */
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/juegos.php';
require_once __DIR__ . '/../../funciones/pool.php';

$userId = rh_require_auth($conn);

$desafioId = (int) ($_POST['desafioId'] ?? 0);
$bolasRaw = $_POST['bolas'] ?? '';
$impulsoRaw = $_POST['impulso'] ?? null;

if ($desafioId <= 0) {
    json_error('Falta desafioId');
}

$bolasNuevas = is_string($bolasRaw) ? json_decode($bolasRaw, true) : null;
if (!is_array($bolasNuevas)) {
    json_error('Falta o es inválido bolas');
}

// Sólo para que el rival pueda reproducir la física real de este tiro
// (`hueplay.pool.tsx`, si tiene la preferencia activada) — nunca se usa acá
// para decidir el resultado, así que no hace falta validarlo a fondo.
$impulso = null;
if (is_string($impulsoRaw)) {
    $decodificado = json_decode($impulsoRaw, true);
    if (is_array($decodificado) && isset($decodificado['x'], $decodificado['y']) && is_numeric($decodificado['x']) && is_numeric($decodificado['y'])) {
        $impulso = ['x' => (float) $decodificado['x'], 'y' => (float) $decodificado['y']];
    }
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
$miLado = $userId === $retador ? 1 : 2;

$estado = rh_pool_decodificar($d['Tablero'] ?? '');
if ($estado === null) {
    json_error('Estado inválido', 409);
}

$normalizadas = rh_pool_normalizar_bolas($bolasNuevas, $estado['bolas']);
if ($normalizadas === null) {
    json_error('Faltan bolas en el estado que mandaste', 409);
}

// Qué bolas seguían en mesa antes de este tiro y cuáles de esas cayeron en
// una tronera con la posición nueva — el único hecho que decide la
// mecánica, calculado acá, nunca confiado al cliente.
$enMesaAntes = [];
foreach ($estado['bolas'] as $b) {
    $enMesaAntes[(int) $b['n']] = (bool) $b['enMesa'];
}

$embocadasEsteTiro = [];
$bolasNuevoEstado = [];
foreach ($estado['bolas'] as $b) {
    $n = (int) $b['n'];
    if (!$enMesaAntes[$n]) {
        $bolasNuevoEstado[] = $b; // ya estaba embocada de antes, no se toca
        continue;
    }
    $pos = $normalizadas[$n];
    $embocada = rh_pool_embocada($pos['x'], $pos['y']);
    if ($embocada) {
        $embocadasEsteTiro[] = $n;
        $bolasNuevoEstado[] = ['n' => $n, 'x' => $pos['x'], 'y' => $pos['y'], 'enMesa' => false];
    } else {
        $bolasNuevoEstado[] = ['n' => $n, 'x' => $pos['x'], 'y' => $pos['y'], 'enMesa' => true];
    }
}

$blancaEmbocada = in_array(0, $embocadasEsteTiro, true);
$ochoEmbocada = in_array(8, $embocadasEsteTiro, true);
$esTiroDeRompimiento = (int) $d['Movimientos'] === 0;

$grupoJ1 = $estado['grupoJ1'];
$grupoJ2 = $estado['grupoJ2'];
$mesaAbierta = $grupoJ1 === null;

// Asignación de grupo: sólo si la mesa seguía abierta y no es el saque (regla
// del enunciado: en el saque, aunque se emboque algo, la mesa sigue
// abierta). Se asigna si TODAS las bolas de grupo embocadas este tiro son
// del mismo grupo — si se mezclaron lisas y rayadas en la misma jugada, la
// mesa se queda abierta.
if ($mesaAbierta && !$esTiroDeRompimiento) {
    $gruposEmbocados = array_values(array_unique(array_filter(
        array_map('rh_pool_grupo_de', $embocadasEsteTiro)
    )));
    if (count($gruposEmbocados) === 1) {
        $miGrupoNuevo = $gruposEmbocados[0];
        $rivalGrupoNuevo = $miGrupoNuevo === 'lisas' ? 'rayadas' : 'lisas';
        if ($miLado === 1) {
            $grupoJ1 = $miGrupoNuevo;
            $grupoJ2 = $rivalGrupoNuevo;
        } else {
            $grupoJ2 = $miGrupoNuevo;
            $grupoJ1 = $rivalGrupoNuevo;
        }
    }
}

$miGrupo = $miLado === 1 ? $grupoJ1 : $grupoJ2;

// ¿Me queda alguna bola de mi grupo en mesa DESPUÉS de este tiro? Si los
// grupos siguen sin asignar, no puede haber terminado el mío todavía.
$meQuedanDeMiGrupo = true;
if ($miGrupo !== null) {
    $meQuedanDeMiGrupo = false;
    foreach ($bolasNuevoEstado as $b) {
        if ($b['enMesa'] && rh_pool_grupo_de((int) $b['n']) === $miGrupo) {
            $meQuedanDeMiGrupo = true;
            break;
        }
    }
}

$terminada = false;
$ganeYo = false;
$falta = false;

if ($ochoEmbocada) {
    $terminada = true;
    // Gano si ya no me quedaba ninguna de mi grupo y no hice falta (blanca
    // embocada en el mismo tiro) — meter la 8 en cualquier otro caso pierde.
    $ganeYo = !$meQuedanDeMiGrupo && !$blancaEmbocada;
} elseif ($blancaEmbocada) {
    $falta = true;
}

// Reloj: cuánto duró este turno, sumado al tope compartido del partido.
$turnoEmpezoEnAntes = (int) ($estado['turnoEmpezoEn'] ?? time());
$duracionTurno = min(RH_POOL_SEGUNDOS_POR_TURNO, max(0, time() - $turnoEmpezoEnAntes));
$segundosNetos = rh_pool_sumar_segundos_netos((int) ($estado['segundosNetosUsados'] ?? 0), $duracionTurno);
$terminoPorTiempo = !$terminada && $segundosNetos >= RH_POOL_TOPE_SEGUNDOS_NETOS;

$movimientos = (int) $d['Movimientos'] + 1;

if ($falta) {
    // Falta: la blanca vuelve al medio de la mesa (posición de reposo
    // neutra), y el rival arranca su turno con bola en mano.
    foreach ($bolasNuevoEstado as &$b) {
        if ($b['n'] === 0) {
            $b['x'] = RH_POOL_ANCHO / 2;
            $b['y'] = RH_POOL_ALTO / 2;
            $b['enMesa'] = true;
        }
    }
    unset($b);
}

$estadoGuardar = [
    'bolas' => $bolasNuevoEstado,
    'mesa' => $estado['mesa'],
    'grupoJ1' => $grupoJ1,
    'grupoJ2' => $grupoJ2,
    'bolaEnMano' => $falta,
    'turnoEmpezoEn' => time(),
    'segundosNetosUsados' => $segundosNetos,
    'ultimoImpulso' => $impulso,
];
$tablero = rh_pool_codificar($estadoGuardar);

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
$resultadoPropio = null;

if ($terminada) {
    $ganador = $ganeYo ? $userId : $rival;
    $puntosRetador = rh_pool_puntos($ganador === $retador);
    $puntosRetado = rh_pool_puntos($ganador === $retado);
    $d['Tablero'] = $tablero;
    $cierre = rh_juego_cerrar_desafio_turnos($conn, $d, $ganador, $puntosRetador, $puntosRetado);
    $progreso = $userId === $retador ? $cierre['progresoRetador'] : $cierre['progresoRetado'];
    $resultadoPropio = $ganeYo ? 'gane' : 'perdiste';
} elseif ($terminoPorTiempo) {
    // Se acabó el tiempo neto del partido: gana quien tenga menos bolas
    // propias en mesa (más avanzado); empate si están igual o los grupos
    // nunca llegaron a asignarse.
    $enMesaJ1 = $grupoJ1 !== null ? count(array_filter($bolasNuevoEstado, fn ($b) => $b['enMesa'] && rh_pool_grupo_de((int) $b['n']) === $grupoJ1)) : null;
    $enMesaJ2 = $grupoJ2 !== null ? count(array_filter($bolasNuevoEstado, fn ($b) => $b['enMesa'] && rh_pool_grupo_de((int) $b['n']) === $grupoJ2)) : null;
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
} elseif ($falta) {
    rh_juego_avanzar_turno($conn, $desafioId, $rival, $userId, (int) $d['PlazoTurnoSegundos'], $d['JuegoCodigo']);
    rh_notificar($conn, [$rival], 'juego_desafio', '¡Bola en mano!',
        rh_juego_nombre($conn, $userId) . ' hizo falta en HuePool: tenés la blanca libre', rh_hueplay_ruta_duelo($d['JuegoCodigo'], $desafioId),
        ['actorUserId' => $userId, 'juegoCodigo' => $d['JuegoCodigo']]);
} else {
    // ¿Sigo tirando? Sólo si embolsé al menos una de mi propio grupo este
    // tiro (con los grupos ya asignados) o, en el saque, cualquier bola.
    $sigoTirando = false;
    if ($esTiroDeRompimiento) {
        $sigoTirando = count($embocadasEsteTiro) > 0;
    } elseif ($miGrupo !== null) {
        foreach ($embocadasEsteTiro as $n) {
            if (rh_pool_grupo_de($n) === $miGrupo) {
                $sigoTirando = true;
                break;
            }
        }
    }

    if (!$sigoTirando) {
        rh_juego_avanzar_turno($conn, $desafioId, $rival, $userId, (int) $d['PlazoTurnoSegundos'], $d['JuegoCodigo']);
        rh_notificar($conn, [$rival], 'juego_desafio', 'Te toca jugar',
            rh_juego_nombre($conn, $userId) . ' ya tiró en HuePool', rh_hueplay_ruta_duelo($d['JuegoCodigo'], $desafioId),
            ['actorUserId' => $userId, 'juegoCodigo' => $d['JuegoCodigo']]);
    }
    // Si sigo tirando, no hace falta tocar TurnoDeUserId: ya es el mío.
}

$stmt = $conn->prepare('SELECT * FROM JuegoDesafio WHERE DesafioId = ?');
$stmt->bind_param('i', $desafioId);
$stmt->execute();
$d = $stmt->get_result()->fetch_assoc();
$stmt->close();

json_success([
    'desafio' => rh_juego_serializar_desafio($conn, $d, $userId),
    'embocadas' => $embocadasEsteTiro,
    'falta' => $falta,
    'resultado' => $resultadoPropio,
    'progreso' => $progreso,
]);
