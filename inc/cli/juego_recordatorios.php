<?php
/**
 * Recordatorios del minijuego: avisa a los usuarios cuya mascota tiene los
 * stats bajos ("tu mascota te extraña").
 *
 * No hay cron corriendo en este XAMPP — se ejecuta manualmente o programado
 * vía el Programador de Tareas de Windows. Una vez por día alcanza:
 *
 *   schtasks /create /tn "RH_Juego_Recordatorios" /tr "C:\xampp\php\php.exe \"C:\xampp\htdocs\Red Huellitas\inc\cli\juego_recordatorios.php\"" /sc daily /st 19:00
 *
 * Ejecución manual (o dry-run, ver abajo):
 *   C:\xampp\php\php.exe "C:\xampp\htdocs\Red Huellitas\inc\cli\juego_recordatorios.php"
 *   C:\xampp\php\php.exe "C:\xampp\htdocs\Red Huellitas\inc\cli\juego_recordatorios.php" --dry-run
 *
 * Manda UN push por usuario (no uno por mascota) para no spamear a quien
 * tiene varias. Cada usuario en su propio try/catch: si uno falla, el resto
 * igual recibe — mismo criterio que ingestar_noticias.php.
 *
 * El tono es siempre cálido y nunca alarmista: la mascota del juego es la
 * mascota real del usuario, y nunca se enferma ni muere.
 */

require_once __DIR__ . '/../funciones/bd.php';
require_once __DIR__ . '/../funciones/mascotas.php';
require_once __DIR__ . '/../funciones/juego.php';
require_once __DIR__ . '/../funciones/push.php';
require_once __DIR__ . '/../funciones/notificaciones.php';

/** Por debajo de este promedio de stats se considera que vale avisar. */
const RH_JUEGO_UMBRAL_RECORDATORIO = 40;

/** No molestar más de una vez cada tantas horas al mismo usuario. */
const RH_JUEGO_MIN_HORAS_ENTRE_AVISOS = 20;

$dryRun = in_array('--dry-run', $argv ?? [], true);

// Los campos de tiempo los calcula MySQL (rh_juego_campos_tiempo), igual que
// en los endpoints: sin ellos rh_juego_stats_actuales() no aplica el decay y
// leería los stats como si nadie hubiera dejado pasar el tiempo.
$sql = 'SELECT MascotaJuego.*, ' . rh_juego_campos_tiempo() . ",
               TIMESTAMPDIFF(SECOND, MascotaJuego.UpdatedAt, NOW()) AS SegundosDesdeAccion,
               Mascota.Nombre, Usuario.ExpoPushToken
        FROM MascotaJuego
        JOIN Mascota ON Mascota.MascotaId = MascotaJuego.MascotaId AND Mascota.Estado = 'A'
        JOIN Usuario ON Usuario.UserId = MascotaJuego.UserId
        WHERE Usuario.NotificarJuego = 1
          AND Usuario.Estado = 'A'";

// Ya no se filtra por token: ahora el recordatorio se guarda como notificación
// aunque el usuario no tenga push (entra sólo por web, o el token venció), y
// lo va a ver igual al abrir la app.
$stmt = $conn->prepare($sql);
$stmt->execute();
$result = $stmt->get_result();

// Se agrupa por usuario y se queda con la mascota más necesitada de cada uno.
$porUsuario = [];
while ($fila = $result->fetch_assoc()) {
    $stats = rh_juego_stats_actuales($fila);
    $promedio = array_sum($stats) / count($stats);

    if ($promedio >= RH_JUEGO_UMBRAL_RECORDATORIO) {
        continue;
    }

    // No molestar a quien estuvo jugando hace poco. UpdatedAt sólo cambia
    // cuando hay una acción real, así que sirve como "última vez que estuvo".
    $horasDesdeUltimaAccion = ((int) $fila['SegundosDesdeAccion']) / 3600;
    if ($horasDesdeUltimaAccion < RH_JUEGO_MIN_HORAS_ENTRE_AVISOS) {
        continue;
    }

    $userId = (int) $fila['UserId'];
    if (!isset($porUsuario[$userId]) || $promedio < $porUsuario[$userId]['promedio']) {
        $porUsuario[$userId] = [
            'token' => $fila['ExpoPushToken'],
            'nombre' => $fila['Nombre'],
            'mascotaId' => (int) $fila['MascotaId'],
            'promedio' => $promedio,
            'animo' => rh_juego_animo($stats),
        ];
    }
}
$stmt->close();

$enviados = 0;
$fallidos = 0;

foreach ($porUsuario as $userId => $datos) {
    try {
        $nombre = $datos['nombre'];
        $titulo = "$nombre te extraña 🐾";
        $body = $datos['animo'] === 'decaido'
            ? "Hace rato que no pasás. Entrá un ratito a jugar con $nombre."
            : "A $nombre le vendría bien un mimo. ¿Le das una vuelta?";

        if ($dryRun) {
            printf(
                "[dry-run] user=%d mascota=%s (#%d) promedio=%.1f animo=%s token=%s\n",
                $userId,
                $nombre,
                $datos['mascotaId'],
                $datos['promedio'],
                $datos['animo'],
                $datos['token'] === null ? '(sin token)' : 'sí'
            );
            $enviados++;
            continue;
        }

        // Con mascotaId: el recordatorio del juego aparece en el botón de
        // animales y dentro de la ficha de esa mascota, no en la campanita
        // general — es una interacción de ESA mascota.
        rh_notificar(
            $conn,
            [(int) $userId],
            'juego_recordatorio',
            $titulo,
            $body,
            '/(app)/juego/' . $datos['mascotaId'],
            ['mascotaId' => (int) $datos['mascotaId']]
        );
        $enviados++;
    } catch (Throwable $e) {
        $fallidos++;
        error_log('juego_recordatorios (user ' . $userId . '): ' . $e->getMessage());
    }
}

printf(
    "%sRecordatorios: %d %s, %d con error.\n",
    $dryRun ? '[dry-run] ' : '',
    $enviados,
    $dryRun ? 'seleccionados' : 'enviados',
    $fallidos
);
