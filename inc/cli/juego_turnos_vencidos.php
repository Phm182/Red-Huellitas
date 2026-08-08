<?php
/**
 * Cierra por inacción los desafíos por turnos cuyo plazo venció: pierde quien
 * tenía el turno y no jugó a tiempo.
 *
 * Este resultado ya se resuelve solo, de forma perezosa, cuando cualquiera de
 * los dos jugadores abre la bandeja de desafíos (`rh_juego_expirar_desafios()`
 * en `desafio_listar.php`). Este cron cubre el caso contrario: que ninguno de
 * los dos vuelva a abrir la app — sin esto, la notificación de "perdiste por
 * no responder" no llegaría nunca.
 *
 * No hay cron corriendo en este XAMPP — se ejecuta manualmente o programado
 * vía el Programador de Tareas de Windows. El plazo mínimo configurable es 1
 * hora, así que conviene correrlo seguido (cada 15 minutos alcanza):
 *
 *   schtasks /create /tn "RH_Juego_Turnos_Vencidos" /tr "C:\xampp\php\php.exe \"C:\xampp\htdocs\Red Huellitas\inc\cli\juego_turnos_vencidos.php\"" /sc minute /mo 15
 *
 * Ejecución manual (o dry-run, ver abajo):
 *   C:\xampp\php\php.exe "C:\xampp\htdocs\Red Huellitas\inc\cli\juego_turnos_vencidos.php"
 *   C:\xampp\php\php.exe "C:\xampp\htdocs\Red Huellitas\inc\cli\juego_turnos_vencidos.php" --dry-run
 *
 * Cada desafío en su propio try/catch: si uno falla, el resto igual se
 * resuelve — mismo criterio que `juego_recordatorios.php`.
 */

require_once __DIR__ . '/../funciones/bd.php';
require_once __DIR__ . '/../funciones/notificaciones.php';
require_once __DIR__ . '/../funciones/juegos.php';

$dryRun = in_array('--dry-run', $argv ?? [], true);

// Se excluyen los duelos contra la IA: el bot nunca "hace esperar" a nadie, y
// si le tocara el turno es porque el request que jugó por él todavía no
// terminó (nunca queda así por más de una fracción de segundo).
$botId = rh_juego_bot_user_id($conn);

$stmt = $conn->prepare(
    "SELECT * FROM JuegoDesafio
      WHERE Modo = 'turnos' AND Estado IN ('pendiente','aceptado')
        AND ExpiraEn <= NOW()
        AND UserIdRetado <> ?"
);
$stmt->bind_param('i', $botId);
$stmt->execute();
$res = $stmt->get_result();
$vencidos = [];
while ($fila = $res->fetch_assoc()) {
    $vencidos[] = $fila;
}
$stmt->close();

$resueltos = 0;
$fallidos = 0;

foreach ($vencidos as $d) {
    try {
        if ($dryRun) {
            $turnoDe = (int) ($d['TurnoDeUserId'] ?? 0);
            printf(
                "[dry-run] desafio=%d juego=%s turnoDe=%d expiraEn=%s\n",
                (int) $d['DesafioId'],
                $d['JuegoCodigo'],
                $turnoDe,
                $d['ExpiraEn']
            );
            $resueltos++;
            continue;
        }

        $resultado = rh_juego_resolver_turno_vencido($conn, $d);
        if ($resultado['cerrado']) {
            $resueltos++;
        }
    } catch (Throwable $e) {
        $fallidos++;
        error_log('juego_turnos_vencidos (desafio ' . $d['DesafioId'] . '): ' . $e->getMessage());
    }
}

printf(
    "%sTurnos vencidos: %d %s, %d con error.\n",
    $dryRun ? '[dry-run] ' : '',
    $resueltos,
    $dryRun ? 'seleccionados' : 'resueltos',
    $fallidos
);
