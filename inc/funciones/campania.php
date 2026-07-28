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
        'direccion' => $c['Direccion'] ?? null,
        'zonaLat' => (float) $c['ZonaLat'],
        'zonaLng' => (float) $c['ZonaLng'],
        'requiereInscripcion' => $requiereInscripcion,
        'cupoMaximo' => $cupoMaximo,
        'esDueno' => $esDueno,
        'estado' => $c['Estado'],
        'createdAt' => $c['CreatedAt'],
    ];

    $data['mensajeAviso'] = $c['MensajeAviso'] ?? null;
    $data['bajaLimiteHoras'] = isset($c['BajaLimiteHoras']) && $c['BajaLimiteHoras'] !== null
        ? (int) $c['BajaLimiteHoras']
        : null;

    if ($requiereInscripcion) {
        require_once __DIR__ . '/campania_inscripcion.php';

        // Los lugares se cuentan sobre las confirmadas, no sobre el total de
        // filas: las canceladas y la lista de espera no ocupan lugar, y contarlas
        // haría que la campaña se vea llena cuando no lo está.
        $confirmadas = rh_campania_confirmadas($conn, $campaniaId);
        $data['totalInscriptos'] = $confirmadas;
        $data['cupoDisponible'] = $cupoMaximo !== null ? max(0, $cupoMaximo - $confirmadas) : null;
        $data['preguntas'] = rh_campania_preguntas($conn, $campaniaId);

        // Estado de MI inscripción: la pantalla necesita saber si mostrar
        // "Inscribirme", "Estás en lista de espera" o "Darte de baja".
        $stmt = $conn->prepare(
            "SELECT CampaniaInscripcionId, Estado, Posicion FROM CampaniaInscripcion
             WHERE CampaniaId = ? AND UserId = ? AND Estado <> 'cancelada' LIMIT 1"
        );
        $stmt->bind_param('ii', $campaniaId, $viewerUserId);
        $stmt->execute();
        $mia = $stmt->get_result()->fetch_assoc();
        $stmt->close();

        $data['estoyInscripto'] = $mia !== null;
        $data['miInscripcion'] = $mia ? [
            'campaniaInscripcionId' => (int) $mia['CampaniaInscripcionId'],
            'estado' => $mia['Estado'],
            'posicion' => (int) $mia['Posicion'],
            'puedeDarseBaja' => rh_campania_puede_darse_baja($conn, $c),
        ] : null;
    }

    return $data;
}
