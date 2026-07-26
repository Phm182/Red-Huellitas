<?php
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/noticias.php';
require_once __DIR__ . '/../../funciones/noticias_ingesta.php';

rh_require_auth($conn);

// cursor = offset de la lista mezclada (0, 20, 40…).
$offset = isset($_GET['cursor']) && $_GET['cursor'] !== '' ? max(0, (int) $_GET['cursor']) : 0;
$limit = isset($_GET['limit']) ? max(1, min(50, (int) $_GET['limit'])) : 20;

// Primera página: si la tabla está vacía o vieja, intenta RSS rápido.
if ($offset === 0) {
    @set_time_limit(45);
    rh_noticias_asegurar_recientes($conn, 6);
}

$resultado = rh_noticias_listar_mezcladas($conn, $offset, $limit);

json_success([
    'noticias' => $resultado['noticias'],
    'nextCursor' => $resultado['nextCursor'],
]);
