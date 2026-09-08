<?php
/**
 * Avisa UNA vez cuando quedan ~15 minutos para que venza el turno de un
 * desafío por turnos (HueSoccer, Damas, Ajedrez, Conecta4 1 contra 1).
 *
 * Es el ÚNICO recordatorio aparte del aviso al pasar el turno
 * (`rh_juego_avanzar_turno`, en juegos.php) — a propósito no hay más: el
 * pedido fue exactamente "una vez cuando te toca, una vez cerca de vencer",
 * nada de avisos repetidos mientras se espera.
 *
 * `RecordatorioTurnoEnviado` evita mandarlo dos veces para el mismo turno; se
 * resetea a 0 en cada `rh_juego_avanzar_turno` (turno nuevo = cuenta
 * regresiva nueva). Conviene correrlo cada 5 minutos: la ventana de "15
 * minutos para vencer" dura 15 minutos reales, así que aunque el cron se
 * atrase un poco no se pierde el aviso ni se manda tarde.
 *
 *   schtasks /create /tn "RH_Juego_Turno_Por_Vencer" /tr "C:\xampp\php\php.exe \"C:\xampp\htdocs\Red Huellitas\inc\cli\juego_turno_por_vencer.php\"" /sc minute /mo 5
 *
 * Ejecución manual (o dry-run, ver abajo):
 *   C:\xampp\php\php.exe "C:\xampp\htdocs\Red Huellitas\inc\cli\juego_turno_por_vencer.php"
 *   C:\xampp\php\php.exe "C:\xampp\htdocs\Red Huellitas\inc\cli\juego_turno_por_vencer.php" --dry-run
 *
 * Cada desafío en su propio try/catch: si uno falla, el resto igual se avisa
 * — mismo criterio que juego_turnos_vencidos.php.
 */

require_once __DIR__ . '/../funciones/bd.php';
require_once __DIR__ . '/../funciones/notificaciones.php';
require_once __DIR__ . '/../funciones/juegos.php';

$dryRun = in_array('--dry-run', $argv ?? [], true);

// Contra la IA nunca hay que esperar (el bot juega en el mismo request), así
// que no tiene sentido recordarle nada a nadie ahí.
$botId = rh_juego_bot_user_id($conn);

$stmt = $conn->prepare(
    "SELECT * FROM JuegoDesafio
      WHERE Modo = 'turnos' AND Estado IN ('pendiente','aceptado')
        AND RecordatorioTurnoEnviado = 0
        AND TurnoDeUserId IS NOT NULL AND TurnoDeUserId <> ?
        AND ExpiraEn > NOW()
        AND ExpiraEn <= DATE_ADD(NOW(), INTERVAL 15 MINUTE)"
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

foreach ($porVencer as $d) {
    $desafioId = (int) $d['DesafioId'];
    $turnoDeUserId = (int) $d['TurnoDeUserId'];

    try {
        if ($dryRun) {
            printf(
                "[dry-run] desafio=%d juego=%s turnoDe=%d expiraEn=%s\n",
                $desafioId,
                $d['JuegoCodigo'],
                $turnoDeUserId,
                $d['ExpiraEn']
            );
            $enviados++;
            continue;
        }

        rh_notificar(
            $conn,
            [$turnoDeUserId],
            'juego_turno_por_vencer',
            '¡Se te acaba el tiempo!',
            'Tenés 15 minutos para jugar tu turno de ' . rh_juego_titulo($d['JuegoCodigo']) . ' antes de perder por no responder.',
            '/(app)/hueplay/desafios',
            ['juegoCodigo' => $d['JuegoCodigo']]
        );

        $stmt = $conn->prepare(
            'UPDATE JuegoDesafio SET RecordatorioTurnoEnviado = 1 WHERE DesafioId = ?'
        );
        $stmt->bind_param('i', $desafioId);
        $stmt->execute();
        $stmt->close();

        $enviados++;
    } catch (Throwable $e) {
        $fallidos++;
        error_log('juego_turno_por_vencer (desafio ' . $desafioId . '): ' . $e->getMessage());
    }
}

printf(
    "%sRecordatorios de turno: %d %s, %d con error.\n",
    $dryRun ? '[dry-run] ' : '',
    $enviados,
    $dryRun ? 'seleccionados' : 'enviados',
    $fallidos
);
