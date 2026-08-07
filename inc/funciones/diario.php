<?php
/**
 * El desafío diario de HuePlay: un reto por día y por juego, igual para todos.
 *
 * La idea es la de los juegos diarios de LinkedIn o del Wordle: un solo intento
 * por día, el mismo tablero para todo el mundo, y un ranking que compara peras
 * con peras. Lo que lo hace posible es que los juegos ya saben armarse a partir
 * de una **semilla** —es lo que usan los duelos—, así que repartiendo la misma
 * semilla a todos se juega literalmente el mismo tablero.
 */

require_once __DIR__ . '/juegos.php';

/**
 * Juegos que participan del diario.
 *
 * Sólo los de modo `puntaje`: son los que producen un número comparable entre
 * dos personas que jugaron el mismo tablero. Los de turnos no entran acá —una
 * partida contra otro jugador no deja un puntaje que se pueda rankear—; para
 * ésos el diario va a ser un puzzle de un jugador, que es otro contenido.
 *
 * HueGotchi tampoco entra: no se juega por partidas, suma de a poco cuidando
 * al bicho.
 */
function rh_diario_juegos(): array
{
    $codigos = [];
    foreach (RH_JUEGOS as $codigo => $def) {
        if (($def['modo'] ?? '') === 'puntaje') {
            $codigos[] = $codigo;
        }
    }
    return $codigos;
}

/**
 * Hoy, en la zona horaria del proyecto.
 *
 * Se pasa por PHP y no por `CURDATE()` para que el corte del día sea el mismo
 * que ve el usuario. La conexión ya está en -03:00 (ver bd.php), pero tener la
 * fecha en una sola función evita que mañana alguien la calcule distinto en
 * otro archivo y el diario cambie de día a horas diferentes según el endpoint.
 */
function rh_diario_hoy(): string
{
    return date('Y-m-d');
}

/**
 * La semilla del día para un juego.
 *
 * Es **determinística**: sale de la fecha y del código del juego, así que no
 * hace falta un cron que la genere a medianoche. El primero que entra ese día
 * crea la fila; los demás la leen. Y aunque la fila se borrara, el mismo día
 * daría la misma semilla.
 *
 * `crc32` alcanza y sobra: no se busca que la semilla sea impredecible —el
 * tablero se ve apenas empezás— sino que sea la misma para todos y distinta
 * cada día.
 */
function rh_diario_semilla(string $fecha, string $codigo): int
{
    $n = crc32($fecha . '|' . $codigo . '|huellitas');
    // 0 no sirve como semilla para el PRNG del cliente, y hay que quedar dentro
    // del rango de un INT con signo.
    return ($n % 2147483646) + 1;
}

/**
 * El reto de hoy para un juego, creándolo si es el primero que pregunta.
 *
 * `INSERT IGNORE` y después `SELECT`: si dos personas abren la app en el mismo
 * instante las dos intentan crear la fila, y la clave única `(Fecha, Juego)`
 * decide. Sin el IGNORE, una de las dos se llevaría un error por algo que en
 * realidad salió bien.
 */
function rh_diario_obtener(mysqli $conn, string $codigo, ?string $fecha = null): ?array
{
    $fecha = $fecha ?? rh_diario_hoy();
    if (!in_array($codigo, rh_diario_juegos(), true)) {
        return null;
    }

    $semilla = rh_diario_semilla($fecha, $codigo);
    $stmt = $conn->prepare(
        'INSERT IGNORE INTO JuegoDiario (Fecha, JuegoCodigo, Semilla) VALUES (?, ?, ?)'
    );
    $stmt->bind_param('ssi', $fecha, $codigo, $semilla);
    $stmt->execute();
    $stmt->close();

    $stmt = $conn->prepare(
        'SELECT DiarioId, Fecha, JuegoCodigo, Semilla, Datos
         FROM JuegoDiario WHERE Fecha = ? AND JuegoCodigo = ?'
    );
    $stmt->bind_param('ss', $fecha, $codigo);
    $stmt->execute();
    $fila = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if (!$fila) {
        return null;
    }

    return [
        'diarioId' => (int) $fila['DiarioId'],
        'fecha' => $fila['Fecha'],
        'juegoCodigo' => $fila['JuegoCodigo'],
        'titulo' => rh_juego_titulo($fila['JuegoCodigo']),
        'semilla' => (int) $fila['Semilla'],
        'datos' => $fila['Datos'],
    ];
}

/** Lo que hizo este usuario en ese reto, o `null` si todavía no lo jugó. */
function rh_diario_mi_resultado(mysqli $conn, int $diarioId, int $userId): ?array
{
    $stmt = $conn->prepare(
        'SELECT Puntos, DuracionSegundos, CreatedAt
         FROM JuegoDiarioResultado WHERE DiarioId = ? AND UserId = ?'
    );
    $stmt->bind_param('ii', $diarioId, $userId);
    $stmt->execute();
    $fila = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if (!$fila) {
        return null;
    }
    return [
        'puntos' => (int) $fila['Puntos'],
        'duracionSegundos' => $fila['DuracionSegundos'] === null ? null : (int) $fila['DuracionSegundos'],
        'jugadoEn' => $fila['CreatedAt'],
    ];
}

/** Cuánta gente jugó ese reto. Da contexto al puesto: 3° de 5 no es 3° de 500. */
function rh_diario_participantes(mysqli $conn, int $diarioId): int
{
    $stmt = $conn->prepare('SELECT COUNT(*) AS N FROM JuegoDiarioResultado WHERE DiarioId = ?');
    $stmt->bind_param('i', $diarioId);
    $stmt->execute();
    $n = (int) ($stmt->get_result()->fetch_assoc()['N'] ?? 0);
    $stmt->close();
    return $n;
}

/**
 * El puesto de un usuario: cuántos le ganaron, más uno.
 *
 * Ante el mismo puntaje va primero el que lo consiguió antes, así que el
 * desempate mira `CreatedAt`. Sin ese criterio dos personas empatadas se verían
 * las dos en el mismo puesto y la suma no cerraría con la cantidad de gente.
 */
function rh_diario_mi_puesto(mysqli $conn, int $diarioId, int $userId): ?int
{
    $stmt = $conn->prepare(
        'SELECT (
             SELECT COUNT(*) FROM JuegoDiarioResultado o
             WHERE o.DiarioId = r.DiarioId
               AND (o.Puntos > r.Puntos OR (o.Puntos = r.Puntos AND o.CreatedAt < r.CreatedAt))
         ) + 1 AS Puesto
         FROM JuegoDiarioResultado r
         WHERE r.DiarioId = ? AND r.UserId = ?'
    );
    $stmt->bind_param('ii', $diarioId, $userId);
    $stmt->execute();
    $fila = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    return $fila ? (int) $fila['Puesto'] : null;
}

/** La tabla del día: los mejores, con nombre y avatar para poder mostrarlos. */
function rh_diario_ranking(mysqli $conn, int $diarioId, int $limite = 20): array
{
    $limite = max(1, min(100, $limite));
    $stmt = $conn->prepare(
        'SELECT r.UserId, r.Puntos, r.DuracionSegundos, r.CreatedAt,
                u.Username, u.NombreCompleto, u.AvatarPath
         FROM JuegoDiarioResultado r
         INNER JOIN Usuario u ON u.UserId = r.UserId
         WHERE r.DiarioId = ?
         ORDER BY r.Puntos DESC, r.CreatedAt ASC
         LIMIT ?'
    );
    $stmt->bind_param('ii', $diarioId, $limite);
    $stmt->execute();
    $res = $stmt->get_result();

    $lista = [];
    $puesto = 0;
    while ($f = $res->fetch_assoc()) {
        $puesto++;
        $lista[] = [
            'puesto' => $puesto,
            'userId' => (int) $f['UserId'],
            'username' => $f['Username'],
            'nombreCompleto' => $f['NombreCompleto'],
            'avatarPath' => $f['AvatarPath'],
            'puntos' => (int) $f['Puntos'],
            'duracionSegundos' => $f['DuracionSegundos'] === null ? null : (int) $f['DuracionSegundos'],
        ];
    }
    $stmt->close();
    return $lista;
}

/**
 * La racha de días seguidos.
 *
 * Se corta con jugar cualquier juego del diario, no uno en particular: la racha
 * premia el hábito de volver, no la fidelidad a un juego. Por eso vive en el
 * perfil del usuario y no por juego.
 *
 * Compara contra ayer y no contra "hace menos de 24 horas": jugar a las 23:50 y
 * después a las 00:10 son dos días distintos y la racha sigue, que es lo que
 * uno espera de algo que se llama "diario".
 */
function rh_diario_actualizar_racha(mysqli $conn, int $userId, string $fecha): int
{
    $stmt = $conn->prepare('SELECT RachaDiaria, UltimoDiario FROM UsuarioJuegoPerfil WHERE UserId = ?');
    $stmt->bind_param('i', $userId);
    $stmt->execute();
    $fila = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    $racha = (int) ($fila['RachaDiaria'] ?? 0);
    $ultimo = $fila['UltimoDiario'] ?? null;
    $ayer = date('Y-m-d', strtotime($fecha . ' -1 day'));

    if ($ultimo === $fecha) {
        // Ya contó hoy. No debería pasar —la clave única lo impide— pero si
        // alguna vez se llama dos veces, la racha no se infla.
        return $racha;
    }

    $racha = ($ultimo === $ayer) ? $racha + 1 : 1;

    // Upsert y no `UPDATE`: la primera vez que alguien juega puede no tener
    // todavía fila en el perfil, y un UPDATE contra cero filas no falla, no
    // avisa, y se pierde la racha en silencio. Pasó: `guardar` devolvía racha 1
    // y la pantalla leía 0, porque el perfil se creaba recién después, al
    // registrar la partida.
    $stmt = $conn->prepare(
        'INSERT INTO UsuarioJuegoPerfil (UserId, RachaDiaria, UltimoDiario)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE RachaDiaria = VALUES(RachaDiaria), UltimoDiario = VALUES(UltimoDiario)'
    );
    $stmt->bind_param('iis', $userId, $racha, $fecha);
    $stmt->execute();
    $stmt->close();

    return $racha;
}

/**
 * Guarda el intento del día.
 *
 * Devuelve `null` si ya había jugado. La comprobación la hace la clave única de
 * la base y no un `SELECT` previo: entre el select y el insert hay una ventana
 * donde dos pedidos simultáneos pasarían los dos, y el reto diario es
 * exactamente el lugar donde alguien va a intentar mandar dos resultados a la
 * vez para quedarse con el mejor.
 */
function rh_diario_guardar(
    mysqli $conn,
    int $diarioId,
    int $userId,
    string $codigo,
    int $puntos,
    ?int $duracion
): ?array {
    $stmt = $conn->prepare(
        'INSERT IGNORE INTO JuegoDiarioResultado (DiarioId, UserId, Puntos, DuracionSegundos)
         VALUES (?, ?, ?, ?)'
    );
    $stmt->bind_param('iiii', $diarioId, $userId, $puntos, $duracion);
    $stmt->execute();
    $entro = $stmt->affected_rows > 0;
    $stmt->close();

    if (!$entro) {
        return null;
    }

    $fecha = rh_diario_hoy();
    $racha = rh_diario_actualizar_racha($conn, $userId, $fecha);

    // El diario también suma al nivel: es una partida de verdad, y dejarla
    // fuera del progreso sería raro justo en el modo que más queremos que se
    // juegue. Va por la misma puerta que todo lo demás.
    $progreso = rh_juego_registrar_partida($conn, $userId, $codigo, $puntos, $duracion);

    return [
        'puntos' => $puntos,
        'racha' => $racha,
        'puesto' => rh_diario_mi_puesto($conn, $diarioId, $userId),
        'participantes' => rh_diario_participantes($conn, $diarioId),
        'progreso' => $progreso,
    ];
}
