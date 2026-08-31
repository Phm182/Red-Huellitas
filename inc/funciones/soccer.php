<?php
/**
 * HueSoccer: duelo de física tipo "Soccer Star" — fichas que se empujan con
 * el dedo para meter la pelota en el arco del rival, un tiro por turno.
 *
 * **El cliente que tira simula la física localmente** (no hay ninguna
 * librería de física en el proyecto — todo a mano con Reanimated del lado
 * de la app) y manda acá sólo el estado final: posiciones de reposo de las
 * 10 fichas y la pelota. Este archivo NO reproduce la física — sería
 * muchísimo más código y de todas formas se puede simular igual que
 * cualquier otra cosa hecha en el cliente. Lo único que valida de verdad es
 * la FORMA del estado (recorta cualquier posición fuera de la cancha) y el
 * GOL: mira si la pelota terminó cruzando ENTERA la línea de un arco, con
 * la misma regla que usa el motor de física del cliente (`app-movil/src/
 * juego/huesoccer/motor.ts`), y es el servidor —no un flag mandado por el
 * cliente— quien decide si hubo gol y quién lo hizo. Mismo criterio ya
 * aceptado en el proyecto para `rh_juego_puntaje_valido()`: no impide hacer
 * trampa con la posición de las fichas, pero sí que una trampa arruine el
 * marcador (el gol, lo único que decide quién gana, lo calcula el server).
 */

const RH_SOCCER_ANCHO = 300;
const RH_SOCCER_ALTO = 500;
const RH_SOCCER_RADIO_FICHA = 18;
const RH_SOCCER_RADIO_PELOTA = 10;
/**
 * Meta de goles configurable por partido (pedido del usuario: además del
 * tope de tiempo, poder elegir a cuántos goles termina). Se guarda en el
 * `Tablero` de cada desafío (`metaGoles`, ver `rh_soccer_inicial()`) — este
 * valor es sólo el default para cuando no se elige nada.
 */
const RH_SOCCER_GOLES_PARA_GANAR_DEFAULT = 3;
const RH_SOCCER_GOLES_MIN = 1;
const RH_SOCCER_GOLES_MAX = 10;
/** Ancho del arco, centrado en cada borde angosto — igual que en el motor TS. */
const RH_SOCCER_ANCHO_ARCO = RH_SOCCER_ANCHO * 0.4;
/**
 * Espacio detrás de cada línea de arco, sólo dentro de la franja del arco.
 * A propósito mucho más grande que 2*radioPelota (lo que hace falta para
 * cruzar entera la línea y ya ser gol): es un guard defensivo para casos
 * patológicos, nunca debería intervenir en una jugada real — ver
 * `rh_soccer_gol_en()` y el motor TS.
 */
const RH_SOCCER_PROFUNDIDAD_ARCO = 60;

/** Cuánto tiempo real tiene cada jugador para tirar una vez que le toca. */
const RH_SOCCER_SEGUNDOS_POR_TURNO = 20;
/** Tope de tiempo neto de juego del partido entero, sumado entre los dos. */
const RH_SOCCER_TOPE_SEGUNDOS_NETOS = 180;

/**
 * Tablero inicial: 5 fichas por jugador (2 atrás + 3 adelante, formación
 * espejada) y pelota al centro. Mismo shape EXACTO que
 * `app-movil/src/juego/huesoccer/motor.ts::tableroInicial()` — tienen que
 * coincidir.
 */
function rh_soccer_inicial(int $metaGoles = RH_SOCCER_GOLES_PARA_GANAR_DEFAULT): string
{
    $metaGoles = max(RH_SOCCER_GOLES_MIN, min(RH_SOCCER_GOLES_MAX, $metaGoles));
    $ancho = RH_SOCCER_ANCHO;
    $alto = RH_SOCCER_ALTO;
    $estado = [
        'fichas' => [
            ['j' => 1, 'n' => 0, 'x' => $ancho * 0.35, 'y' => $alto * 0.08],
            ['j' => 1, 'n' => 1, 'x' => $ancho * 0.65, 'y' => $alto * 0.08],
            ['j' => 1, 'n' => 2, 'x' => $ancho * 0.2, 'y' => $alto * 0.24],
            ['j' => 1, 'n' => 3, 'x' => $ancho * 0.5, 'y' => $alto * 0.24],
            ['j' => 1, 'n' => 4, 'x' => $ancho * 0.8, 'y' => $alto * 0.24],
            ['j' => 2, 'n' => 0, 'x' => $ancho * 0.35, 'y' => $alto * 0.92],
            ['j' => 2, 'n' => 1, 'x' => $ancho * 0.65, 'y' => $alto * 0.92],
            ['j' => 2, 'n' => 2, 'x' => $ancho * 0.2, 'y' => $alto * 0.76],
            ['j' => 2, 'n' => 3, 'x' => $ancho * 0.5, 'y' => $alto * 0.76],
            ['j' => 2, 'n' => 4, 'x' => $ancho * 0.8, 'y' => $alto * 0.76],
        ],
        'pelota' => ['x' => $ancho / 2, 'y' => $alto / 2],
        'golesJ1' => 0,
        'golesJ2' => 0,
        'cancha' => [
            'ancho' => $ancho,
            'alto' => $alto,
            'radioFicha' => RH_SOCCER_RADIO_FICHA,
            'radioPelota' => RH_SOCCER_RADIO_PELOTA,
            'profundidadArco' => RH_SOCCER_PROFUNDIDAD_ARCO,
        ],
        'turnoEmpezoEn' => time(),
        'segundosNetosUsados' => 0,
        'metaGoles' => $metaGoles,
    ];
    return json_encode($estado);
}

function rh_soccer_decodificar(string $tablero): ?array
{
    $d = json_decode($tablero, true);
    return is_array($d) ? $d : null;
}

function rh_soccer_codificar(array $estado): string
{
    return json_encode($estado);
}

/** ¿Ese x cae dentro de la franja del arco, centrado en el medio de la cancha? */
function rh_soccer_dentro_de_la_franja(float $x): bool
{
    return abs($x - RH_SOCCER_ANCHO / 2) <= RH_SOCCER_ANCHO_ARCO / 2;
}

/**
 * ¿La posición de la pelota (SIN recortar a la cancha — la posición real
 * donde terminó, que puede estar más allá del límite) es un gol? Devuelve 1
 * si cruzó ENTERA el arco de abajo (gol para el jugador 1, que ataca hacia
 * `y=alto`), 2 si cruzó entera el de arriba, `null` si no.
 *
 * "Entera" = el borde TRASERO de la pelota (el más cercano a la cancha) ya
 * pasó la línea — no alcanza con que el borde delantero la toque. Mismo
 * umbral que usa el motor de física del cliente.
 */
function rh_soccer_gol_en(array $pelota): ?int
{
    $x = (float) ($pelota['x'] ?? 0);
    $y = (float) ($pelota['y'] ?? 0);
    if (!rh_soccer_dentro_de_la_franja($x)) {
        return null;
    }
    $r = RH_SOCCER_RADIO_PELOTA;
    if ($y + $r < 0) {
        return 2;
    }
    if ($y - $r > RH_SOCCER_ALTO) {
        return 1;
    }
    return null;
}

function rh_soccer_clamp(float $v, float $min, float $max): float
{
    return max($min, min($max, $v));
}

/**
 * Valida la FORMA del estado que mandó el cliente (10 fichas con j/n/x/y
 * numéricos, pelota con x/y numéricos) y recorta cualquier posición fuera
 * de la cancha — no rechaza una posición rara, la ajusta a los límites. No
 * valida física: ver el comentario de cabecera del archivo.
 *
 * Devuelve `null` si al estado le falta algo o los tipos no cierran (JSON
 * malformado, no un estado "raro" pero completo).
 */
function rh_soccer_normalizar(array $estadoNuevo): ?array
{
    if (!isset($estadoNuevo['fichas']) || !is_array($estadoNuevo['fichas']) || count($estadoNuevo['fichas']) !== 10) {
        return null;
    }
    if (!isset($estadoNuevo['pelota']) || !is_array($estadoNuevo['pelota'])) {
        return null;
    }

    $rf = RH_SOCCER_RADIO_FICHA;
    $rp = RH_SOCCER_RADIO_PELOTA;
    $ancho = RH_SOCCER_ANCHO;
    $alto = RH_SOCCER_ALTO;
    $fondo = RH_SOCCER_PROFUNDIDAD_ARCO;

    $fichas = [];
    foreach ($estadoNuevo['fichas'] as $f) {
        if (!is_array($f) || !isset($f['j'], $f['n'], $f['x'], $f['y'])) {
            return null;
        }
        $j = (int) $f['j'];
        if ($j !== 1 && $j !== 2) {
            return null;
        }
        $fichas[] = [
            'j' => $j,
            'n' => (int) $f['n'],
            // Las fichas nunca entran a la zona del arco (no la usan): siempre
            // recortadas a la cancha de siempre.
            'x' => rh_soccer_clamp((float) $f['x'], $rf, $ancho - $rf),
            'y' => rh_soccer_clamp((float) $f['y'], $rf, $alto - $rf),
        ];
    }

    if (!isset($estadoNuevo['pelota']['x'], $estadoNuevo['pelota']['y'])) {
        return null;
    }
    // La pelota SIN recortar: hace falta la posición real para decidir el gol
    // (ver rh_soccer_gol_en). El llamador es quien la recorta después, una
    // vez que ya decidió si hubo gol o no.
    $pelotaCruda = [
        'x' => (float) $estadoNuevo['pelota']['x'],
        'y' => (float) $estadoNuevo['pelota']['y'],
    ];
    $enFranja = rh_soccer_dentro_de_la_franja($pelotaCruda['x']);

    return [
        'fichas' => $fichas,
        'pelotaCruda' => $pelotaCruda,
        // Fuera de la franja del arco, recorte de siempre. Dentro de la
        // franja, el rango se extiende hasta el fondo de la red (permite
        // guardar una posición de reposo dentro de la boca del arco sin
        // haber sido gol — ver el motor TS y el comentario de
        // `rh_soccer_gol_en`).
        'pelotaRecortada' => [
            'x' => rh_soccer_clamp($pelotaCruda['x'], $rp, $ancho - $rp),
            'y' => $enFranja
                ? rh_soccer_clamp($pelotaCruda['y'], -$fondo + $rp, $alto + $fondo - $rp)
                : rh_soccer_clamp($pelotaCruda['y'], $rp, $alto - $rp),
        ],
    ];
}

/** Puntos que suma HueSoccer al cerrar el duelo. */
function rh_soccer_puntos(bool $gano): int
{
    return $gano ? 150 : 40;
}

/**
 * Suma `$duracion` (ya clampeada por el llamador a máximo
 * `RH_SOCCER_SEGUNDOS_POR_TURNO`) al acumulado neto del partido, con el
 * tope de `RH_SOCCER_TOPE_SEGUNDOS_NETOS`. Compartida entre
 * `soccer_mover.php` y `soccer_turno_vencido.php` para no duplicar el tope.
 */
function rh_soccer_sumar_segundos_netos(int $segundosNetosAntes, int $duracionSegundos): int
{
    return min(RH_SOCCER_TOPE_SEGUNDOS_NETOS, $segundosNetosAntes + max(0, $duracionSegundos));
}
