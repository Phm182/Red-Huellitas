<?php
/**
 * Cron hermano de `juego_turnos_vencidos.php`, para salas de hasta 4
 * jugadores (HueLudo, y después Rummy) en vez de duelos 1 contra 1.
 *
 * Resuelve el turno vencido según la política de la sala (IA toma el
 * asiento, se lo saltea, o se lo expulsa) y, si la política es 'ia', juega
 * en cadena todos los turnos de IA que correspondan — sin esto, una sala
 * donde nadie vuelve a abrir la app se quedaría esperando al bot para
 * siempre.
 *
 * Se resuelve perezosamente también cuando alguien abre la bandeja
 * (`rh_salas_expirar()` en `sala_listar.php`) o la sala puntual
 * (`rh_ludo_sala_actualizar()` en `sala_ver.php`); este cron cubre el caso
 * de que nadie vuelva a abrir la app.
 *
 * No hay cron corriendo en este XAMPP — se ejecuta manualmente o programado
 * vía el Programador de Tareas de Windows:
 *
 *   schtasks /create /tn "RH_Salas_Turnos_Vencidos" /tr "C:\xampp\php\php.exe \"C:\xampp\htdocs\Red Huellitas\inc\cli\salas_turnos_vencidos.php\"" /sc minute /mo 15
 *
 * Ejecución manual (o dry-run, ver abajo):
 *   C:\xampp\php\php.exe "C:\xampp\htdocs\Red Huellitas\inc\cli\salas_turnos_vencidos.php"
 *   C:\xampp\php\php.exe "C:\xampp\htdocs\Red Huellitas\inc\cli\salas_turnos_vencidos.php" --dry-run
 *
 * Cada sala en su propio try/catch: si una falla, el resto igual se resuelve.
 */

require_once __DIR__ . '/../funciones/bd.php';
require_once __DIR__ . '/../funciones/notificaciones.php';
require_once __DIR__ . '/../funciones/juegos.php';
require_once __DIR__ . '/../funciones/salas.php';
require_once __DIR__ . '/../funciones/ludo.php';
require_once __DIR__ . '/../funciones/rummy.php';

$dryRun = in_array('--dry-run', $argv ?? [], true);

$stmt = $conn->query(
    "SELECT * FROM JuegoSala WHERE Estado = 'jugando' AND TurnoVenceEn IS NOT NULL AND TurnoVenceEn <= NOW()"
);
$vencidas = $stmt ? $stmt->fetch_all(MYSQLI_ASSOC) : [];

$resueltas = 0;
$fallidas = 0;

foreach ($vencidas as $sala) {
    try {
        if ($dryRun) {
            printf(
                "[dry-run] sala=%d juego=%s politica=%s turnoDe=%s venceEn=%s\n",
                (int) $sala['SalaId'],
                $sala['JuegoCodigo'],
                $sala['PoliticaAbandono'],
                $sala['TurnoDeSalaJugadorId'],
                $sala['TurnoVenceEn']
            );
            $resueltas++;
            continue;
        }

        if ($sala['JuegoCodigo'] === 'hueludo') {
            rh_ludo_sala_actualizar($conn, $sala);
        } elseif ($sala['JuegoCodigo'] === 'huerummy') {
            rh_rummy_sala_actualizar($conn, $sala);
        } else {
            // Genérico: sin motor específico no se puede resolver la
            // consecuencia en el tablero (sacar fichas, jugar la IA), pero al
            // menos no deja el turno colgado para siempre.
            rh_sala_resolver_turno_vencido($conn, $sala);
        }
        $resueltas++;
    } catch (Throwable $e) {
        $fallidas++;
        error_log('salas_turnos_vencidos (sala ' . $sala['SalaId'] . '): ' . $e->getMessage());
    }
}

printf(
    "%sSalas vencidas: %d %s, %d con error.\n",
    $dryRun ? '[dry-run] ' : '',
    $resueltas,
    $dryRun ? 'seleccionadas' : 'resueltas',
    $fallidas
);
