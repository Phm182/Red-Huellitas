<?php
/**
 * Contadores de las tres bandejas pendientes, para el hub del panel.
 */
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/moderacion.php';

rh_require_admin($conn);

json_success(rh_moderacion_resumen($conn));
