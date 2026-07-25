<?php
/**
 * Helpers compartidos para serializar Veterinaria/VeterinariaFoto al shape
 * público usado por todos los endpoints de inc/ajax/veterinarias/.
 *
 * Directorio simple de terceros: la veterinaria en sí no es un Usuario de la
 * app, así que Telefono/WhatsappNumero viven directo en esta tabla.
 */

function rh_veterinaria_fotos(mysqli $conn, int $veterinariaId): array
{
    $stmt = $conn->prepare(
        'SELECT VeterinariaFotoId, Path, Orden FROM VeterinariaFoto WHERE VeterinariaId = ? ORDER BY Orden ASC, VeterinariaFotoId ASC'
    );
    $stmt->bind_param('i', $veterinariaId);
    $stmt->execute();
    $result = $stmt->get_result();

    $fotos = [];
    while ($row = $result->fetch_assoc()) {
        $fotos[] = [
            'veterinariaFotoId' => (int) $row['VeterinariaFotoId'],
            'path' => $row['Path'],
            'orden' => (int) $row['Orden'],
        ];
    }
    $stmt->close();

    return $fotos;
}

/**
 * Serializa un row de Veterinaria (array asociativo de la DB) al shape
 * público. $distanciaKm viene del query de listar.php cuando se aplicó el
 * filtro geográfico (null en obtener.php).
 */
function rh_veterinaria_publico(mysqli $conn, array $v, int $viewerUserId, ?float $distanciaKm = null): array
{
    $veterinariaId = (int) $v['VeterinariaId'];
    $autorId = (int) $v['UserId'];

    return [
        'veterinariaId' => $veterinariaId,
        'autorUserId' => $autorId,
        'nombre' => $v['Nombre'],
        'descripcion' => $v['Descripcion'],
        'telefono' => $v['Telefono'],
        'whatsappNumero' => $v['WhatsappNumero'],
        'horario' => $v['Horario'],
        'fotos' => rh_veterinaria_fotos($conn, $veterinariaId),
        'zonaDescripcion' => $v['ZonaDescripcion'],
        'zonaLat' => (float) $v['ZonaLat'],
        'zonaLng' => (float) $v['ZonaLng'],
        'distanciaKm' => $distanciaKm !== null ? round($distanciaKm, 1) : null,
        'esDueno' => $autorId === $viewerUserId,
        'estado' => $v['Estado'],
        'createdAt' => $v['CreatedAt'],
    ];
}
