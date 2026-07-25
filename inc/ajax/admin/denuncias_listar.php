<?php
/**
 * Bandeja de denuncias. Cada fila trae denunciante, denunciado y qué
 * contenido se denunció, para que el panel pueda linkear a la pantalla real
 * de ese contenido.
 *
 * Filtros: ?estado=pendiente|revisada|desestimada, ?cursor=, ?limit=
 */
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/moderacion.php';

rh_require_admin($conn);

$estado = rh_moderacion_estado(RH_DENUNCIA_ESTADOS);
[$cursor, $limit] = rh_moderacion_paginacion();

$sql = 'SELECT * FROM Denuncia WHERE EstadoRevision = ?';
$tipos = 's';
$params = [$estado];

if ($cursor !== null) {
    $sql .= ' AND DenunciaId < ?';
    $tipos .= 'i';
    $params[] = $cursor;
}
$sql .= ' ORDER BY DenunciaId DESC LIMIT ' . $limit;

$stmt = $conn->prepare($sql);
$stmt->bind_param($tipos, ...$params);
$stmt->execute();
$result = $stmt->get_result();

$filas = [];
while ($row = $result->fetch_assoc()) {
    $filas[] = $row;
}
$stmt->close();

$ids = [];
foreach ($filas as $fila) {
    $ids[] = (int) $fila['UserIdDenunciante'];
    $ids[] = (int) $fila['UserIdDenunciado'];
}
$usuarios = rh_moderacion_usuarios($conn, $ids);

$denuncias = array_map(
    static fn (array $f) => rh_moderacion_denuncia_publica(
        $f,
        $usuarios[(int) $f['UserIdDenunciante']] ?? null,
        $usuarios[(int) $f['UserIdDenunciado']] ?? null
    ),
    $filas
);

json_success([
    'denuncias' => $denuncias,
    'nextCursor' => count($denuncias) === $limit ? $denuncias[count($denuncias) - 1]['denunciaId'] : null,
]);
