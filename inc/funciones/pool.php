<?php
/**
 * HuePool: Bola 8 de HuePlay — mismo criterio que HueSoccer (ver el
 * comentario de cabecera de `soccer.php`): **el cliente que tira simula la
 * física localmente** (motor a mano en `app-movil/src/juego/huepool/
 * motor.ts`, sin librería de física) y manda acá sólo la posición final de
 * cada bola todavía en juego. Este archivo NO reproduce la física — sólo
 * valida la FORMA del estado y deriva, de las posiciones finales, los únicos
 * hechos que de verdad deciden la partida: qué bolas se embocaron este tiro
 * (¿centro dentro del radio de una tronera?, exactamente la misma regla que
 * usa el motor del cliente) y si la blanca se embocó. El resto de la mecánica
 * de Bola 8 (a quién le toca seguir, quién ganó) sale de ese diagnóstico, no
 * de un flag que mande el cliente.
 *
 * **Simplificación documentada, a propósito:** no se valida "primer contacto"
 * (que la blanca haya tocado antes que nada una bola del grupo propio) ni la
 * regla de "alguna bola tiene que tocar una banda si no se embocó nada" —
 * ninguna de las dos se puede derivar sólo de la posición final sin
 * reproducir la física entera, y hacerlo sería mucho más código para una
 * falta que un jugador honesto casi nunca comete a propósito. Lo que sí se
 * valida 100% server-side, porque es lo único que decide la partida: bocha
 * blanca embocada (falta), bola 8 embocada antes de tiempo (pierde
 * automático), y a qué grupo (lisas/rayadas) queda cada jugador.
 */

const RH_POOL_ANCHO = 300;
const RH_POOL_ALTO = 600;
const RH_POOL_RADIO_BOLA = 9;
const RH_POOL_RADIO_TRONERA = 17;

const RH_POOL_SEGUNDOS_POR_TURNO = 25;
const RH_POOL_TOPE_SEGUNDOS_NETOS = 240;

/** Los 3 grupos de HuePool: lisas 1-7, rayadas 9-15, la 8 no es de ningún grupo. */
function rh_pool_grupo_de(int $n): ?string
{
    if ($n >= 1 && $n <= 7) {
        return 'lisas';
    }
    if ($n >= 9 && $n <= 15) {
        return 'rayadas';
    }
    return null; // 0 (blanca) u 8
}

/**
 * Los 6 centros de tronera: 4 esquinas + los 2 medios de banda larga — la
 * mesa es más alta que ancha (300x600), así que la banda larga es la
 * izquierda/derecha, no la de arriba/abajo. Bug real (encontrado probando
 * en el celular): estas coordenadas ponían los 2 del medio en la banda
 * CORTA (arriba/abajo) — arreglado acá y en el mismo lugar del cliente
 * (`app-movil/src/juego/huepool/motor.ts::troneras()`), tienen que
 * coincidir siempre: es lo que decide qué bola se consideró embocada.
 */
function rh_pool_troneras(): array
{
    $a = RH_POOL_ANCHO;
    $h = RH_POOL_ALTO;
    return [
        [0, 0], [$a, 0],
        [0, $h / 2], [$a, $h / 2],
        [0, $h], [$a, $h],
    ];
}

/** ¿El centro de la bola en (x,y) cae dentro de una tronera? Misma regla que el motor TS. */
function rh_pool_embocada(float $x, float $y): bool
{
    foreach (rh_pool_troneras() as [$tx, $ty]) {
        $dx = $x - $tx;
        $dy = $y - $ty;
        if (sqrt($dx * $dx + $dy * $dy) <= RH_POOL_RADIO_TRONERA) {
            return true;
        }
    }
    return false;
}

/**
 * Tablero inicial: triángulo de 15 bolas con la 8 en el centro exacto y una
 * lisa + una rayada en las esquinas de atrás (regla del enunciado). El resto
 * de las posiciones no importa cuál bola específica cae en cuál — sólo que
 * el triángulo quede armado y esas 3 restricciones se cumplan.
 */
function rh_pool_inicial(): string
{
    $ancho = RH_POOL_ANCHO;
    $alto = RH_POOL_ALTO;
    $radio = RH_POOL_RADIO_BOLA;
    $cx = $ancho / 2;
    $espaciado = $radio * 2 + 0.5;
    $alturaFila = $espaciado * sqrt(3) / 2;
    $yApice = $alto * 0.28;

    // Orden de numeración por casillero del triángulo (fila 0 = ápice, más
    // cerca de la blanca; fila 4 = fondo). Fila 2, casillero del medio = 8
    // (el centro exacto de las 15). Fila 4, sus dos extremos = una lisa (1)
    // y una rayada (9) — el resto de los casilleros no tiene una bola
    // específica asignada por la regla, cualquier reparto sirve.
    $numeracion = [
        [2],
        [3, 10],
        [4, 8, 11],
        [5, 12, 6, 13],
        [1, 14, 7, 15, 9],
    ];

    $bolas = [];
    // Bola 0 = blanca, arranca cerca de la banda del jugador que rompe.
    $bolas[] = ['n' => 0, 'x' => $cx, 'y' => $alto * 0.82, 'enMesa' => true];

    foreach ($numeracion as $fila => $numerosFila) {
        $cantidad = count($numerosFila);
        $y = $yApice - $fila * $alturaFila;
        foreach ($numerosFila as $i => $numero) {
            $x = $cx + ($i - ($cantidad - 1) / 2) * $espaciado;
            $bolas[] = ['n' => $numero, 'x' => $x, 'y' => $y, 'enMesa' => true];
        }
    }

    usort($bolas, fn ($a, $b) => $a['n'] <=> $b['n']);

    return json_encode([
        'bolas' => $bolas,
        'mesa' => [
            'ancho' => $ancho,
            'alto' => $alto,
            'radioBola' => $radio,
            'radioTronera' => RH_POOL_RADIO_TRONERA,
        ],
        'grupoJ1' => null,
        'grupoJ2' => null,
        'bolaEnMano' => false,
        'turnoEmpezoEn' => time(),
        'segundosNetosUsados' => 0,
    ]);
}

function rh_pool_decodificar(string $tablero): ?array
{
    $d = json_decode($tablero, true);
    return is_array($d) ? $d : null;
}

function rh_pool_codificar(array $estado): string
{
    return json_encode($estado);
}

/**
 * Valida la FORMA de las bolas que mandó el cliente (todas las que seguían
 * en mesa antes de este tiro, con x/y numéricos) y las recorta a los límites
 * de la mesa — no valida física, ver el comentario de cabecera. Las bolas
 * que ya estaban fuera de mesa ANTES de este tiro se ignoran: una vez
 * embocada, una bola no vuelve a la mesa nunca, pase lo que pase con lo que
 * mande el cliente.
 *
 * @return array<int,array{x:float,y:float}>|null null si la forma no cierra
 */
function rh_pool_normalizar_bolas(array $bolasNuevas, array $bolasAntes): ?array
{
    $enMesaAntes = [];
    foreach ($bolasAntes as $b) {
        if (!isset($b['n'])) {
            return null;
        }
        $enMesaAntes[(int) $b['n']] = (bool) ($b['enMesa'] ?? false);
    }

    $porNumero = [];
    foreach ($bolasNuevas as $b) {
        if (!is_array($b) || !isset($b['n'], $b['x'], $b['y'])) {
            return null;
        }
        $n = (int) $b['n'];
        if ($n < 0 || $n > 15) {
            return null;
        }
        $porNumero[$n] = [
            'x' => (float) $b['x'],
            'y' => (float) $b['y'],
        ];
    }

    $radio = RH_POOL_RADIO_BOLA;
    $ancho = RH_POOL_ANCHO;
    $alto = RH_POOL_ALTO;
    $resultado = [];
    foreach ($enMesaAntes as $n => $estabaEnMesa) {
        if (!$estabaEnMesa) {
            continue; // ya estaba embocada: no importa lo que mande el cliente
        }
        if (!isset($porNumero[$n])) {
            return null; // faltó reportar una bola que seguía en juego
        }
        $resultado[$n] = [
            'x' => max($radio, min($ancho - $radio, $porNumero[$n]['x'])),
            'y' => max($radio, min($alto - $radio, $porNumero[$n]['y'])),
        ];
    }

    return $resultado;
}

/** Puntos por duelo — mismo orden de magnitud que rh_soccer_puntos(). */
function rh_pool_puntos(bool $gano): int
{
    return $gano ? 150 : 40;
}

function rh_pool_sumar_segundos_netos(int $segundosNetosAntes, int $duracionSegundos): int
{
    return min(RH_POOL_TOPE_SEGUNDOS_NETOS, $segundosNetosAntes + max(0, $duracionSegundos));
}
