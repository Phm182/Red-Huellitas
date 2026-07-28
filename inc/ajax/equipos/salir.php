<?php
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/equipo.php';

$userId = rh_require_auth($conn);

$equipoId = (int) ($_POST['equipoId'] ?? 0);
if ($equipoId <= 0) {
    json_error('Falta equipoId');
}

$membresia = rh_equipo_membresia($conn, $equipoId, $userId);
if (!$membresia || $membresia['estado'] !== 'activo') {
    json_error('No sos miembro de este equipo', 409);
}

// El dueño no puede irse y dejar el equipo sin nadie que apruebe miembros ni
// administre. Primero tiene que pasarle el equipo a otro (o darlo de baja).
if ($membresia['rol'] === 'dueno') {
    json_error(
        'Sos el dueño del equipo. Antes de salir pasale el equipo a otro miembro.',
        409
    );
}

$stmt = $conn->prepare(
    "UPDATE EquipoMiembro SET Estado = 'salio', ResueltoEn = NOW(), ResueltoPorUserId = ?
     WHERE EquipoMiembroId = ?"
);
$stmt->bind_param('ii', $userId, $membresia['equipoMiembroId']);
$stmt->execute();
$stmt->close();

json_success(null, 'Saliste del equipo');
