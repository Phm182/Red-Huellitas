<?php
/**
 * El ranking acumulado de HuePlay: suma los tres retos diarios en una ventana
 * de tiempo (día/semana/mes/año). Es distinto de `diario_ranking.php`, que es
 * la tabla de un solo juego en un solo día.
 */
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/diario.php';

$userId = rh_require_auth($conn);

$periodo = trim($_GET['periodo'] ?? 'dia');
if (!array_key_exists($periodo, RH_DIARIO_PERIODOS)) {
    json_error('Período inválido');
}

$limite = isset($_GET['limite']) ? (int) $_GET['limite'] : 30;

json_success(rh_diario_ranking_periodo($conn, $periodo, $userId, $limite));
