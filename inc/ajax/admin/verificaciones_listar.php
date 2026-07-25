<?php
/**
 * Bandeja de verificaciones de identidad. Por defecto las pendientes: son las
 * que la evaluación automática no pudo resolver sola y dejan al usuario
 * trabado detrás del portón de verificación.
 *
 * Filtros: ?estado=pendiente|aprobado|rechazado, ?cursor=, ?limit=
 */
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/moderacion.php';

rh_require_admin($conn);

$estado = rh_moderacion_estado(RH_VERIFICACION_ESTADOS);
[$cursor, $limit] = rh_moderacion_paginacion();

$sql = 'SELECT * FROM UsuarioVerificacion WHERE EstadoRevision = ?';
$tipos = 's';
$params = [$estado];

if ($cursor !== null) {
    $sql .= ' AND VerificacionId < ?';
    $tipos .= 'i';
    $params[] = $cursor;
}
$sql .= ' ORDER BY VerificacionId DESC LIMIT ' . $limit;

$stmt = $conn->prepare($sql);
$stmt->bind_param($tipos, ...$params);
$stmt->execute();
$result = $stmt->get_result();

$filas = [];
while ($row = $result->fetch_assoc()) {
    $filas[] = $row;
}
$stmt->close();

$usuarios = rh_moderacion_usuarios($conn, array_map(static fn (array $f) => (int) $f['UserId'], $filas));

$verificaciones = array_map(
    static fn (array $f) => rh_moderacion_verificacion_publica($f, $usuarios[(int) $f['UserId']] ?? null),
    $filas
);

json_success([
    'verificaciones' => $verificaciones,
    'nextCursor' => count($verificaciones) === $limit
        ? $verificaciones[count($verificaciones) - 1]['verificacionId']
        : null,
]);
