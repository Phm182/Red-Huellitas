<?php
/**
 * HueTrivia: preguntas de cuidado animal.
 *
 * Dos cosas que definen el diseño:
 *
 * 1. **La respuesta correcta nunca sale del servidor.** El cliente recibe las 4
 *    opciones y devuelve cuál eligió; corregir es tarea de `trivia_responder`.
 *    Si mandáramos la correcta para corregir en el celular, ver la respuesta
 *    sería abrir las herramientas de red.
 *
 * 2. **Las opciones se barajan.** En la base, la correcta está guardada siempre
 *    en `OpcionA` (es más fácil de escribir y revisar así). Servirlas en ese
 *    orden haría que tocar siempre la primera diera 10 de 10. El barajado es
 *    determinístico por semilla, así que en un duelo los dos jugadores ven las
 *    mismas preguntas **y en el mismo orden**.
 */

/** Preguntas por partida. */
const RH_TRIVIA_PREGUNTAS = 10;

/** Segundos por pregunta. */
const RH_TRIVIA_SEGUNDOS = 15;

/**
 * Idioma efectivo: el pedido si hay preguntas cargadas, si no español.
 *
 * Hoy sólo están cargados es/en. Un idioma sin preguntas cae a español en vez
 * de mostrar una pantalla vacía: una pregunta en otro idioma se entiende o se
 * saltea, una pantalla en blanco parece que la app está rota.
 */
function rh_trivia_idioma(mysqli $conn, string $pedido): string
{
    $pedido = strtolower(substr($pedido, 0, 2));
    if ($pedido === '') {
        return 'es';
    }

    $stmt = $conn->prepare("SELECT COUNT(*) AS N FROM TriviaPregunta WHERE Idioma = ? AND Estado = 'A'");
    $stmt->bind_param('s', $pedido);
    $stmt->execute();
    $n = (int) ($stmt->get_result()->fetch_assoc()['N'] ?? 0);
    $stmt->close();

    return $n >= RH_TRIVIA_PREGUNTAS ? $pedido : 'es';
}

/**
 * Las claves sorteadas para una semilla.
 *
 * Se sortean **claves** y no filas: así un duelo entre alguien en español y
 * alguien en inglés recibe las mismas preguntas, cada uno en su idioma.
 *
 * El orden sale de `MD5(clave + semilla)`, que es estable: la misma semilla
 * devuelve siempre la misma lista, sin guardar nada.
 */
function rh_trivia_claves(mysqli $conn, int $semilla): array
{
    $res = $conn->query("SELECT DISTINCT Clave FROM TriviaPregunta WHERE Estado = 'A'");
    $claves = [];
    while ($f = $res->fetch_assoc()) {
        $claves[] = $f['Clave'];
    }

    usort($claves, static function ($a, $b) use ($semilla) {
        return strcmp(md5($a . '|' . $semilla), md5($b . '|' . $semilla));
    });

    return array_slice($claves, 0, RH_TRIVIA_PREGUNTAS);
}

/**
 * Orden barajado de las 4 opciones para una clave y semilla dadas.
 *
 * @return string[] por ejemplo ['C','A','D','B']
 */
function rh_trivia_orden(string $clave, int $semilla): array
{
    $letras = ['A', 'B', 'C', 'D'];
    usort($letras, static function ($x, $y) use ($clave, $semilla) {
        return strcmp(md5($clave . $x . $semilla), md5($clave . $y . $semilla));
    });
    return $letras;
}

/**
 * Las preguntas de una partida, listas para mandar al cliente.
 *
 * Nunca incluye `Correcta` ni `Explicacion`: la explicación se manda recién al
 * corregir, porque antes sería una pista.
 */
function rh_trivia_preguntas(mysqli $conn, int $semilla, string $idioma): array
{
    $claves = rh_trivia_claves($conn, $semilla);
    if (count($claves) === 0) {
        return [];
    }

    $marcas = implode(',', array_fill(0, count($claves), '?'));
    $tipos = str_repeat('s', count($claves)) . 's';
    $params = array_merge($claves, [$idioma]);

    $stmt = $conn->prepare(
        "SELECT Clave, Texto, OpcionA, OpcionB, OpcionC, OpcionD
           FROM TriviaPregunta
          WHERE Clave IN ($marcas) AND Idioma = ? AND Estado = 'A'"
    );
    $stmt->bind_param($tipos, ...$params);
    $stmt->execute();
    $res = $stmt->get_result();

    $porClave = [];
    while ($f = $res->fetch_assoc()) {
        $porClave[$f['Clave']] = $f;
    }
    $stmt->close();

    $salida = [];
    foreach ($claves as $clave) {
        if (!isset($porClave[$clave])) {
            continue;
        }
        $p = $porClave[$clave];
        $opciones = [];

        // El `id` es la POSICIÓN en el orden barajado, no la letra de la base.
        // Es la diferencia entre esconder la respuesta y no esconderla: como en
        // la base la correcta siempre está en `OpcionA`, mandar la letra haría
        // que responder "A" a todo diera 10 de 10 mirando el tráfico de red.
        // Con posiciones, el cliente no tiene forma de saber cuál es cuál.
        foreach (rh_trivia_orden($clave, $semilla) as $pos => $letra) {
            $opciones[] = ['id' => $pos, 'texto' => $p['Opcion' . $letra]];
        }
        $salida[] = [
            'clave' => $clave,
            'texto' => $p['Texto'],
            'opciones' => $opciones,
        ];
    }

    return $salida;
}

/**
 * Corrige las respuestas y devuelve el detalle.
 *
 * @param array $respuestas  ['clave' => 'A'|'B'|'C'|'D'|null]  null = sin responder
 */
function rh_trivia_corregir(mysqli $conn, int $semilla, string $idioma, array $respuestas): array
{
    $claves = rh_trivia_claves($conn, $semilla);
    if (count($claves) === 0) {
        return ['detalle' => [], 'aciertos' => 0, 'puntos' => 0];
    }

    $marcas = implode(',', array_fill(0, count($claves), '?'));
    $tipos = str_repeat('s', count($claves)) . 's';
    $params = array_merge($claves, [$idioma]);

    $stmt = $conn->prepare(
        "SELECT Clave, Correcta, Explicacion, OpcionA, OpcionB, OpcionC, OpcionD
           FROM TriviaPregunta
          WHERE Clave IN ($marcas) AND Idioma = ? AND Estado = 'A'"
    );
    $stmt->bind_param($tipos, ...$params);
    $stmt->execute();
    $res = $stmt->get_result();

    $porClave = [];
    while ($f = $res->fetch_assoc()) {
        $porClave[$f['Clave']] = $f;
    }
    $stmt->close();

    $detalle = [];
    $aciertos = 0;

    foreach ($claves as $clave) {
        if (!isset($porClave[$clave])) {
            continue;
        }
        $p = $porClave[$clave];

        // Lo que manda el cliente es la posición que tocó (0..3). Se traduce a
        // la letra de la base con el mismo barajado que se usó al servirla.
        $orden = rh_trivia_orden($clave, $semilla);
        $pos = $respuestas[$clave] ?? null;
        $elegida = (is_int($pos) || (is_string($pos) && ctype_digit($pos))) && isset($orden[(int) $pos])
            ? $orden[(int) $pos]
            : null;

        $ok = $elegida !== null && $elegida === $p['Correcta'];
        if ($ok) {
            $aciertos++;
        }

        // Ya terminó la partida, así que acá sí se puede revelar la correcta.
        // Se manda como posición (no como letra) para que la pantalla pueda
        // marcarla en la misma lista que mostró.
        $detalle[] = [
            'clave' => $clave,
            'acerto' => $ok,
            'elegidaPos' => $pos === null ? null : (int) $pos,
            'correctaPos' => array_search($p['Correcta'], $orden, true),
            'textoCorrecto' => $p['Opcion' . $p['Correcta']],
            'explicacion' => $p['Explicacion'],
        ];
    }

    return [
        'detalle' => $detalle,
        'aciertos' => $aciertos,
        'total' => count($detalle),
    ];
}

/**
 * Puntaje de una partida de trivia.
 *
 * 100 por acierto más un bono por responder rápido. El bono se calcula sobre el
 * tiempo total y no por pregunta para no castigar al que se toma unos segundos
 * en una difícil y compensa en las fáciles.
 */
function rh_trivia_puntos(int $aciertos, int $total, int $segundosUsados): int
{
    $base = $aciertos * 100;
    if ($aciertos === 0) {
        return 0;
    }

    $tope = $total * RH_TRIVIA_SEGUNDOS;
    $sobrante = max(0, $tope - $segundosUsados);

    // El bono de velocidad se escala por el acierto: correr sin saber no paga.
    $bono = (int) round($sobrante * 2 * ($aciertos / max(1, $total)));

    return $base + $bono;
}
