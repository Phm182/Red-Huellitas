<?php
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/suscripcion.php';

rh_require_auth($conn);

json_success(['planes' => rh_planes_activos($conn)]);
