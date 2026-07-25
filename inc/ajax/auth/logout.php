<?php
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';

rh_require_auth($conn);
rh_revocar_sesion_actual($conn);

json_success(null, 'Sesión cerrada');
