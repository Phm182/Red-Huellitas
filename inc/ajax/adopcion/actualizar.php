<?php
/**
 * Editar publicación de adopción (solo dueño, y solo si sigue editable).
 * Si está en_proceso / adoptado no se puede cambiar la info (evita engaños
 * a quien ya se postuló).
 */
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/especies.php';
require_once __DIR__ . '/../../funciones/uploads.php';
require_once __DIR__ . '/../../funciones/adopcion.php';

$userId = rh_require_auth($conn);

$adopcionId = (int) ($_POST['adopcionId'] ?? 0);
if ($adopcionId <= 0) {
    json_error('Falta adopcionId');
}

$stmt = $conn->prepare(
    'SELECT Adopcion.*, Usuario.Username, Usuario.NombreCompleto, Usuario.AvatarPath,
            Usuario.WhatsappNumero, Usuario.WhatsappVisibilidad, Usuario.ZonaDescripcion
     FROM Adopcion JOIN Usuario ON Usuario.UserId = Adopcion.UserId
     WHERE Adopcion.AdopcionId = ?'
);
$stmt->bind_param('i', $adopcionId);
$stmt->execute();
$adopcion = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!$adopcion || $adopcion['Estado'] !== 'A') {
    json_error('Publicación no encontrada', 404);
}
if ((int) $adopcion['UserId'] !== $userId) {
    json_error('No tenés permiso para editar esta publicación', 403);
}

$lock = rh_adopcion_motivo_bloqueo_edicion($conn, $adopcion);
if ($lock !== null) {
    json_error($lock, 409);
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
    'UPDATE Adopcion
     SET Nombre = ?, Sexo = ?, EdadAnios = ?, EdadMeses = ?, Especie = ?, RazaId = ?, RazaTexto = ?, Descripcion = ?
     WHERE AdopcionId = ?'
);
$stmt->bind_param($tipos, $nombre, $sexo, $edadAnios, $edadMeses, $especie, $razaId, $razaTexto, $descripcion, $adopcionId);
$stmt->execute();
$stmt->close();

// Fotos: `ordenFotos` = JSON ["e:12","n:0","e:15"] + archivos en fotos[]
$ordenRaw = $_POST['ordenFotos'] ?? null;
if ($ordenRaw !== null && $ordenRaw !== '') {
    $slots = json_decode(is_string($ordenRaw) ? $ordenRaw : '[]', true);
    if (!is_array($slots)) {
        json_error('ordenFotos inválido');
    }
    if (count($slots) > 6) {
        json_error('Máximo 6 fotos por listado');
    }

    $nuevas = rh_normalizar_archivos_multiples($_FILES['fotos'] ?? null);
    foreach ($nuevas as $foto) {
        $error = rh_validar_imagen_subida($foto);
        if ($error) {
            json_error("Foto inválida: $error");
        }
    }

    $idsKeep = [];
    foreach ($slots as $slot) {
        if (!is_string($slot)) {
            continue;
        }
        if (str_starts_with($slot, 'e:')) {
            $fid = (int) substr($slot, 2);
            if ($fid > 0) {
                $idsKeep[] = $fid;
            }
        }
    }

    $actuales = rh_adopcion_fotos($conn, $adopcionId);
    $uploadsRoot = realpath(__DIR__ . '/../../../uploads');
    foreach ($actuales as $foto) {
        if (!in_array($foto['adopcionFotoId'], $idsKeep, true)) {
            $stmt = $conn->prepare('DELETE FROM AdopcionFoto WHERE AdopcionFotoId = ? AND AdopcionId = ?');
            $fid = $foto['adopcionFotoId'];
            $stmt->bind_param('ii', $fid, $adopcionId);
            $stmt->execute();
            $stmt->close();
            if ($uploadsRoot && !empty($foto['path'])) {
                $abs = $uploadsRoot . DIRECTORY_SEPARATOR . str_replace(['/', '\\'], DIRECTORY_SEPARATOR, $foto['path']);
                if (is_file($abs)) {
                    @unlink($abs);
                }
            }
        }
    }

    $orden = 0;
    foreach ($slots as $slot) {
        if (!is_string($slot)) {
            continue;
        }
        if (str_starts_with($slot, 'e:')) {
            $fid = (int) substr($slot, 2);
            if ($fid <= 0) {
                continue;
            }
            $stmt = $conn->prepare('UPDATE AdopcionFoto SET Orden = ? WHERE AdopcionFotoId = ? AND AdopcionId = ?');
            $stmt->bind_param('iii', $orden, $fid, $adopcionId);
            $stmt->execute();
            $stmt->close();
            $orden++;
        } elseif (str_starts_with($slot, 'n:')) {
            $idx = (int) substr($slot, 2);
            if (!isset($nuevas[$idx])) {
                continue;
            }
            $path = rh_guardar_foto_adopcion($nuevas[$idx], $adopcionId);
            $stmt = $conn->prepare('INSERT INTO AdopcionFoto (AdopcionId, Path, Orden) VALUES (?, ?, ?)');
            $stmt->bind_param('isi', $adopcionId, $path, $orden);
            $stmt->execute();
            $stmt->close();
            $orden++;
        }
    }
}

$stmt = $conn->prepare(
    'SELECT Adopcion.*, Usuario.Username, Usuario.NombreCompleto, Usuario.AvatarPath,
            Usuario.WhatsappNumero, Usuario.WhatsappVisibilidad, Usuario.ZonaDescripcion
     FROM Adopcion JOIN Usuario ON Usuario.UserId = Adopcion.UserId
     WHERE Adopcion.AdopcionId = ?'
);
$stmt->bind_param('i', $adopcionId);
$stmt->execute();
$actualizada = $stmt->get_result()->fetch_assoc();
$stmt->close();

json_success(['adopcion' => rh_adopcion_publico($conn, $actualizada, $userId, true)], 'Publicación actualizada');
