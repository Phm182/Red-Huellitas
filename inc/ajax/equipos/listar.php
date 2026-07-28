<?php
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/equipo.php';
require_once __DIR__ . '/../../funciones/calificacion.php';

$viewerUserId = rh_require_auth($conn);

$tipoCodigo = trim($_GET['tipo'] ?? '');
$busqueda = trim($_GET['q'] ?? '');
$limite = isset($_GET['limite']) ? (int) $_GET['limite'] : 50;
$limite = max(1, min(100, $limite));

$where = ["e.Estado = 'A'"];
$params = [];
$tipos = '';

if ($tipoCodigo !== '') {
    $where[] = 't.Codigo = ?';
    $params[] = $tipoCodigo;
    $tipos .= 's';
}
if ($busqueda !== '') {
    $where[] = '(e.Nombre LIKE ? OR e.ZonaDescripcion LIKE ?)';
    $like = '%' . $busqueda . '%';
    $params[] = $like;
    $params[] = $like;
    $tipos .= 'ss';
}

$sql = 'SELECT e.*, t.Codigo AS TipoCodigo, t.Nombre AS TipoNombre,
               t.Icono AS TipoIcono, t.Color AS TipoColor
        FROM Equipo e
        JOIN TipoEquipoCatalogo t ON t.TipoEquipoId = e.TipoEquipoId
        WHERE ' . implode(' AND ', $where) . '
        ORDER BY e.Verificado DESC, e.Nombre ASC
        LIMIT ?';
$params[] = $limite;
$tipos .= 'i';

$stmt = $conn->prepare($sql);
$stmt->bind_param($tipos, ...$params);
$stmt->execute();
$res = $stmt->get_result();

$equipos = [];
while ($row = $res->fetch_assoc()) {
    $equipo = rh_equipo_publico($conn, $row, $viewerUserId);
    $equipo['reputacion'] = rh_reputacion($conn, 'equipo', $equipo['equipoId']);
    $equipos[] = $equipo;
}
$stmt->close();

json_success(['equipos' => $equipos]);
