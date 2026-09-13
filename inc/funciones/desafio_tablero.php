<?php
/**
 * Piezas compartidas entre `desafio_crear.php` (retar a alguien puntual) y
 * `sala_iniciar.php` (arrancar una sala de duelo): qué juegos se juegan 1v1
 * y cómo se arma el tablero inicial de un duelo por turnos.
 *
 * Vive en un archivo aparte —y no en `juegos.php`— para no tener que tocar
 * ese archivo, que en producción está más atrasado que el repo.
 */
require_once __DIR__ . '/hueconecta.php';
require_once __DIR__ . '/damas.php';
require_once __DIR__ . '/ajedrez.php';
require_once __DIR__ . '/soccer.php';
require_once __DIR__ . '/reversi.php';
require_once __DIR__ . '/tateti.php';
require_once __DIR__ . '/pool.php';

/**
 * Juegos que se pueden jugar 1 contra 1 (por turnos o por puntaje). Es el
 * espejo de la constante `CODIGOS` de `app-movil/.../retar.tsx`: cualquier
 * juego que se pueda retar, se puede armar como sala de duelo o como
 * torneo. Los de puntaje (incluido `huepacman`) compiten por quién saca más
 * puntos, sin tablero compartido. El único que queda afuera es HueGotchi:
 * no se juega por partidas, así que no hay un número que comparar.
 */
const RH_JUEGOS_DUELO = [
    'huematch', 'huememo', 'huetrivia', 'huezip', 'huepacman', 'huetetris', 'huecolumns',
    'hueconecta', 'huedamas', 'hueajedrez', 'huereversi', 'huetateti', 'huesoccer', 'huepool',
    'huedoku6', 'huedoku9facil', 'huedoku9dificil',
];

function rh_juego_es_duelo(string $codigo): bool
{
    return in_array($codigo, RH_JUEGOS_DUELO, true);
}

/**
 * Tablero inicial + de quién es el turno para un duelo por turnos.
 *
 * Quién arranca sale de la paridad de la semilla, no de "siempre el que
 * invita": en un juego de turnos mover primero es ventaja real, así que
 * dejársela siempre al retador convertiría el botón en un premio.
 *
 * @param array $opts  Opcional. `metaGoles` para HueSoccer.
 * @return array{tablero: string, turnoDe: int}
 */
function rh_desafio_tablero_inicial(string $codigo, int $retadorId, int $retadoId, int $semilla, array $opts = []): array
{
    if ($codigo === 'huedamas') {
        $tablero = rh_damas_inicial();
    } elseif ($codigo === 'hueajedrez') {
        $tablero = rh_ajedrez_inicial();
    } elseif ($codigo === 'huereversi') {
        $tablero = rh_reversi_inicial();
    } elseif ($codigo === 'huetateti') {
        $tablero = rh_tateti_inicial();
    } elseif ($codigo === 'huepool') {
        $tablero = rh_pool_inicial();
    } elseif ($codigo === 'huesoccer') {
        $meta = (int) ($opts['metaGoles'] ?? RH_SOCCER_GOLES_PARA_GANAR_DEFAULT);
        if ($meta < RH_SOCCER_GOLES_MIN || $meta > RH_SOCCER_GOLES_MAX) {
            $meta = RH_SOCCER_GOLES_PARA_GANAR_DEFAULT;
        }
        $tablero = rh_soccer_inicial($meta);
    } else {
        $tablero = rh_c4_vacio();
    }

    return [
        'tablero' => $tablero,
        'turnoDe' => $semilla % 2 === 0 ? $retadorId : $retadoId,
    ];
}
