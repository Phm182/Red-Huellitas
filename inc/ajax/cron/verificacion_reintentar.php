<?php
/**
 * Reintenta verificaciones automáticas pendientes (cuota Gemini, errores, etc.).
 *
 * Llamar cada 10–15 min desde el programador de tareas / cron:
 *   curl "https://tudominio/inc/ajax/cron/verificacion_reintentar.php?token=SECRETO"
 *
 * El token se configura en gemini.local.php como CRON_VERIFICACION_TOKEN
 * (o variable de entorno RH_CRON_TOKEN). Sin token válido responde 403.
 *
 * No pisa resoluciones manuales (RevisadoPor).
 */
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/uploads.php';
require_once __DIR__ . '/../../funciones/verificacion_auto.php';
require_once __DIR__ . '/../../funciones/gemini.php';

$config = rh_gemini_config();
$esperado = (string) ($config['CRON_VERIFICACION_TOKEN'] ?? getenv('RH_CRON_TOKEN') ?: '');
$recibido = (string) ($_GET['token'] ?? $_POST['token'] ?? '');

if ($esperado === '' || !hash_equals($esperado, $recibido)) {
    json_error('No autorizado', 403);
}

@set_time_limit(300);
$limite = isset($_GET['limit']) ? (int) $_GET['limit'] : 10;
$stats = rh_verificacion_auto_reintentar_pendientes($conn, $limite);

json_success($stats, 'Reintentos procesados');
