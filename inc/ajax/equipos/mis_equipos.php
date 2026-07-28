<?php
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/equipo.php';

$userId = rh_require_auth($conn);

json_success([
    'equipos' => rh_equipos_de_usuario($conn, $userId),
    // El catálogo viaja junto para que el alta pueda armar el selector sin
    // un segundo request.
    'tipos' => rh_tipos_equipo($conn),
]);
