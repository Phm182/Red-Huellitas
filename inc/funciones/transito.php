<?php
/**
 * Helpers compartidos para serializar Transito/TransitoFoto al shape público
 * usado por todos los endpoints de inc/ajax/transito/.
 *
 * Igual que Perdido: un registro puede estar vinculado a una Mascota ya
 * registrada (MascotaId no nulo — reusa sus datos/fotos de MascotaFoto,
 * solo válido para Tipo='necesito') o ser manual (MascotaId nulo — usa los
 * campos propios de Transito y su galería TransitoFoto). Requiere que quien
 * llame también haya hecho require_once de funciones/mascotas.php.
 */

function rh_transito_raza_nombre(mysqli $conn, ?int $razaId, ?string $razaTexto): ?string
{
    if ($razaId) {
        $stmt = $conn->prepare('SELECT Nombre FROM RazaCatalogo WHERE RazaId = ?');
        $stmt->bind_param('i', $razaId);
        $stmt->execute();
        $row = $stmt->get_result()->fetch_assoc();
        $stmt->close();
        if ($row) {
            return $row['Nombre'];
        }
    }
    return $razaTexto;
}

function rh_transito_fotos(mysqli $conn, array $t): array
{
    if ($t['MascotaId'] !== null) {
        return rh_mascota_fotos($conn, (int) $t['MascotaId']);
    }

    $transitoId = (int) $t['TransitoId'];
    $stmt = $conn->prepare(
        'SELECT TransitoFotoId, Path, Orden FROM TransitoFoto WHERE TransitoId = ? ORDER BY Orden ASC, TransitoFotoId ASC'
    );
    $stmt->bind_param('i', $transitoId);
    $stmt->execute();
    $result = $stmt->get_result();

    $fotos = [];
    while ($row = $result->fetch_assoc()) {
        $fotos[] = [
            'transitoFotoId' => (int) $row['TransitoFotoId'],
            'path' => $row['Path'],
            'orden' => (int) $row['Orden'],
        ];
    }
    $stmt->close();

    return $fotos;
}

/**
 * Serializa un row de Transito (array asociativo de la DB, con columnas de
 * Usuario y de Mascota -- vía LEFT JOIN con alias MascotaNombre/MascotaSexo/
 * MascotaEspecie/MascotaRazaId/MascotaRazaTexto/MascotaDescripcion -- ya
 * incluidas) al shape público. $distanciaKm viene del query de listar.php
 * cuando se aplicó el filtro geográfico (null en obtener.php).
 */
function rh_transito_publico(mysqli $conn, array $t, int $viewerUserId, ?float $distanciaKm = null): array
{
    $transitoId = (int) $t['TransitoId'];
    $autorId = (int) $t['UserId'];
    $esDueno = $autorId === $viewerUserId;
    $mascotaId = $t['MascotaId'] !== null ? (int) $t['MascotaId'] : null;

    if ($mascotaId !== null) {
        $nombre = $t['MascotaNombre'];
        $sexo = $t['MascotaSexo'];
        $especie = $t['MascotaEspecie'];
        $razaId = $t['MascotaRazaId'] !== null ? (int) $t['MascotaRazaId'] : null;
        $razaTexto = $t['MascotaRazaTexto'];
    } else {
        $nombre = $t['Nombre'];
        $sexo = $t['Sexo'];
        $especie = $t['Especie'];
        $razaId = $t['RazaId'] !== null ? (int) $t['RazaId'] : null;
        $razaTexto = $t['RazaTexto'];
    }

    $whatsappVisible = $esDueno || ($t['WhatsappVisibilidad'] ?? null) === 'publica';

    $data = [
        'transitoId' => $transitoId,
        'tipo' => $t['Tipo'],
        'autor' => rh_usuario_resumen([
            'UserId' => $t['UserId'],
            'Username' => $t['Username'],
            'NombreCompleto' => $t['NombreCompleto'],
            'AvatarPath' => $t['AvatarPath'],
        ]),
        'whatsappNumero' => $whatsappVisible ? ($t['WhatsappNumero'] ?? null) : null,
        'mascotaId' => $mascotaId,
        'nombre' => $nombre,
        'sexo' => $sexo,
        'especie' => $especie,
        'razaId' => $razaId,
        'razaTexto' => $razaTexto,
        'raza' => rh_transito_raza_nombre($conn, $razaId, $razaTexto),
        'descripcion' => $t['Descripcion'],
        'duracionDias' => $t['DuracionDias'] !== null ? (int) $t['DuracionDias'] : null,
        'fotos' => rh_transito_fotos($conn, $t),
        'zonaDescripcion' => $t['ZonaDescripcion'],
        'zonaLat' => (float) $t['ZonaLat'],
        'zonaLng' => (float) $t['ZonaLng'],
        'distanciaKm' => $distanciaKm !== null ? round($distanciaKm, 1) : null,
        'esDueno' => $esDueno,
        'estadoTransito' => $t['EstadoTransito'] ?? 'disponible',
        'estado' => $t['Estado'],
        'createdAt' => $t['CreatedAt'],
    ];

    if ($esDueno) {
        require_once __DIR__ . '/edicion.php';
        $bloqueo = rh_transito_motivo_bloqueo_edicion($t);
        $data['editable'] = $bloqueo === null;
        $data['motivoNoEditable'] = $bloqueo;
    }

    return $data;
}
