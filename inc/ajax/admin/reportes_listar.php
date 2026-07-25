<?php
/**
 * Bandeja de reportes de mejora/falla que mandan los usuarios desde la app.
 *
 * Filtros: ?estado=pendiente|resuelto|descartado, ?tipo=mejora|falla,
 *          ?cursor=, ?limit=
 */
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/moderacion.php';

rh_require_admin($conn);

$estado = rh_moderacion_estado(RH_REPORTE_ESTADOS);
$tipo = isset($_GET['tipo']) && in_array($_GET['tipo'], ['mejora', 'falla'], true)
    ? (string) $_GET['tipo']
    : null;
[$cursor, $limit] = rh_moderacion_paginacion();

$sql = 'SELECT * FROM ReporteSolicitud WHERE EstadoRevision = ?';
$tipos = 's';
$params = [$estado];

if ($tipo !== null) {
    $sql .= ' AND Tipo = ?';
    $tipos .= 's';
    $params[] = $tipo;
}
if ($cursor !== null) {
    $sql .= ' AND ReporteId < ?';
    $tipos .= 'i';
    $params[] = $cursor;
}
$sql .= ' ORDER BY ReporteId DESC LIMIT ' . $limit;

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

$reportes = array_map(
    static fn (array $f) => rh_moderacion_reporte_publico($f, $usuarios[(int) $f['UserId']] ?? null),
    $filas
);

json_success([
    'reportes' => $reportes,
    'nextCursor' => count($reportes) === $limit ? $reportes[count($reportes) - 1]['reporteId'] : null,
]);
