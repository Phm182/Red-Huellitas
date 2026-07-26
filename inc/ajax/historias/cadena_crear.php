<?php
/**
 * Crea una cadena. Devuelve el id para adjuntarlo a la historia que se
 * publica a continuación — la cadena arranca vacía y toma vida con la primera
 * historia (por eso `cadenas_listar` no muestra las que no tienen ninguna).
 */
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/cadenas.php';

$userId = rh_require_auth($conn);

$tema = trim($_POST['tema'] ?? '');
$descripcion = trim($_POST['descripcion'] ?? '') ?: null;

if ($tema === '') {
    json_error('Ponele un tema a la cadena');
}
if (mb_strlen($tema) > 60) {
    json_error('El tema no puede superar los 60 caracteres');
}
if ($descripcion !== null && mb_strlen($descripcion) > 200) {
    json_error('La descripción no puede superar los 200 caracteres');
}

$stmt = $conn->prepare('INSERT INTO Cadena (CreadorUserId, Tema, Descripcion) VALUES (?, ?, ?)');
$stmt->bind_param('iss', $userId, $tema, $descripcion);
$stmt->execute();
$cadenaId = (int) $stmt->insert_id;
$stmt->close();

// El creador es participante desde el arranque aunque todavía no haya subido
// su historia: si no, la cadena se vería como si no fuera de nadie.
rh_cadena_sumar_participante($conn, $cadenaId, $userId);

json_success(['cadenaId' => $cadenaId, 'tema' => $tema], 'Cadena creada', 201);
