<?php
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/especies.php';
require_once __DIR__ . '/../../funciones/mascotas.php';
require_once __DIR__ . '/../../funciones/uploads.php';

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
if (!in_array($especie, rh_especies_validas(), true)) {
    json_error("Especie no válida");
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

// ---------------------------------------------------------------------------
// Banner de la tarjeta del listado.
//
// La pantalla de edición ya mandaba estos campos, pero acá nadie los leía: se
// guardaba todo lo demás y el banner se descartaba en silencio, así que al
// volver al listado seguía el anterior. Van aparte del UPDATE de arriba porque
// son opcionales — una edición que no toca el banner no debe pisarlo.
// ---------------------------------------------------------------------------
$modoBanner = $_POST['modoBanner'] ?? null;
if ($modoBanner !== null && in_array($modoBanner, ['portada', 'banner'], true)) {
    $stmt = $conn->prepare('UPDATE Mascota SET ModoBanner = ? WHERE MascotaId = ?');
    $stmt->bind_param('si', $modoBanner, $mascotaId);
    $stmt->execute();
    $stmt->close();
}

if (isset($_POST['bannerFocusY']) && $_POST['bannerFocusY'] !== '') {
    // 0 = borde de arriba de la foto, 1 = borde de abajo. Se acota porque llega
    // de un gesto de arrastre y un valor fuera de rango recorta a la nada.
    $focus = max(0.0, min(1.0, (float) $_POST['bannerFocusY']));
    $stmt = $conn->prepare('UPDATE Mascota SET BannerFocusY = ? WHERE MascotaId = ?');
    $stmt->bind_param('di', $focus, $mascotaId);
    $stmt->execute();
    $stmt->close();
}

if (isset($_FILES['banner']) && ($_FILES['banner']['error'] ?? UPLOAD_ERR_NO_FILE) === UPLOAD_ERR_OK) {
    $error = rh_validar_imagen_subida($_FILES['banner']);
    if ($error) {
        json_error("Banner inválido: $error");
    }

    // El archivo viejo se borra para no dejar basura acumulada en la carpeta.
    $stmt = $conn->prepare('SELECT BannerPath FROM Mascota WHERE MascotaId = ?');
    $stmt->bind_param('i', $mascotaId);
    $stmt->execute();
    $anterior = $stmt->get_result()->fetch_assoc()['BannerPath'] ?? null;
    $stmt->close();

    $path = rh_guardar_banner_mascota($_FILES['banner'], $mascotaId);

    $stmt = $conn->prepare('UPDATE Mascota SET BannerPath = ? WHERE MascotaId = ?');
    $stmt->bind_param('si', $path, $mascotaId);
    $stmt->execute();
    $stmt->close();

    if ($anterior) {
        $uploadsRoot = realpath(__DIR__ . '/../../../uploads');
        $abs = $uploadsRoot . DIRECTORY_SEPARATOR
            . str_replace(['/', '\\'], DIRECTORY_SEPARATOR, $anterior);
        if ($uploadsRoot && is_file($abs)) {
            @unlink($abs);
        }
    }
}

$stmt = $conn->prepare('SELECT * FROM Mascota WHERE MascotaId = ?');
$stmt->bind_param('i', $mascotaId);
$stmt->execute();
$actualizada = $stmt->get_result()->fetch_assoc();
$stmt->close();

json_success(['mascota' => rh_mascota_publica($conn, $actualizada, $userId)], 'Mascota actualizada');
