<?php
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';

// Sin auth: lo consume tanto el selector de tipo de usuario en el registro
// (antes de tener token) como las solapas de Noticias ya logueado.
$stmt = $conn->prepare('SELECT TipoUsuarioId, Codigo, Nombre FROM TipoUsuarioCatalogo ORDER BY Orden ASC');
$stmt->execute();
$result = $stmt->get_result();

$tipos = [];
while ($row = $result->fetch_assoc()) {
    $tipos[] = [
        'tipoUsuarioId' => (int) $row['TipoUsuarioId'],
        'codigo' => $row['Codigo'],
        'nombre' => $row['Nombre'],
    ];
}
$stmt->close();

json_success(['tipos' => $tipos]);
