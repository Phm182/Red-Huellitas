<?php
/**
 * Editar un reporte de perdido/encontrado (sólo el dueño).
 *
 * `tipo` y la mascota vinculada no se cambian. Un reporte ya marcado como
 * reencontrado queda congelado (ver rh_perdido_motivo_bloqueo_edicion).
 */
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/validacion.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/especies.php';
require_once __DIR__ . '/../../funciones/uploads.php';
require_once __DIR__ . '/../../funciones/mascotas.php';
require_once __DIR__ . '/../../funciones/perdido.php';
require_once __DIR__ . '/../../funciones/edicion.php';

$userId = rh_require_auth($conn);

$perdidoId = (int) ($_POST['perdidoId'] ?? 0);
if ($perdidoId <= 0) {
    json_error('Falta perdidoId');
}

$sqlDetalle =
    'SELECT Perdido.*,
            Usuario.Username, Usuario.NombreCompleto, Usuario.AvatarPath,
            Usuario.WhatsappNumero, Usuario.WhatsappVisibilidad,
            Mascota.Nombre AS MascotaNombre, Mascota.Sexo AS MascotaSexo, Mascota.Especie AS MascotaEspecie,
            Mascota.RazaId AS MascotaRazaId, Mascota.RazaTexto AS MascotaRazaTexto,
            Mascota.DescripcionTexto AS MascotaDescripcion
     FROM Perdido
     JOIN Usuario ON Usuario.UserId = Perdido.UserId
     LEFT JOIN Mascota ON Mascota.MascotaId = Perdido.MascotaId
     WHERE Perdido.PerdidoId = ?';

$stmt = $conn->prepare($sqlDetalle);
$stmt->bind_param('i', $perdidoId);
$stmt->execute();
$perdido = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!$perdido || $perdido['Estado'] !== 'A') {
    json_error('Reporte no encontrado', 404);
}
if ((int) $perdido['UserId'] !== $userId) {
    json_error('No tenés permiso para editar este reporte', 403);
}

$lock = rh_perdido_motivo_bloqueo_edicion($perdido);
if ($lock !== null) {
    json_error($lock, 409);
}

$vinculado = $perdido['MascotaId'] !== null;

$ultimoLugarDescripcion = trim($_POST['ultimoLugarDescripcion'] ?? '');
$ultimoLugarLat = isset($_POST['ultimoLugarLat']) && $_POST['ultimoLugarLat'] !== ''
    ? (float) $_POST['ultimoLugarLat'] : null;
$ultimoLugarLng = isset($_POST['ultimoLugarLng']) && $_POST['ultimoLugarLng'] !== ''
    ? (float) $_POST['ultimoLugarLng'] : null;
$fechaSuceso = trim($_POST['fechaSuceso'] ?? '');

if ($ultimoLugarDescripcion === '' || mb_strlen($ultimoLugarDescripcion) > 150) {
    json_error('El lugar es obligatorio (máx 150 caracteres)');
}
if ($ultimoLugarLat === null || $ultimoLugarLng === null) {
    json_error('Falta la ubicación del reporte');
}
if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $fechaSuceso)) {
    json_error('fechaSuceso inválida (formato YYYY-MM-DD)');
}

if ($vinculado) {
    // Los datos del animal salen de la Mascota; acá sólo el lugar y la fecha.
    $stmt = $conn->prepare(
        'UPDATE Perdido
         SET UltimoLugarDescripcion = ?, UltimoLugarLat = ?, UltimoLugarLng = ?, FechaSuceso = ?
         WHERE PerdidoId = ? AND UserId = ?'
    );
    $stmt->bind_param(
        'sddsii',
        $ultimoLugarDescripcion, $ultimoLugarLat, $ultimoLugarLng, $fechaSuceso, $perdidoId, $userId
    );
    $stmt->execute();
    $stmt->close();
} else {
    $nombre = trim($_POST['nombre'] ?? '') ?: null;
    $sexo = $_POST['sexo'] ?? '';
    $especie = $_POST['especie'] ?? '';
    $razaId = isset($_POST['razaId']) && $_POST['razaId'] !== '' ? (int) $_POST['razaId'] : null;
    $razaTexto = trim($_POST['razaTexto'] ?? '') ?: null;
    $descripcion = trim($_POST['descripcion'] ?? '') ?: null;

    if ($nombre === null || mb_strlen($nombre) > 60) {
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
        'UPDATE Perdido
         SET Nombre = ?, Sexo = ?, Especie = ?, RazaId = ?, RazaTexto = ?, Descripcion = ?,
             UltimoLugarDescripcion = ?, UltimoLugarLat = ?, UltimoLugarLng = ?, FechaSuceso = ?
         WHERE PerdidoId = ? AND UserId = ?'
    );
    $stmt->bind_param(
        'sssisssddsii',
        $nombre, $sexo, $especie, $razaId, $razaTexto, $descripcion,
        $ultimoLugarDescripcion, $ultimoLugarLat, $ultimoLugarLng, $fechaSuceso, $perdidoId, $userId
    );
    $stmt->execute();
    $stmt->close();

    rh_sincronizar_fotos(
        $conn,
        'Perdido',
        $perdidoId,
        $_POST['ordenFotos'] ?? null,
        $_FILES['fotos'] ?? null,
        'rh_guardar_foto_perdido'
    );
}

$stmt = $conn->prepare($sqlDetalle);
$stmt->bind_param('i', $perdidoId);
$stmt->execute();
$actualizado = $stmt->get_result()->fetch_assoc();
$stmt->close();

json_success(['perdido' => rh_perdido_publico($conn, $actualizado, $userId)], 'Reporte actualizado');
