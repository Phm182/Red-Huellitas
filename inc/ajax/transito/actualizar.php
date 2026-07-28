<?php
/**
 * Editar una publicación de tránsito (sólo el dueño).
 *
 * No se puede cambiar `tipo` ni la mascota vinculada: eso convertiría la
 * publicación en otra distinta de la que la gente vio. Para eso se elimina y
 * se crea de nuevo.
 */
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/validacion.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/especies.php';
require_once __DIR__ . '/../../funciones/uploads.php';
require_once __DIR__ . '/../../funciones/mascotas.php';
require_once __DIR__ . '/../../funciones/transito.php';
require_once __DIR__ . '/../../funciones/edicion.php';

$userId = rh_require_auth($conn);

$transitoId = (int) ($_POST['transitoId'] ?? 0);
if ($transitoId <= 0) {
    json_error('Falta transitoId');
}

$sqlDetalle =
    'SELECT Transito.*,
            Usuario.Username, Usuario.NombreCompleto, Usuario.AvatarPath,
            Usuario.WhatsappNumero, Usuario.WhatsappVisibilidad,
            Mascota.Nombre AS MascotaNombre, Mascota.Sexo AS MascotaSexo, Mascota.Especie AS MascotaEspecie,
            Mascota.RazaId AS MascotaRazaId, Mascota.RazaTexto AS MascotaRazaTexto,
            Mascota.DescripcionTexto AS MascotaDescripcion
     FROM Transito
     JOIN Usuario ON Usuario.UserId = Transito.UserId
     LEFT JOIN Mascota ON Mascota.MascotaId = Transito.MascotaId
     WHERE Transito.TransitoId = ?';

$stmt = $conn->prepare($sqlDetalle);
$stmt->bind_param('i', $transitoId);
$stmt->execute();
$transito = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!$transito || $transito['Estado'] !== 'A') {
    json_error('Publicación no encontrada', 404);
}
if ((int) $transito['UserId'] !== $userId) {
    json_error('No tenés permiso para editar esta publicación', 403);
}

$lock = rh_transito_motivo_bloqueo_edicion($transito);
if ($lock !== null) {
    json_error($lock, 409);
}

$tipo = $transito['Tipo'];
$vinculada = $transito['MascotaId'] !== null;

$descripcion = trim($_POST['descripcion'] ?? '') ?: null;
$duracionDias = isset($_POST['duracionDias']) && $_POST['duracionDias'] !== '' ? (int) $_POST['duracionDias'] : null;
$zonaDescripcion = trim($_POST['zonaDescripcion'] ?? '');
$zonaLat = isset($_POST['zonaLat']) && $_POST['zonaLat'] !== '' ? (float) $_POST['zonaLat'] : null;
$zonaLng = isset($_POST['zonaLng']) && $_POST['zonaLng'] !== '' ? (float) $_POST['zonaLng'] : null;

if ($zonaDescripcion === '' || mb_strlen($zonaDescripcion) > 150) {
    json_error('La zona es obligatoria (máx 150 caracteres)');
}
if ($zonaLat === null || $zonaLng === null) {
    json_error('Falta la ubicación del tránsito');
}
if ($duracionDias !== null && $duracionDias <= 0) {
    json_error('duracionDias debe ser mayor a 0');
}

if ($vinculada) {
    // Los datos del animal salen de la Mascota: acá sólo se edita la publicación.
    $stmt = $conn->prepare(
        'UPDATE Transito SET Descripcion = ?, DuracionDias = ?, ZonaDescripcion = ?, ZonaLat = ?, ZonaLng = ?
         WHERE TransitoId = ? AND UserId = ?'
    );
    $stmt->bind_param(
        'sisddii',
        $descripcion, $duracionDias, $zonaDescripcion, $zonaLat, $zonaLng, $transitoId, $userId
    );
    $stmt->execute();
    $stmt->close();
} else {
    $nombre = trim($_POST['nombre'] ?? '') ?: null;
    $sexo = trim($_POST['sexo'] ?? '') ?: null;
    $especie = trim($_POST['especie'] ?? '') ?: null;
    $razaId = isset($_POST['razaId']) && $_POST['razaId'] !== '' ? (int) $_POST['razaId'] : null;
    $razaTexto = trim($_POST['razaTexto'] ?? '') ?: null;

    if ($especie !== null && !in_array($especie, rh_especies_validas(), true)) {
        json_error("Especie no válida");
    }

    if ($tipo === 'necesito') {
        // Mismos mínimos que crear.php: si es un animal concreto, tiene que
        // seguir teniendo nombre, sexo y especie después de editar.
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
        // 'ofrezco' no describe a ningún animal en particular.
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

    $stmt = $conn->prepare(
        'UPDATE Transito
         SET Nombre = ?, Sexo = ?, Especie = ?, RazaId = ?, RazaTexto = ?, Descripcion = ?,
             DuracionDias = ?, ZonaDescripcion = ?, ZonaLat = ?, ZonaLng = ?
         WHERE TransitoId = ? AND UserId = ?'
    );
    $stmt->bind_param(
        'sssissisddii',
        $nombre, $sexo, $especie, $razaId, $razaTexto, $descripcion,
        $duracionDias, $zonaDescripcion, $zonaLat, $zonaLng, $transitoId, $userId
    );
    $stmt->execute();
    $stmt->close();

    // Sólo las publicaciones manuales tienen galería propia; las vinculadas
    // muestran las fotos de la Mascota y se editan desde ahí.
    rh_sincronizar_fotos(
        $conn,
        'Transito',
        $transitoId,
        $_POST['ordenFotos'] ?? null,
        $_FILES['fotos'] ?? null,
        'rh_guardar_foto_transito'
    );
}

$stmt = $conn->prepare($sqlDetalle);
$stmt->bind_param('i', $transitoId);
$stmt->execute();
$actualizado = $stmt->get_result()->fetch_assoc();
$stmt->close();

json_success(['transito' => rh_transito_publico($conn, $actualizado, $userId)], 'Publicación actualizada');
