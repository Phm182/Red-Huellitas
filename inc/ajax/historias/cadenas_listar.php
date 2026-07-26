<?php
/**
 * Cadenas activas para la pantalla de explorar, ordenadas por actividad
 * reciente (ver rh_cadenas_listar). Filtros: ?cursor=, ?limit=
 */
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/cadenas.php';

$userId = rh_require_auth($conn);

json_success(rh_cadenas_listar($conn, $userId));
