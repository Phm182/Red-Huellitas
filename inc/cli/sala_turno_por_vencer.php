<?php
/**
 * Avisa UNA vez cuando queda ~10% del plazo de turno para que venza el
 * turno de una sala (HueLudo/HueLudo Real/HueRummy/HueScrabble). Hermano de
 * `juego_turno_por_vencer.php` (el mismo aviso para duelos 1 contra 1), pero
 * con la ventana como PORCENTAJE del plazo en vez de un fijo de 15 minutos:
 * el plazo de una sala va de 3 minutos a 7 días, así que un fijo de 15
 * minutos no tiene sentido en los dos extremos (en un plazo de 3 minutos
 * nunca entraría; en uno de 7 días, avisaría carísimo tarde).
 *
 * `RecordatorioTurnoEnviado` evita mandarlo dos veces para el mismo turno;
 * se resetea a 0 en cada `rh_sala_avanzar_turno()` (turno nuevo = cuenta
 * regresiva nueva) — mismo mecanismo que en `JuegoDesafio`.
 *
 *   schtasks /create /tn "RH_Sala_Turno_Por_Vencer" /tr "C:\xampp\php\php.exe \"C:\xampp\htdocs\Red Huellitas\inc\cli\sala_turno_por_vencer.php\"" /sc minute /mo 5
 *
 * Ejecución manual (o dry-run, ver abajo):
 *   C:\xampp\php\php.exe "C:\xampp\htdocs\Red Huellitas\inc\cli\sala_turno_por_vencer.php"
 *   C:\xampp\php\php.exe "C:\xampp\htdocs\Red Huellitas\inc\cli\sala_turno_por_vencer.php" --dry-run
 *
 * Cada sala en su propio try/catch: si una falla, el resto igual se avisa.
 */

require_once __DIR__ . '/../funciones/bd.php';
require_once __DIR__ . '/../funciones/notificaciones.php';
require_once __DIR__ . '/../funciones/juegos.php';

const RH_SALA_FRACCION_AVISO = 0.10;

$dryRun = in_array('--dry-run', $argv ?? [], true);

$botId = rh_juego_bot_user_id($conn);

// Sólo salas en curso, con turno de alguien asignado, cuyo plazo restante ya
// entró en el 10% final — y todavía no venció (eso lo resuelve
// salas_turnos_vencidos.php aparte).
$stmt = $conn->prepare(
    "SELECT s.SalaId, s.JuegoCodigo, s.PlazoTurnoSegundos, s.TurnoVenceEn,
            j.SalaJugadorId, j.UserId
       FROM JuegoSala s
       JOIN JuegoSalaJugador j ON j.SalaJugadorId = s.TurnoDeSalaJugadorId
      WHERE s.Estado = 'jugando'
        AND s.RecordatorioTurnoEnviado = 0
        AND s.TurnoVenceEn IS NOT NULL
        AND s.TurnoVenceEn > NOW()
        AND j.UserId <> ?
        AND TIMESTAMPDIFF(SECOND, NOW(), s.TurnoVenceEn) <= s.PlazoTurnoSegundos * " . RH_SALA_FRACCION_AVISO
);
$stmt->bind_param('i', $botId);
$stmt->execute();
$res = $stmt->get_result();
$porVencer = [];
while ($fila = $res->fetch_assoc()) {
    $porVencer[] = $fila;
}
$stmt->close();

$enviados = 0;
$fallidos = 0;

foreach ($porVencer as $s) {
    $salaId = (int) $s['SalaId'];
    $userId = (int) $s['UserId'];

    try {
        if ($dryRun) {
            printf(
                "[dry-run] sala=%d juego=%s turnoDe=%d venceEn=%s\n",
                $salaId,
                $s['JuegoCodigo'],
                $userId,
                $s['TurnoVenceEn']
            );
            $enviados++;
            continue;
        }

        rh_notificar(
            $conn,
            [$userId],
            'juego_turno_por_vencer',
            '¡Se te acaba el tiempo!',
            'Te queda poco tiempo para jugar tu turno de ' . rh_juego_titulo($s['JuegoCodigo']) . ' antes de que te lo salteen.',
            '/(app)/hueplay/sala-lobby/' . $salaId,
            ['juegoCodigo' => $s['JuegoCodigo']]
        );

        $stmt = $conn->prepare('UPDATE JuegoSala SET RecordatorioTurnoEnviado = 1 WHERE SalaId = ?');
        $stmt->bind_param('i', $salaId);
        $stmt->execute();
        $stmt->close();

        $enviados++;
    } catch (Throwable $e) {
        $fallidos++;
        error_log('sala_turno_por_vencer (sala ' . $salaId . '): ' . $e->getMessage());
    }
}

printf(
    "%sRecordatorios de turno de sala: %d %s, %d con error.\n",
    $dryRun ? '[dry-run] ' : '',
    $enviados,
    $dryRun ? 'seleccionados' : 'enviados',
    $fallidos
);
