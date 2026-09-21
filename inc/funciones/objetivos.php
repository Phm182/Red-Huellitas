<?php
/**
 * HuePlay: objetivos y XP de cuenta.
 *
 * El nivel de la CUENTA no sube por puntos de partida sino por cumplir
 * objetivos: cada uno da una XP fija una sola vez (los "logros", con escalones
 * cada vez más exigentes) o una vez por día (los "diarios"). Así subir de nivel
 * exige jugar variado y sostenido, no repetir el juego más fácil.
 *
 * Las métricas se calculan de lo que ya está guardado (JuegoPartida, perfil,
 * torneos), por eso al estrenar el sistema cada usuario cobra retroactivamente
 * lo que ya hizo.
 *
 * Todo esto depende de la migración 075; sin ella `rh_obj_disponible()` da
 * false y el resto de HuePlay sigue con la lógica anterior.
 */

/** Periodo con el que se guardan los objetivos permanentes. */
const RH_OBJ_PERMANENTE = '2000-01-01';

/**
 * Logros: familia => [icono, métrica, escalones [meta, xp]].
 * `xp` de cada escalón crece más rápido que la meta a propósito.
 */
const RH_OBJ_LOGROS = [
    'partidas' => ['icono' => 'game-controller-outline', 'metrica' => 'partidas',
        'escalones' => [[1, 15], [10, 40], [50, 100], [150, 200], [400, 400], [1000, 800]]],
    'juegos' => ['icono' => 'apps-outline', 'metrica' => 'juegos',
        'escalones' => [[3, 30], [6, 80], [10, 160], [15, 300]]],
    'victorias' => ['icono' => 'trophy-outline', 'metrica' => 'victorias',
        'escalones' => [[1, 30], [5, 80], [15, 180], [40, 400], [100, 900]]],
    'torneos' => ['icono' => 'ribbon-outline', 'metrica' => 'torneos',
        'escalones' => [[1, 150], [3, 350], [10, 900]]],
    'dias' => ['icono' => 'calendar-outline', 'metrica' => 'dias',
        'escalones' => [[3, 40], [7, 100], [14, 220], [30, 500], [60, 1000]]],
    'nivelmax' => ['icono' => 'trending-up-outline', 'metrica' => 'nivelmax',
        'escalones' => [[3, 40], [5, 100], [8, 250], [12, 500], [16, 900]]],
    'juegos_n5' => ['icono' => 'star-outline', 'metrica' => 'juegosN5',
        'escalones' => [[2, 120], [4, 300], [8, 700]]],
];

/** Diarios: código => [icono, métrica del día, meta, xp]. Se pueden cumplir todos los días. */
const RH_OBJ_DIARIOS = [
    'd_partidas3' => ['icono' => 'play-outline', 'metrica' => 'partidasHoy', 'meta' => 3, 'xp' => 15],
    'd_juegos2' => ['icono' => 'shuffle-outline', 'metrica' => 'juegosHoy', 'meta' => 2, 'xp' => 20],
    'd_partidas10' => ['icono' => 'flame-outline', 'metrica' => 'partidasHoy', 'meta' => 10, 'xp' => 40],
];

/** ¿Ya corrió la migración 075? Se cachea por request. */
function rh_obj_disponible(mysqli $conn): bool
{
    static $ok = null;
    if ($ok === null) {
        $r = $conn->query(
            "SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
              WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'UsuarioJuegoPerfil' AND COLUMN_NAME = 'Xp'"
        );
        $tieneXp = $r && (int) ($r->fetch_row()[0] ?? 0) > 0;
        $r = $conn->query(
            "SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES
              WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'UsuarioJuegoObjetivo'"
        );
        $tieneTabla = $r && (int) ($r->fetch_row()[0] ?? 0) > 0;
        $ok = $tieneXp && $tieneTabla;
    }
    return $ok;
}

/**
 * Nivel de cuenta a partir de la XP. Crece geométricamente: cada nivel cuesta
 * 1,4 veces lo que costó el anterior. Nivel L arranca en 500*(1,4^(L-1) - 1).
 */
function rh_cuenta_nivel(int $xp): int
{
    if ($xp < 200) {
        return 1;
    }
    return min((int) floor(log($xp / 500 + 1) / log(1.4)) + 1, 99);
}

function rh_cuenta_umbral(int $nivel): int
{
    return (int) round(500 * (1.4 ** ($nivel - 1) - 1));
}

/** Misma forma que `rh_juego_progreso()`, con la XP en `puntos`. */
function rh_cuenta_progreso(int $xp): array
{
    $nivel = rh_cuenta_nivel($xp);
    $desde = rh_cuenta_umbral($nivel);
    $hasta = rh_cuenta_umbral($nivel + 1);
    return [
        'nivel' => $nivel,
        'puntos' => $xp,
        'nivelDesde' => $desde,
        'nivelHasta' => $hasta,
        'faltan' => max(0, $hasta - $xp),
    ];
}

/** Todas las métricas de un usuario, de una. */
function rh_obj_metricas(mysqli $conn, int $userId): array
{
    $m = ['partidas' => 0, 'juegos' => 0, 'victorias' => 0, 'torneos' => 0, 'dias' => 0,
        'nivelmax' => 1, 'juegosN5' => 0, 'partidasHoy' => 0, 'juegosHoy' => 0];

    $stmt = $conn->prepare(
        "SELECT COUNT(*) AS N, COUNT(DISTINCT JuegoCodigo) AS J, COUNT(DISTINCT DATE(CreatedAt)) AS D,
                SUM(DATE(CreatedAt) = CURDATE()) AS Hoy,
                COUNT(DISTINCT CASE WHEN DATE(CreatedAt) = CURDATE() THEN JuegoCodigo END) AS JHoy
           FROM JuegoPartida WHERE UserId = ? AND JuegoCodigo <> 'huegotchi'"
    );
    $stmt->bind_param('i', $userId);
    $stmt->execute();
    $f = $stmt->get_result()->fetch_assoc() ?: [];
    $stmt->close();
    $m['partidas'] = (int) ($f['N'] ?? 0);
    $m['juegos'] = (int) ($f['J'] ?? 0);
    $m['dias'] = (int) ($f['D'] ?? 0);
    $m['partidasHoy'] = (int) ($f['Hoy'] ?? 0);
    $m['juegosHoy'] = (int) ($f['JHoy'] ?? 0);

    $stmt = $conn->prepare('SELECT DesafiosGanados FROM UsuarioJuegoPerfil WHERE UserId = ?');
    $stmt->bind_param('i', $userId);
    $stmt->execute();
    $m['victorias'] = (int) ($stmt->get_result()->fetch_row()[0] ?? 0);
    $stmt->close();

    $stmt = $conn->prepare("SELECT COUNT(*) FROM Torneo WHERE GanadorUserId = ? AND Estado = 'terminado'");
    $stmt->bind_param('i', $userId);
    $stmt->execute();
    $m['torneos'] = (int) ($stmt->get_result()->fetch_row()[0] ?? 0);
    $stmt->close();

    $stmt = $conn->prepare(
        "SELECT SUM(Puntos) AS P FROM JuegoPartida
          WHERE UserId = ? AND JuegoCodigo <> 'huegotchi' GROUP BY JuegoCodigo"
    );
    $stmt->bind_param('i', $userId);
    $stmt->execute();
    $res = $stmt->get_result();
    while ($r = $res->fetch_assoc()) {
        $n = rh_juego_nivel_juego((int) $r['P']);
        $m['nivelmax'] = max($m['nivelmax'], $n);
        if ($n >= 5) {
            $m['juegosN5']++;
        }
    }
    $stmt->close();

    return $m;
}

/** Fecha de hoy según MySQL (no PHP: los husos de los dos difieren). */
function rh_obj_hoy(mysqli $conn): string
{
    return (string) ($conn->query('SELECT CURDATE()')->fetch_row()[0] ?? date('Y-m-d'));
}

/** Códigos ya cobrados hoy o para siempre: "codigo|periodo". */
function rh_obj_cobrados(mysqli $conn, int $userId): array
{
    $stmt = $conn->prepare(
        'SELECT Codigo, Periodo FROM UsuarioJuegoObjetivo
          WHERE UserId = ? AND (Periodo = ? OR Periodo = CURDATE())'
    );
    $per = RH_OBJ_PERMANENTE;
    $stmt->bind_param('is', $userId, $per);
    $stmt->execute();
    $res = $stmt->get_result();
    $out = [];
    while ($r = $res->fetch_assoc()) {
        $out[$r['Codigo'] . '|' . $r['Periodo']] = true;
    }
    $stmt->close();
    return $out;
}

/**
 * Cobra todo lo que el usuario ya cumplió y no cobró. Devuelve la XP ganada y
 * los objetivos nuevos (para avisarle). Nunca rompe a quien la llama.
 *
 * @return array{xpGanada:int, nuevos:array}
 */
function rh_obj_evaluar(mysqli $conn, int $userId): array
{
    $vacio = ['xpGanada' => 0, 'nuevos' => []];
    if (!rh_obj_disponible($conn)) {
        return $vacio;
    }
    try {
        $m = rh_obj_metricas($conn, $userId);
        $cobrados = rh_obj_cobrados($conn, $userId);
        $hoy = rh_obj_hoy($conn);
        $xpTotal = 0;
        $nuevos = [];

        $cobrar = function (string $codigo, string $periodo, int $xp) use ($conn, $userId, &$xpTotal, &$nuevos): void {
            $stmt = $conn->prepare('INSERT IGNORE INTO UsuarioJuegoObjetivo (UserId, Codigo, Periodo, Xp) VALUES (?, ?, ?, ?)');
            $stmt->bind_param('issi', $userId, $codigo, $periodo, $xp);
            $stmt->execute();
            $nuevo = $stmt->affected_rows > 0;
            $stmt->close();
            if ($nuevo) {
                $xpTotal += $xp;
                $nuevos[] = ['codigo' => $codigo, 'xp' => $xp];
            }
        };

        foreach (RH_OBJ_LOGROS as $familia => $def) {
            foreach ($def['escalones'] as [$meta, $xp]) {
                $codigo = $familia . '_' . $meta;
                if ($m[$def['metrica']] >= $meta && !isset($cobrados[$codigo . '|' . RH_OBJ_PERMANENTE])) {
                    $cobrar($codigo, RH_OBJ_PERMANENTE, $xp);
                }
            }
        }
        foreach (RH_OBJ_DIARIOS as $codigo => $def) {
            if ($m[$def['metrica']] >= $def['meta'] && !isset($cobrados[$codigo . '|' . $hoy])) {
                $cobrar($codigo, $hoy, $def['xp']);
            }
        }

        if ($xpTotal > 0) {
            $stmt = $conn->prepare('UPDATE UsuarioJuegoPerfil SET Xp = Xp + ? WHERE UserId = ?');
            $stmt->bind_param('ii', $xpTotal, $userId);
            $stmt->execute();
            $stmt->close();
        }
        return ['xpGanada' => $xpTotal, 'nuevos' => $nuevos];
    } catch (Throwable $e) {
        error_log('rh_obj_evaluar: ' . $e->getMessage());
        return $vacio;
    }
}

/** Lo que muestra la pantalla de objetivos. */
function rh_obj_listar(mysqli $conn, int $userId): array
{
    $m = rh_obj_metricas($conn, $userId);
    $cobrados = rh_obj_cobrados($conn, $userId);
    $hoy = rh_obj_hoy($conn);

    $diarios = [];
    foreach (RH_OBJ_DIARIOS as $codigo => $def) {
        $diarios[] = [
            'codigo' => $codigo,
            'icono' => $def['icono'],
            'meta' => $def['meta'],
            'valor' => min($m[$def['metrica']], $def['meta']),
            'xp' => $def['xp'],
            'cumplido' => isset($cobrados[$codigo . '|' . $hoy]),
        ];
    }

    $logros = [];
    foreach (RH_OBJ_LOGROS as $familia => $def) {
        $escalones = [];
        foreach ($def['escalones'] as [$meta, $xp]) {
            $escalones[] = [
                'meta' => $meta,
                'xp' => $xp,
                'cumplido' => isset($cobrados[$familia . '_' . $meta . '|' . RH_OBJ_PERMANENTE]),
            ];
        }
        $logros[] = [
            'familia' => $familia,
            'icono' => $def['icono'],
            'valor' => $m[$def['metrica']],
            'escalones' => $escalones,
        ];
    }

    return ['diarios' => $diarios, 'logros' => $logros];
}
