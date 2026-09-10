<?php
/**
 * Resuelve por plazo las partidas de torneo cuya ronda venció: se define un
 * ganador (walkover / el que va mejor) y el hook `rh_torneo_al_cerrar_desafio()`
 * avanza la llave o la tabla.
 *
 * No hay cron en este XAMPP — se programa con schtasks (cada 15 min):
 *   schtasks /create /tn "RH_Torneo_Ronda_Vencida" /tr "C:\xampp\php\php.exe \"C:\xampp\htdocs\Red Huellitas\inc\cli\torneo_ronda_vencida.php\"" /sc minute /mo 15
 */

require_once __DIR__ . '/../funciones/bd.php';
require_once __DIR__ . '/../funciones/notificaciones.php';
require_once __DIR__ . '/../funciones/juegos.php';
require_once __DIR__ . '/../funciones/torneo.php';

$dryRun = in_array('--dry-run', $argv ?? [], true);

$stmt = $conn->prepare(
    "SELECT tp.PartidaId, tp.DesafioId, d.Modo, d.UserIdRetador, d.UserIdRetado,
            d.PuntosRetador, d.PuntosRetado
       FROM TorneoPartida tp
       JOIN JuegoDesafio d ON d.DesafioId = tp.DesafioId
      WHERE tp.Estado = 'jugando' AND tp.VenceEn IS NOT NULL AND tp.VenceEn <= NOW()
        AND d.Estado IN ('pendiente','aceptado')"
);
$stmt->execute();
$vencidas = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
$stmt->close();

$n = 0;
foreach ($vencidas as $v) {
    $did = (int) $v['DesafioId'];
    $ret = (int) $v['UserIdRetador'];
    $rvl = (int) $v['UserIdRetado'];

    if ($dryRun) {
        printf("[dry-run] partida=%d desafio=%d modo=%s\n", $v['PartidaId'], $did, $v['Modo']);
        $n++;
        continue;
    }

    if ($v['Modo'] === 'turnos') {
        // Lo cierra el vencimiento de plazo de partida (tablas); el hook de
        // torneo desempata (gana A si vino null) y avanza.
        $conn->query("UPDATE JuegoDesafio SET PartidaVenceEn = DATE_SUB(NOW(), INTERVAL 1 MINUTE) WHERE DesafioId = $did");
        rh_juego_expirar_partidas($conn, 0);
    } else {
        // Puntaje: define ganador por lo cargado (o walkover al retador) y
        // dispara el hook directo.
        $pr = $v['PuntosRetador'];
        $pt = $v['PuntosRetado'];
        if ($pr !== null && $pt !== null) {
            $ganador = (int) $pr === (int) $pt ? $ret : ((int) $pr > (int) $pt ? $ret : $rvl);
        } elseif ($pr !== null) {
            $ganador = $ret;
        } elseif ($pt !== null) {
            $ganador = $rvl;
        } else {
            $ganador = $ret; // nadie jugó: walkover al primero
        }
        $st = $conn->prepare("UPDATE JuegoDesafio SET Estado = 'terminado', GanadorUserId = ? WHERE DesafioId = ? AND Estado IN ('pendiente','aceptado')");
        $st->bind_param('ii', $ganador, $did);
        $st->execute();
        $st->close();
        rh_torneo_al_cerrar_desafio($conn, $did, $ganador);
    }
    $n++;
}

echo ($dryRun ? '[dry-run] ' : '') . "Rondas de torneo vencidas: $n\n";
