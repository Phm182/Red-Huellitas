<?php
/**
 * Helpers compartidos para serializar Donacion/DonacionFoto al shape público
 * usado por todos los endpoints de inc/ajax/donaciones/.
 *
 * A diferencia de Perdido/Transito, Donacion nunca vincula una Mascota (es un
 * ítem, no un animal) — las fotos son siempre propias, sin rama condicional.
 */

function rh_donacion_fotos(mysqli $conn, int $donacionId): array
{
    $stmt = $conn->prepare(
        'SELECT DonacionFotoId, Path, Orden FROM DonacionFoto WHERE DonacionId = ? ORDER BY Orden ASC, DonacionFotoId ASC'
    );
    $stmt->bind_param('i', $donacionId);
    $stmt->execute();
    $result = $stmt->get_result();

    $fotos = [];
    while ($row = $result->fetch_assoc()) {
        $fotos[] = [
            'donacionFotoId' => (int) $row['DonacionFotoId'],
            'path' => $row['Path'],
            'orden' => (int) $row['Orden'],
        ];
    }
    $stmt->close();

    return $fotos;
}

/**
 * Serializa un row de Donacion (array asociativo de la DB, con columnas de
 * Usuario ya incluidas vía JOIN) al shape público. $distanciaKm viene del
 * query de listar.php cuando se aplicó el filtro geográfico (null en obtener.php).
 */
function rh_donacion_publico(mysqli $conn, array $d, int $viewerUserId, ?float $distanciaKm = null): array
{
    $donacionId = (int) $d['DonacionId'];
    $autorId = (int) $d['UserId'];
    $esDueno = $autorId === $viewerUserId;

    $whatsappVisible = $esDueno || ($d['WhatsappVisibilidad'] ?? null) === 'publica';

    return [
        'donacionId' => $donacionId,
        'tipo' => $d['Tipo'],
        'categoria' => $d['Categoria'],
        'autor' => rh_usuario_resumen([
            'UserId' => $d['UserId'],
            'Username' => $d['Username'],
            'NombreCompleto' => $d['NombreCompleto'],
            'AvatarPath' => $d['AvatarPath'],
        ]),
        'whatsappNumero' => $whatsappVisible ? ($d['WhatsappNumero'] ?? null) : null,
        'descripcion' => $d['Descripcion'],
        'especie' => $d['Especie'],
        'fotos' => rh_donacion_fotos($conn, $donacionId),
        'zonaDescripcion' => $d['ZonaDescripcion'],
        'zonaLat' => (float) $d['ZonaLat'],
        'zonaLng' => (float) $d['ZonaLng'],
        'distanciaKm' => $distanciaKm !== null ? round($distanciaKm, 1) : null,
        'esDueno' => $esDueno,
        'estado' => $d['Estado'],
        'createdAt' => $d['CreatedAt'],
    ];
}
