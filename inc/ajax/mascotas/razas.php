<?php
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';

rh_require_auth($conn);

$especie = $_GET['especie'] ?? '';
if (!in_array($especie, ['perro', 'gato', 'otro'], true)) {
    json_error("especie debe ser 'perro', 'gato' u 'otro'");
}

$stmt = $conn->prepare('SELECT RazaId, Nombre FROM RazaCatalogo WHERE Especie = ? ORDER BY Nombre ASC');
$stmt->bind_param('s', $especie);
$stmt->execute();
$result = $stmt->get_result();

$razas = [];
while ($row = $result->fetch_assoc()) {
    $razas[] = ['razaId' => (int) $row['RazaId'], 'nombre' => $row['Nombre']];
}
$stmt->close();

json_success(['razas' => $razas]);
