<?php
/**
 * Helpers compartidos para serializar Perdido/PerdidoFoto al shape público
 * usado por todos los endpoints de inc/ajax/perdidos/.
 *
 * Un reporte puede estar vinculado a una Mascota ya registrada (MascotaId no
 * nulo — reusa sus datos/fotos de MascotaFoto) o ser manual (MascotaId nulo —
 * usa los campos propios de Perdido y su galería PerdidoFoto). Requiere que
 * quien llame también haya hecho require_once de funciones/mascotas.php.
 */

function rh_perdido_raza_nombre(mysqli $conn, ?int $razaId, ?string $razaTexto): ?string
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

function rh_perdido_fotos(mysqli $conn, array $p): array
{
    if ($p['MascotaId'] !== null) {
        return rh_mascota_fotos($conn, (int) $p['MascotaId']);
    }

    $perdidoId = (int) $p['PerdidoId'];
    $stmt = $conn->prepare(
        'SELECT PerdidoFotoId, Path, Orden FROM PerdidoFoto WHERE PerdidoId = ? ORDER BY Orden ASC, PerdidoFotoId ASC'
    );
    $stmt->bind_param('i', $perdidoId);
    $stmt->execute();
    $result = $stmt->get_result();

    $fotos = [];
    while ($row = $result->fetch_assoc()) {
        $fotos[] = [
            'perdidoFotoId' => (int) $row['PerdidoFotoId'],
            'path' => $row['Path'],
            'orden' => (int) $row['Orden'],
        ];
    }
    $stmt->close();

    return $fotos;
}

/**
 * Serializa un row de Perdido (array asociativo de la DB, con columnas de
 * Usuario y de Mascota -- vía LEFT JOIN con alias MascotaNombre/MascotaSexo/
 * MascotaEspecie/MascotaRazaId/MascotaRazaTexto/MascotaDescripcion -- ya
 * incluidas) al shape público.
 */
function rh_perdido_publico(mysqli $conn, array $p, int $viewerUserId): array
{
    $perdidoId = (int) $p['PerdidoId'];
    $autorId = (int) $p['UserId'];
    $esDueno = $autorId === $viewerUserId;
    $mascotaId = $p['MascotaId'] !== null ? (int) $p['MascotaId'] : null;

    if ($mascotaId !== null) {
        $nombre = $p['MascotaNombre'];
        $sexo = $p['MascotaSexo'];
        $especie = $p['MascotaEspecie'];
        $razaId = $p['MascotaRazaId'] !== null ? (int) $p['MascotaRazaId'] : null;
        $razaTexto = $p['MascotaRazaTexto'];
        $descripcion = $p['MascotaDescripcion'];
    } else {
        $nombre = $p['Nombre'];
        $sexo = $p['Sexo'];
        $especie = $p['Especie'];
        $razaId = $p['RazaId'] !== null ? (int) $p['RazaId'] : null;
        $razaTexto = $p['RazaTexto'];
        $descripcion = $p['Descripcion'];
    }

    $whatsappVisible = $esDueno || ($p['WhatsappVisibilidad'] ?? null) === 'publica';

    return [
        'perdidoId' => $perdidoId,
        'tipo' => $p['Tipo'],
        'autor' => rh_usuario_resumen([
            'UserId' => $p['UserId'],
            'Username' => $p['Username'],
            'NombreCompleto' => $p['NombreCompleto'],
            'AvatarPath' => $p['AvatarPath'],
        ]),
        'whatsappNumero' => $whatsappVisible ? ($p['WhatsappNumero'] ?? null) : null,
        'mascotaId' => $mascotaId,
        'nombre' => $nombre,
        'sexo' => $sexo,
        'especie' => $especie,
        'razaId' => $razaId,
        'razaTexto' => $razaTexto,
        'raza' => rh_perdido_raza_nombre($conn, $razaId, $razaTexto),
        'descripcion' => $descripcion,
        'fotos' => rh_perdido_fotos($conn, $p),
        'ultimoLugarDescripcion' => $p['UltimoLugarDescripcion'],
        'ultimoLugarLat' => (float) $p['UltimoLugarLat'],
        'ultimoLugarLng' => (float) $p['UltimoLugarLng'],
        'fechaSuceso' => $p['FechaSuceso'],
        'estadoPerdido' => $p['EstadoPerdido'],
        'esDueno' => $esDueno,
        'estado' => $p['Estado'],
        'createdAt' => $p['CreatedAt'],
    ];
}
