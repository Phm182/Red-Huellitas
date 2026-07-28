<?php
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/validacion.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/especies.php';
require_once __DIR__ . '/../../funciones/uploads.php';
require_once __DIR__ . '/../../funciones/adopcion.php';

const RH_ADOPCION_MAX_PREGUNTAS = 10;

$userId = rh_require_auth($conn);

if (!rh_usuario_verificado($conn, $userId)) {
    json_error('Necesitás tu cuenta verificada para publicar en adopción', 403);
}

$nombre = trim($_POST['nombre'] ?? '');
$sexo = $_POST['sexo'] ?? '';
$especie = $_POST['especie'] ?? '';
$razaId = isset($_POST['razaId']) && $_POST['razaId'] !== '' ? (int) $_POST['razaId'] : null;
$razaTexto = trim($_POST['razaTexto'] ?? '') ?: null;
$edadAnios = isset($_POST['edadAnios']) && $_POST['edadAnios'] !== '' ? (int) $_POST['edadAnios'] : null;
$edadMeses = isset($_POST['edadMeses']) && $_POST['edadMeses'] !== '' ? (int) $_POST['edadMeses'] : null;
$descripcion = trim($_POST['descripcion'] ?? '') ?: null;
$preguntasInput = $_POST['preguntas'] ?? [];

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
    json_error('Máximo 6 fotos por listado');
}
foreach ($fotos as $foto) {
    $error = rh_validar_imagen_subida($foto);
    if ($error) {
        json_error("Foto inválida: $error");
    }
}

if (!is_array($preguntasInput)) {
    json_error('Formato de preguntas inválido');
}
if (count($preguntasInput) > RH_ADOPCION_MAX_PREGUNTAS) {
    json_error('Máximo ' . RH_ADOPCION_MAX_PREGUNTAS . ' preguntas por listado');
}

$preguntasValidadas = [];
foreach ($preguntasInput as $p) {
    $tipo = $p['tipo'] ?? '';
    $texto = trim($p['texto'] ?? '');
    if (!in_array($tipo, ['texto', 'si_no', 'opcion_multiple'], true)) {
        json_error("Tipo de pregunta inválido: '$tipo'");
    }
    if ($texto === '' || mb_strlen($texto) > 255) {
        json_error('Cada pregunta necesita un texto (máx 255 caracteres)');
    }
    $opciones = [];
    if ($tipo === 'opcion_multiple') {
        $opcionesInput = is_array($p['opciones'] ?? null) ? $p['opciones'] : [];
        foreach ($opcionesInput as $opcionTexto) {
            $opcionTexto = trim((string) $opcionTexto);
            if ($opcionTexto !== '') {
                $opciones[] = $opcionTexto;
            }
        }
        if (count($opciones) < 2) {
            json_error("La pregunta \"$texto\" necesita al menos 2 opciones");
        }
    }
    $preguntasValidadas[] = ['tipo' => $tipo, 'texto' => $texto, 'opciones' => $opciones];
}

$stmt = $conn->prepare(
    'INSERT INTO Adopcion (UserId, Nombre, Sexo, EdadAnios, EdadMeses, Especie, RazaId, RazaTexto, Descripcion)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
);
$stmt->bind_param(
    'issiisiss',
    $userId,
    $nombre,
    $sexo,
    $edadAnios,
    $edadMeses,
    $especie,
    $razaId,
    $razaTexto,
    $descripcion
);
$stmt->execute();
$adopcionId = (int) $stmt->insert_id;
$stmt->close();

foreach ($fotos as $index => $foto) {
    $path = rh_guardar_foto_adopcion($foto, $adopcionId);
    $stmt = $conn->prepare('INSERT INTO AdopcionFoto (AdopcionId, Path, Orden) VALUES (?, ?, ?)');
    $stmt->bind_param('isi', $adopcionId, $path, $index);
    $stmt->execute();
    $stmt->close();
}

foreach ($preguntasValidadas as $index => $pregunta) {
    $stmt = $conn->prepare(
        'INSERT INTO AdopcionPregunta (AdopcionId, Tipo, Texto, Orden) VALUES (?, ?, ?, ?)'
    );
    $stmt->bind_param('issi', $adopcionId, $pregunta['tipo'], $pregunta['texto'], $index);
    $stmt->execute();
    $preguntaId = (int) $stmt->insert_id;
    $stmt->close();

    foreach ($pregunta['opciones'] as $opcionIndex => $opcionTexto) {
        $stmt = $conn->prepare(
            'INSERT INTO AdopcionPreguntaOpcion (AdopcionPreguntaId, Texto, Orden) VALUES (?, ?, ?)'
        );
        $stmt->bind_param('isi', $preguntaId, $opcionTexto, $opcionIndex);
        $stmt->execute();
        $stmt->close();
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
$adopcion = $stmt->get_result()->fetch_assoc();
$stmt->close();

json_success(['adopcion' => rh_adopcion_publico($conn, $adopcion, $userId, true)], 'Publicación de adopción creada', 201);
