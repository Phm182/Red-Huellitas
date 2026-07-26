<?php
/**
 * Limpieza física de Historias vencidas.
 *
 * Las historias expiran por query (`ExpiraEn > NOW()` en cada listado), nunca
 * se borran solas — así que el archivo de video/foto queda en disco para
 * siempre. Este script hace la limpieza real.
 *
 * No hay cron en este XAMPP; se corre a mano o con el Programador de Tareas:
 *
 *   schtasks /create /tn "RH_Limpiar_Historias" /tr "C:\xampp\php\php.exe \"C:\xampp\htdocs\Red Huellitas\inc\cli\limpiar_historias.php\"" /sc daily /st 04:00
 *
 * Ejecución manual:
 *   C:\xampp\php\php.exe "C:\xampp\htdocs\Red Huellitas\inc\cli\limpiar_historias.php" --dry-run
 *   C:\xampp\php\php.exe "C:\xampp\htdocs\Red Huellitas\inc\cli\limpiar_historias.php"
 *
 * Dos cuidados que no son obvios:
 *
 *  1. **Una historia con una denuncia PENDIENTE no se toca.** El panel de
 *     moderación necesita poder ver el contenido denunciado para decidir; si
 *     el script borra el archivo antes, el moderador se queda sin nada que
 *     mirar. Se saltea entera y se vuelve a intentar en la corrida siguiente,
 *     cuando la denuncia ya esté resuelta.
 *
 *  2. `Denuncia.HistoriaId` tiene FK contra `Historia`, así que la fila no se
 *     puede borrar mientras alguna denuncia la referencie. Las denuncias ya
 *     resueltas se desenganchan (`HistoriaId = NULL`): conservan motivo, nota
 *     y quién las resolvió — sólo pierden el puntero a un contenido que ya
 *     no existe.
 */

require_once __DIR__ . '/../funciones/bd.php';
require_once __DIR__ . '/../funciones/uploads.php';

/**
 * Días de margen después del vencimiento antes de borrar. Las historias
 * vencen a las 24hs; esperar una semana da tiempo a que una denuncia recién
 * hecha se revise, y a recuperar algo a mano si hiciera falta.
 */
const RH_HISTORIAS_DIAS_MARGEN = 7;

$dryRun = in_array('--dry-run', $argv ?? [], true);
$prefijo = $dryRun ? '[dry-run] ' : '';

// El COUNT de denuncias pendientes se resuelve en la misma query para no
// hacer N+1 sobre una tabla que puede tener miles de filas viejas.
$sql = "SELECT Historia.HistoriaId, Historia.UserId, Historia.MediaPath, Historia.ExpiraEn,
               (SELECT COUNT(*) FROM Denuncia
                 WHERE Denuncia.HistoriaId = Historia.HistoriaId
                   AND Denuncia.EstadoRevision = 'pendiente') AS DenunciasPendientes
        FROM Historia
        WHERE Historia.ExpiraEn < NOW() - INTERVAL ? DAY
        ORDER BY Historia.HistoriaId";

$margen = RH_HISTORIAS_DIAS_MARGEN;
$stmt = $conn->prepare($sql);
$stmt->bind_param('i', $margen);
$stmt->execute();
$result = $stmt->get_result();

$filas = [];
while ($fila = $result->fetch_assoc()) {
    $filas[] = $fila;
}
$stmt->close();

$borradas = 0;
$archivosBorrados = 0;
$bytesLiberados = 0;
$salteadasPorDenuncia = 0;
$archivosAusentes = 0;
$fallidas = 0;

foreach ($filas as $fila) {
    $historiaId = (int) $fila['HistoriaId'];

    if ((int) $fila['DenunciasPendientes'] > 0) {
        $salteadasPorDenuncia++;
        echo "{$prefijo}historia #$historiaId: se saltea, tiene una denuncia sin resolver\n";
        continue;
    }

    // Cada historia en su propio try/catch: si una falla (archivo bloqueado,
    // FK inesperada), el resto igual se limpia. Mismo criterio que
    // ingestar_noticias.php y juego_recordatorios.php.
    try {
        $archivo = rh_dir_historias((int) $fila['UserId']) . '/' . basename((string) $fila['MediaPath']);
        $tamanio = is_file($archivo) ? (int) filesize($archivo) : 0;

        if ($dryRun) {
            printf(
                "[dry-run] historia #%d (vencida %s) → borra %s%s\n",
                $historiaId,
                $fila['ExpiraEn'],
                $fila['MediaPath'],
                $tamanio > 0 ? sprintf(' (%.1f KB)', $tamanio / 1024) : ' (archivo ya ausente)'
            );
            $borradas++;
            $bytesLiberados += $tamanio;
            if ($tamanio === 0) {
                $archivosAusentes++;
            } else {
                $archivosBorrados++;
            }
            continue;
        }

        if ($tamanio > 0) {
            if (@unlink($archivo)) {
                $archivosBorrados++;
                $bytesLiberados += $tamanio;
            } else {
                // Si el archivo no se pudo borrar, no se borra la fila: sin la
                // fila se pierde el path y el archivo queda huérfano para
                // siempre. Se reintenta en la corrida siguiente.
                throw new RuntimeException("no se pudo borrar el archivo $archivo");
            }
        } else {
            $archivosAusentes++;
        }

        $stmt = $conn->prepare('DELETE FROM HistoriaVista WHERE HistoriaId = ?');
        $stmt->bind_param('i', $historiaId);
        $stmt->execute();
        $stmt->close();

        // Denuncias ya resueltas: se desenganchan para liberar la FK.
        $stmt = $conn->prepare('UPDATE Denuncia SET HistoriaId = NULL WHERE HistoriaId = ?');
        $stmt->bind_param('i', $historiaId);
        $stmt->execute();
        $stmt->close();

        $stmt = $conn->prepare('DELETE FROM Historia WHERE HistoriaId = ?');
        $stmt->bind_param('i', $historiaId);
        $stmt->execute();
        $stmt->close();

        $borradas++;
    } catch (Throwable $e) {
        $fallidas++;
        $mensaje = 'limpiar_historias (historia ' . $historiaId . '): ' . $e->getMessage();
        error_log($mensaje);
        echo "ERROR $mensaje\n";
    }
}

printf(
    "%sHistorias vencidas hace más de %d días: %d encontradas, %d %s, %d archivos borrados (%.1f MB), %d sin archivo en disco, %d salteadas por denuncia pendiente, %d con error.\n",
    $prefijo,
    RH_HISTORIAS_DIAS_MARGEN,
    count($filas),
    $borradas,
    $dryRun ? 'se borrarían' : 'borradas',
    $archivosBorrados,
    $bytesLiberados / 1048576,
    $archivosAusentes,
    $salteadasPorDenuncia,
    $fallidas
);
