<?php
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';

$userId = rh_require_auth($conn);

$stmt = $conn->prepare(
    'SELECT CampaniaInscripcion.CampaniaInscripcionId, CampaniaInscripcion.CreatedAt,
            Campania.CampaniaId, Campania.Tipo, Campania.Titulo, Campania.FechaDesde, Campania.FechaHasta,
            Campania.ZonaDescripcion
     FROM CampaniaInscripcion
     JOIN Campania ON Campania.CampaniaId = CampaniaInscripcion.CampaniaId
     WHERE CampaniaInscripcion.UserId = ?
     ORDER BY CampaniaInscripcion.CreatedAt DESC'
);
$stmt->bind_param('i', $userId);
$stmt->execute();
$result = $stmt->get_result();

$inscripciones = [];
while ($row = $result->fetch_assoc()) {
    $inscripciones[] = [
        'campaniaInscripcionId' => (int) $row['CampaniaInscripcionId'],
        'createdAt' => $row['CreatedAt'],
        'campaniaId' => (int) $row['CampaniaId'],
        'tipo' => $row['Tipo'],
        'titulo' => $row['Titulo'],
        'fechaDesde' => $row['FechaDesde'],
        'fechaHasta' => $row['FechaHasta'],
        'zonaDescripcion' => $row['ZonaDescripcion'],
    ];
}
$stmt->close();

json_success(['inscripciones' => $inscripciones]);
