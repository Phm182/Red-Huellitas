<?php
/**
 * Minijuego "Pet Society" (Fase 7a) — Tamagotchi sobre la mascota propia.
 *
 * Idea central: los stats NO se actualizan con un cron. Se guarda el valor y
 * su marca de tiempo, y el valor real se deriva al leer descontando lo que
 * pasó. La fila sólo se escribe cuando el usuario hace una acción. Es el mismo
 * criterio que Historias (ver inc/funciones/historias.php).
 *
 * Decisión de producto: la mascota NUNCA muere ni se enferma. Los stats tienen
 * piso en 0 y de ahí sale un ánimo "decaído". El avatar es la foto de la
 * mascota real del usuario, en una app de bienestar animal.
 *
 * Requiere que quien llame haya hecho require_once de funciones/mascotas.php.
 */

/**
 * Puntos que baja cada stat por hora. El hambre es el más rápido (100→0 en
 * ~25h), así que pasar una vez por día alcanza para tenerla bien cuidada.
 * Tunear el balance del juego se hace acá y en ningún otro lado.
 */
const RH_JUEGO_DECAY_POR_HORA = [
    'hambre' => 4.0,
    'felicidad' => 3.0,
    'energia' => 2.5,
    'higiene' => 1.5,
];

const RH_JUEGO_COOLDOWN_MINUTOS = [
    'alimentar' => 180,
    'jugar' => 60,
    'banar' => 720,
    'dormir' => 480,
];

/**
 * Efecto de cada acción sobre los stats (se suma, con tope 100 y piso 0) y la
 * experiencia que otorga. Como en el Tamagotchi original, casi toda acción
 * sube algo y cuesta algo.
 */
const RH_JUEGO_ACCIONES = [
    'alimentar' => ['efectos' => ['hambre' => 40, 'higiene' => -5], 'xp' => 10, 'columna' => 'UltimoAlimentar'],
    'jugar'     => ['efectos' => ['felicidad' => 30, 'energia' => -15, 'hambre' => -10], 'xp' => 15, 'columna' => 'UltimoJugar'],
    'banar'     => ['efectos' => ['higiene' => 50, 'felicidad' => -5], 'xp' => 10, 'columna' => 'UltimoBanar'],
    'dormir'    => ['efectos' => ['energia' => 50], 'xp' => 5, 'columna' => 'UltimoDormir'],
];

/** XP necesaria para pasar de un nivel al siguiente. */
const RH_JUEGO_XP_POR_NIVEL = 100;

const RH_JUEGO_STATS = ['hambre', 'felicidad', 'energia', 'higiene'];

/**
 * Campos de tiempo que MySQL calcula junto con la fila.
 *
 * Todo el cálculo temporal del juego se hace del lado de MySQL a propósito:
 * comparar time()/date() de PHP contra un DATETIME de MySQL es frágil (en este
 * XAMPP PHP arrancaba en Europe/Berlin y MySQL en -03:00, 5 horas de
 * desfasaje). bd.php ahora alinea las zonas, pero el juego no depende de eso:
 * MySQL tiene los dos valores y hace la resta él mismo.
 */
function rh_juego_campos_tiempo(string $alias = 'MascotaJuego'): string
{
    $campos = ["TIMESTAMPDIFF(SECOND, $alias.StatsActualizadoEn, NOW()) AS SegundosDesdeStats"];

    foreach (RH_JUEGO_ACCIONES as $config) {
        $col = $config['columna'];
        $campos[] = "TIMESTAMPDIFF(SECOND, $alias.$col, NOW()) AS Seg$col";
    }

    $campos[] = "DATEDIFF(CURDATE(), $alias.UltimaVisita) AS DiasDesdeVisita";

    return implode(', ', $campos);
}

/**
 * Carga el estado de juego de una mascota, creándolo si es la primera vez.
 * Devuelve null si la mascota no existe, está dada de baja, o no es del usuario.
 */
function rh_juego_obtener_o_crear(mysqli $conn, int $mascotaId, int $userId): ?array
{
    $stmt = $conn->prepare("SELECT * FROM Mascota WHERE MascotaId = ? AND Estado = 'A'");
    $stmt->bind_param('i', $mascotaId);
    $stmt->execute();
    $mascota = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if (!$mascota || (int) $mascota['UserId'] !== $userId) {
        return null;
    }

    $sqlJuego = 'SELECT MascotaJuego.*, ' . rh_juego_campos_tiempo() . ' FROM MascotaJuego WHERE MascotaId = ?';

    $stmt = $conn->prepare($sqlJuego);
    $stmt->bind_param('i', $mascotaId);
    $stmt->execute();
    $juego = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if (!$juego) {
        $stmt = $conn->prepare('INSERT INTO MascotaJuego (MascotaId, UserId) VALUES (?, ?)');
        $stmt->bind_param('ii', $mascotaId, $userId);
        $stmt->execute();
        $stmt->close();

        $stmt = $conn->prepare($sqlJuego);
        $stmt->bind_param('i', $mascotaId);
        $stmt->execute();
        $juego = $stmt->get_result()->fetch_assoc();
        $stmt->close();
    }

    return ['juego' => $juego, 'mascota' => $mascota];
}

/**
 * Deriva los stats reales aplicando el decay del tiempo transcurrido desde
 * StatsActualizadoEn. No escribe nada — es una función pura sobre la fila.
 *
 * @return array<string,int> stats 0-100
 */
function rh_juego_stats_actuales(array $juego): array
{
    // SegundosDesdeStats lo calcula MySQL (ver rh_juego_campos_tiempo).
    $horas = max(0, (int) ($juego['SegundosDesdeStats'] ?? 0)) / 3600;

    $stats = [];
    foreach (RH_JUEGO_STATS as $stat) {
        $guardado = (int) $juego[ucfirst($stat)];
        $caida = RH_JUEGO_DECAY_POR_HORA[$stat] * $horas;
        $stats[$stat] = (int) max(0, min(100, round($guardado - $caida)));
    }
    return $stats;
}

/**
 * Ánimo derivado del promedio de stats. Nunca devuelve un estado de enfermedad
 * ni de muerte: lo peor que puede pasar es 'decaido'.
 */
function rh_juego_animo(array $stats): string
{
    $promedio = array_sum($stats) / count($stats);

    if ($promedio >= 75) {
        return 'feliz';
    }
    if ($promedio >= 50) {
        return 'bien';
    }
    if ($promedio >= 25) {
        return 'aburrido';
    }
    return 'decaido';
}

/**
 * Segundos que faltan para poder volver a usar cada acción (0 = disponible).
 *
 * @return array<string,int>
 */
function rh_juego_cooldowns(array $juego): array
{
    $salida = [];

    foreach (RH_JUEGO_ACCIONES as $tipo => $config) {
        // Seg{Columna} lo calcula MySQL; es null si la acción nunca se usó.
        $transcurridos = $juego['Seg' . $config['columna']] ?? null;
        if ($transcurridos === null) {
            $salida[$tipo] = 0;
            continue;
        }
        $total = RH_JUEGO_COOLDOWN_MINUTOS[$tipo] * 60;
        $salida[$tipo] = (int) max(0, $total - (int) $transcurridos);
    }

    return $salida;
}

/**
 * Aplica una acción. Devuelve ['ok' => bool, 'error' => ?string,
 * 'esperarSegundos' => ?int, 'subioNivel' => bool].
 *
 * Consolida los stats derivados antes de aplicar el efecto: si no, el decay
 * acumulado se perdería al escribir.
 */
function rh_juego_aplicar_accion(mysqli $conn, array $juego, string $tipo): array
{
    if (!isset(RH_JUEGO_ACCIONES[$tipo])) {
        return ['ok' => false, 'error' => 'Acción desconocida', 'esperarSegundos' => null, 'subioNivel' => false];
    }

    $cooldowns = rh_juego_cooldowns($juego);
    if ($cooldowns[$tipo] > 0) {
        return [
            'ok' => false,
            'error' => 'Todavía no podés volver a hacer eso',
            'esperarSegundos' => $cooldowns[$tipo],
            'subioNivel' => false,
        ];
    }

    $config = RH_JUEGO_ACCIONES[$tipo];
    $stats = rh_juego_stats_actuales($juego);

    foreach ($config['efectos'] as $stat => $delta) {
        $stats[$stat] = (int) max(0, min(100, $stats[$stat] + $delta));
    }

    // Racha: sube si la última visita fue ayer, se mantiene si ya jugó hoy, y
    // se reinicia si pasó más tiempo. DiasDesdeVisita lo calcula MySQL (null
    // si nunca jugó).
    $diasDesdeVisita = $juego['DiasDesdeVisita'];
    $racha = (int) $juego['RachaDias'];

    if ($diasDesdeVisita === null) {
        $racha = 1;                       // primera vez
    } elseif ((int) $diasDesdeVisita === 1) {
        $racha = $racha + 1;              // jugó ayer: la racha sigue
    } elseif ((int) $diasDesdeVisita > 1) {
        $racha = 1;                       // se cortó
    } elseif ($racha === 0) {
        $racha = 1;                       // ya jugó hoy pero la racha estaba en 0
    }

    $experiencia = (int) $juego['Experiencia'] + $config['xp'];
    $nivelPrevio = (int) $juego['Nivel'];
    $nivel = 1 + intdiv($experiencia, RH_JUEGO_XP_POR_NIVEL);

    $stmt = $conn->prepare(
        "UPDATE MascotaJuego
         SET Hambre = ?, Felicidad = ?, Energia = ?, Higiene = ?,
             StatsActualizadoEn = NOW(),
             {$config['columna']} = NOW(),
             Nivel = ?, Experiencia = ?, RachaDias = ?, UltimaVisita = CURDATE()
         WHERE MascotaId = ?"
    );
    $mascotaId = (int) $juego['MascotaId'];
    $stmt->bind_param(
        'iiiiiiii',
        $stats['hambre'],
        $stats['felicidad'],
        $stats['energia'],
        $stats['higiene'],
        $nivel,
        $experiencia,
        $racha,
        $mascotaId
    );
    $stmt->execute();
    $stmt->close();

    return ['ok' => true, 'error' => null, 'esperarSegundos' => null, 'subioNivel' => $nivel > $nivelPrevio];
}

/**
 * Serializa el estado de juego para el cliente.
 *
 * `avatarUrl` sale de AvatarPath si existe (Fase 7b) y si no de la primera
 * foto de la mascota — un solo lugar decide eso en todo el proyecto.
 */
function rh_juego_publico(mysqli $conn, array $juego, array $mascota): array
{
    $stats = rh_juego_stats_actuales($juego);
    $experiencia = (int) $juego['Experiencia'];

    $avatarPath = $juego['AvatarPath'];
    if ($avatarPath === null) {
        $fotos = rh_mascota_fotos($conn, (int) $mascota['MascotaId']);
        $avatarPath = $fotos[0]['path'] ?? null;
    }

    return [
        'mascotaId' => (int) $mascota['MascotaId'],
        'nombre' => $mascota['Nombre'],
        'especie' => $mascota['Especie'],
        'avatarPath' => $avatarPath,
        'avatarEsGenerado' => $juego['AvatarPath'] !== null,
        'stats' => $stats,
        'animo' => rh_juego_animo($stats),
        'cooldowns' => rh_juego_cooldowns($juego),
        'nivel' => (int) $juego['Nivel'],
        'experiencia' => $experiencia,
        'experienciaNivel' => $experiencia % RH_JUEGO_XP_POR_NIVEL,
        'experienciaPorNivel' => RH_JUEGO_XP_POR_NIVEL,
        'rachaDias' => (int) $juego['RachaDias'],
    ];
}
