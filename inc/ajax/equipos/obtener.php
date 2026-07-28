<?php
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/equipo.php';
require_once __DIR__ . '/../../funciones/calificacion.php';

$viewerUserId = rh_require_auth($conn);

$equipoId = (int) ($_GET['equipoId'] ?? 0);
if ($equipoId <= 0) {
    json_error('Falta equipoId');
}

$stmt = $conn->prepare(
    'SELECT e.*, t.Codigo AS TipoCodigo, t.Nombre AS TipoNombre,
            t.Icono AS TipoIcono, t.Color AS TipoColor
     FROM Equipo e
     JOIN TipoEquipoCatalogo t ON t.TipoEquipoId = e.TipoEquipoId
     WHERE e.EquipoId = ?'
);
$stmt->bind_param('i', $equipoId);
$stmt->execute();
$equipo = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!$equipo || $equipo['Estado'] !== 'A') {
    json_error('Equipo no encontrado', 404);
}

$publico = rh_equipo_publico($conn, $equipo, $viewerUserId);
$publico['miembros'] = rh_equipo_miembros($conn, $equipoId);
$publico['reputacion'] = rh_reputacion($conn, 'equipo', $equipoId);

// Los pedidos pendientes sólo los ve quien puede resolverlos: para el resto
// es información sobre terceros que no les incumbe.
$publico['solicitudesPendientes'] = $publico['puedoAdministrar']
    ? rh_equipo_miembros($conn, $equipoId, 'pendiente')
    : [];

// Las campañas del equipo son la carta de presentación: es lo que la gente
// mira para decidir si confía.
$stmt = $conn->prepare(
    "SELECT CampaniaId, Tipo, Titulo, FechaDesde, FechaHasta, ZonaDescripcion
     FROM Campania
     WHERE EquipoId = ? AND Estado = 'A'
     ORDER BY FechaDesde DESC
     LIMIT 20"
);
$stmt->bind_param('i', $equipoId);
$stmt->execute();
$res = $stmt->get_result();

$campanias = [];
while ($row = $res->fetch_assoc()) {
    $campanias[] = [
        'campaniaId' => (int) $row['CampaniaId'],
        'tipo' => $row['Tipo'],
        'titulo' => $row['Titulo'],
        'fechaDesde' => $row['FechaDesde'],
        'fechaHasta' => $row['FechaHasta'],
        'zonaDescripcion' => $row['ZonaDescripcion'],
    ];
}
$stmt->close();
$publico['campanias'] = $campanias;

json_success(['equipo' => $publico]);
