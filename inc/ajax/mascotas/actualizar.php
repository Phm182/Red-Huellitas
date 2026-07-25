<?php
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/mascotas.php';

$userId = rh_require_auth($conn);

$mascotaId = (int) ($_POST['mascotaId'] ?? 0);
if ($mascotaId <= 0) {
    json_error('Falta mascotaId');
}

$stmt = $conn->prepare('SELECT * FROM Mascota WHERE MascotaId = ?');
$stmt->bind_param('i', $mascotaId);
$stmt->execute();
$mascota = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!$mascota) {
    json_error('Mascota no encontrada', 404);
}
if ((int) $mascota['UserId'] !== $userId) {
    json_error('No tenés permiso para editar esta mascota', 403);
}

$nombre = trim($_POST['nombre'] ?? '');
$sexo = $_POST['sexo'] ?? '';
$especie = $_POST['especie'] ?? '';
$razaId = isset($_POST['razaId']) && $_POST['razaId'] !== '' ? (int) $_POST['razaId'] : null;
$razaTexto = trim($_POST['razaTexto'] ?? '') ?: null;
$edadAnios = isset($_POST['edadAnios']) && $_POST['edadAnios'] !== '' ? (int) $_POST['edadAnios'] : null;
$edadMeses = isset($_POST['edadMeses']) && $_POST['edadMeses'] !== '' ? (int) $_POST['edadMeses'] : null;
$descripcion = trim($_POST['descripcion'] ?? '') ?: null;

if ($nombre === '' || mb_strlen($nombre) > 60) {
    json_error('El nombre es obligatorio (máx 60 caracteres)');
}
if (!in_array($sexo, ['macho', 'hembra'], true)) {
    json_error("El sexo debe ser 'macho' o 'hembra'");
}
if (!in_array($especie, ['perro', 'gato', 'otro'], true)) {
    json_error("La especie debe ser 'perro', 'gato' u 'otro'");
}
if (!$razaId && !$razaTexto) {
    json_error('Debés indicar una raza (del catálogo o a texto libre)');
}
if ($razaId) {
    $stmtRaza = $conn->prepare('SELECT RazaId FROM RazaCatalogo WHERE RazaId = ? AND Especie = ?');
    $stmtRaza->bind_param('is', $razaId, $especie);
    $stmtRaza->execute();
    if (!$stmtRaza->get_result()->fetch_assoc()) {
        $stmtRaza->close();
        json_error('La raza seleccionada no corresponde a esa especie');
    }
    $stmtRaza->close();
    $razaTexto = null;
}

$tipos = implode('', ['s', 's', 'i', 'i', 's', 'i', 's', 's', 'i']);
$stmt = $conn->prepare(
    'UPDATE Mascota
     SET Nombre = ?, Sexo = ?, EdadAnios = ?, EdadMeses = ?, Especie = ?, RazaId = ?, RazaTexto = ?, DescripcionTexto = ?
     WHERE MascotaId = ?'
);
$stmt->bind_param($tipos, $nombre, $sexo, $edadAnios, $edadMeses, $especie, $razaId, $razaTexto, $descripcion, $mascotaId);
$stmt->execute();
$stmt->close();

$stmt = $conn->prepare('SELECT * FROM Mascota WHERE MascotaId = ?');
$stmt->bind_param('i', $mascotaId);
$stmt->execute();
$actualizada = $stmt->get_result()->fetch_assoc();
$stmt->close();

json_success(['mascota' => rh_mascota_publica($conn, $actualizada, $userId)], 'Mascota actualizada');
