<?php
/**
 * Helpers compartidos para serializar Campania al shape público usado por
 * todos los endpoints de inc/ajax/campanias/.
 */

function rh_campania_total_inscriptos(mysqli $conn, int $campaniaId): int
{
    $stmt = $conn->prepare('SELECT COUNT(*) AS total FROM CampaniaInscripcion WHERE CampaniaId = ?');
    $stmt->bind_param('i', $campaniaId);
    $stmt->execute();
    $total = (int) $stmt->get_result()->fetch_assoc()['total'];
    $stmt->close();

    return $total;
}

function rh_campania_estoy_inscripto(mysqli $conn, int $campaniaId, int $viewerUserId): bool
{
    $stmt = $conn->prepare('SELECT CampaniaInscripcionId FROM CampaniaInscripcion WHERE CampaniaId = ? AND UserId = ?');
    $stmt->bind_param('ii', $campaniaId, $viewerUserId);
    $stmt->execute();
    $inscripto = (bool) $stmt->get_result()->fetch_assoc();
    $stmt->close();

    return $inscripto;
}

/**
 * Serializa un row de Campania (array asociativo de la DB, con columnas de
 * Usuario ya incluidas vía JOIN) al shape público.
 */
function rh_campania_publico(mysqli $conn, array $c, int $viewerUserId): array
{
    $campaniaId = (int) $c['CampaniaId'];
    $autorId = (int) $c['UserId'];
    $esDueno = $autorId === $viewerUserId;
    $requiereInscripcion = (bool) $c['RequiereInscripcion'];
    $cupoMaximo = $c['CupoMaximo'] !== null ? (int) $c['CupoMaximo'] : null;

    $data = [
        'campaniaId' => $campaniaId,
        'autor' => rh_usuario_resumen([
            'UserId' => $c['UserId'],
            'Username' => $c['Username'],
            'NombreCompleto' => $c['NombreCompleto'],
            'AvatarPath' => $c['AvatarPath'],
        ]),
        'tipo' => $c['Tipo'],
        'titulo' => $c['Titulo'],
        'descripcion' => $c['Descripcion'],
        'fechaDesde' => $c['FechaDesde'],
        'fechaHasta' => $c['FechaHasta'],
        'zonaDescripcion' => $c['ZonaDescripcion'],
        'zonaLat' => (float) $c['ZonaLat'],
        'zonaLng' => (float) $c['ZonaLng'],
        'requiereInscripcion' => $requiereInscripcion,
        'cupoMaximo' => $cupoMaximo,
        'esDueno' => $esDueno,
        'estado' => $c['Estado'],
        'createdAt' => $c['CreatedAt'],
    ];

    if ($requiereInscripcion) {
        $totalInscriptos = rh_campania_total_inscriptos($conn, $campaniaId);
        $data['totalInscriptos'] = $totalInscriptos;
        $data['cupoDisponible'] = $cupoMaximo !== null ? max(0, $cupoMaximo - $totalInscriptos) : null;
        $data['estoyInscripto'] = rh_campania_estoy_inscripto($conn, $campaniaId, $viewerUserId);
    }

    return $data;
}
