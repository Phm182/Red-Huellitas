<?php
/**
 * Ingesta de Noticias externas para la pestaña "General" de Noticias.
 *
 * No hay cron corriendo en este XAMPP — este script se ejecuta manualmente o
 * programado vía el Programador de Tareas de Windows, por ejemplo cada 6hs:
 *
 *   schtasks /create /tn "RH_Ingesta_Noticias" /tr "C:\xampp\php\php.exe \"C:\xampp\htdocs\Red Huellitas\inc\cli\ingestar_noticias.php\"" /sc hourly /mo 6
 *
 * Ejecución manual:
 *   C:\xampp\php\php.exe "C:\xampp\htdocs\Red Huellitas\inc\cli\ingestar_noticias.php"
 *
 * Cada fuente corre en su propio try/catch: si una fuente está caída o
 * cambió su HTML, las demás igual se ingestan (no se detiene todo el run).
 */

require_once __DIR__ . '/../funciones/bd.php';
require_once __DIR__ . '/../funciones/noticias_ingesta.php';

$fuentes = rh_noticias_fuentes_ingesta();

foreach ($fuentes as $nombre => $funcion) {
    try {
        $total = $funcion($conn);
        echo "[$nombre] OK: $total noticias procesadas\n";
    } catch (Throwable $e) {
        echo "[$nombre] FALLÓ: " . $e->getMessage() . "\n";
    }
}
