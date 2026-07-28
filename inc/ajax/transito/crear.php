<?php
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/validacion.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/especies.php';
require_once __DIR__ . '/../../funciones/uploads.php';
require_once __DIR__ . '/../../funciones/mascotas.php';
require_once __DIR__ . '/../../funciones/transito.php';

$userId = rh_require_auth($conn);

if (!rh_usuario_verificado($conn, $userId)) {
    json_error('Necesitás tu cuenta verificada para publicar un tránsito', 403);
}

$tipo = $_POST['tipo'] ?? '';
$mascotaId = isset($_POST['mascotaId']) && $_POST['mascotaId'] !== '' ? (int) $_POST['mascotaId'] : null;
$nombre = trim($_POST['nombre'] ?? '') ?: null;
$sexo = $_POST['sexo'] ?? '';
$especie = trim($_POST['especie'] ?? '') ?: null;
$razaId = isset($_POST['razaId']) && $_POST['razaId'] !== '' ? (int) $_POST['razaId'] : null;
$razaTexto = trim($_POST['razaTexto'] ?? '') ?: null;
$descripcion = trim($_POST['descripcion'] ?? '') ?: null;
$duracionDias = isset($_POST['duracionDias']) && $_POST['duracionDias'] !== '' ? (int) $_POST['duracionDias'] : null;
$zonaDescripcion = trim($_POST['zonaDescripcion'] ?? '');
$zonaLat = isset($_POST['zonaLat']) ? (float) $_POST['zonaLat'] : null;
$zonaLng = isset($_POST['zonaLng']) ? (float) $_POST['zonaLng'] : null;

if (!in_array($tipo, ['necesito', 'ofrezco'], true)) {
    json_error("tipo debe ser 'necesito' o 'ofrezco'");
}
if ($tipo === 'ofrezco' && $mascotaId !== null) {
    json_error('Un tránsito de tipo ofrezco no puede vincularse a una mascota propia');
}
if ($zonaDescripcion === '' || mb_strlen($zonaDescripcion) > 150) {
    json_error('La zona es obligatoria (máx 150 caracteres)');
}
if ($zonaLat === null || $zonaLng === null) {
    json_error('Falta la ubicación del tránsito');
}
if ($duracionDias !== null && $duracionDias <= 0) {
    json_error('duracionDias debe ser mayor a 0');
}
if ($especie !== null && !in_array($especie, rh_especies_validas(), true)) {
    json_error("Especie no válida");
}

$fotos = [];
if ($mascotaId !== null) {
    // tipo='necesito' vinculado a una Mascota propia ya registrada: ignora los campos manuales.
    $stmt = $conn->prepare("SELECT MascotaId FROM Mascota WHERE MascotaId = ? AND UserId = ? AND Estado = 'A'");
    $stmt->bind_param('ii', $mascotaId, $userId);
    $stmt->execute();
    if (!$stmt->get_result()->fetch_assoc()) {
        $stmt->close();
        json_error('La mascota indicada no existe o no te pertenece');
    }
    $stmt->close();

    $nombre = null;
    $sexo = null;
    $especie = null;
    $razaId = null;
    $razaTexto = null;
} else {
    if ($tipo === 'necesito') {
        // Manual, mismos requisitos mínimos que Adopción/Perdidos.
        if ($nombre === null || mb_strlen($nombre) > 60) {
            json_error('El nombre es obligatorio (máx 60 caracteres)');
        }
        if (!in_array($sexo, ['macho', 'hembra'], true)) {
            json_error("El sexo debe ser 'macho' o 'hembra'");
        }
        if ($especie === null) {
            json_error('La especie es obligatoria');
        }
    } else {
        // tipo='ofrezco': no hay animal, nombre/sexo/raza no aplican.
        $nombre = null;
        $sexo = null;
    }

    if ($especie !== null && $razaId) {
        $stmt = $conn->prepare('SELECT RazaId FROM RazaCatalogo WHERE RazaId = ? AND Especie = ?');
        $stmt->bind_param('is', $razaId, $especie);
        $stmt->execute();
        if (!$stmt->get_result()->fetch_assoc()) {
            $stmt->close();
            json_error('La raza seleccionada no corresponde a esa especie');
        }
        $stmt->close();
        $razaTexto = null;
    }

    $fotos = rh_normalizar_archivos_multiples($_FILES['fotos'] ?? null);
    if (count($fotos) > 6) {
        json_error('Máximo 6 fotos por publicación');
    }
    foreach ($fotos as $foto) {
        $error = rh_validar_imagen_subida($foto);
        if ($error) {
            json_error("Foto inválida: $error");
        }
    }
}

$stmt = $conn->prepare(
    'INSERT INTO Transito
        (UserId, Tipo, MascotaId, Nombre, Sexo, Especie, RazaId, RazaTexto, Descripcion,
         DuracionDias, ZonaDescripcion, ZonaLat, ZonaLng)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
);
$stmt->bind_param(
    'isisssissisdd',
    $userId,
    $tipo,
    $mascotaId,
    $nombre,
    $sexo,
    $especie,
    $razaId,
    $razaTexto,
    $descripcion,
    $duracionDias,
    $zonaDescripcion,
    $zonaLat,
    $zonaLng
);
$stmt->execute();
$transitoId = (int) $stmt->insert_id;
$stmt->close();

foreach ($fotos as $index => $foto) {
    $path = rh_guardar_foto_transito($foto, $transitoId);
    $stmt = $conn->prepare('INSERT INTO TransitoFoto (TransitoId, Path, Orden) VALUES (?, ?, ?)');
    $stmt->bind_param('isi', $transitoId, $path, $index);
    $stmt->execute();
    $stmt->close();
}

$stmt = $conn->prepare(
    'SELECT Transito.*,
            Usuario.Username, Usuario.NombreCompleto, Usuario.AvatarPath,
            Usuario.WhatsappNumero, Usuario.WhatsappVisibilidad,
            Mascota.Nombre AS MascotaNombre, Mascota.Sexo AS MascotaSexo, Mascota.Especie AS MascotaEspecie,
            Mascota.RazaId AS MascotaRazaId, Mascota.RazaTexto AS MascotaRazaTexto, Mascota.DescripcionTexto AS MascotaDescripcion
     FROM Transito
     JOIN Usuario ON Usuario.UserId = Transito.UserId
     LEFT JOIN Mascota ON Mascota.MascotaId = Transito.MascotaId
     WHERE Transito.TransitoId = ?'
);
$stmt->bind_param('i', $transitoId);
$stmt->execute();
$transito = $stmt->get_result()->fetch_assoc();
$stmt->close();

json_success(['transito' => rh_transito_publico($conn, $transito, $userId)], 'Publicación de tránsito creada', 201);
