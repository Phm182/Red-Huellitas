<?php
/**
 * Helpers compartidos para serializar Mascota/MascotaFoto al shape público
 * usado por todos los endpoints de inc/ajax/mascotas/.
 */

function rh_mascota_raza_nombre(mysqli $conn, ?int $razaId, ?string $razaTexto): ?string
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

function rh_mascota_fotos(mysqli $conn, int $mascotaId): array
{
    $stmt = $conn->prepare(
        'SELECT MascotaFotoId, Path, Orden FROM MascotaFoto WHERE MascotaId = ? ORDER BY Orden ASC, MascotaFotoId ASC'
    );
    $stmt->bind_param('i', $mascotaId);
    $stmt->execute();
    $result = $stmt->get_result();

    $fotos = [];
    while ($row = $result->fetch_assoc()) {
        $fotos[] = [
            'mascotaFotoId' => (int) $row['MascotaFotoId'],
            'path' => $row['Path'],
            'orden' => (int) $row['Orden'],
        ];
    }
    $stmt->close();

    return $fotos;
}

/**
 * true si $viewerUserId puede ver el carnet de vacunas de esta mascota:
 * es el dueño, el carnet es público, o tiene un grant en MascotaCarnetAcceso.
 */
function rh_mascota_tiene_acceso_carnet(mysqli $conn, array $mascota, int $viewerUserId): bool
{
    if ((int) $mascota['UserId'] === $viewerUserId) {
        return true;
    }
    if ($mascota['CarnetVisibilidad'] === 'publica') {
        return true;
    }

    $mascotaId = (int) $mascota['MascotaId'];
    $stmt = $conn->prepare('SELECT AccesoId FROM MascotaCarnetAcceso WHERE MascotaId = ? AND UserId = ?');
    $stmt->bind_param('ii', $mascotaId, $viewerUserId);
    $stmt->execute();
    $tieneAcceso = (bool) $stmt->get_result()->fetch_assoc();
    $stmt->close();

    return $tieneAcceso;
}

/**
 * Serializa un row de Mascota (array asociativo de la DB) al shape público.
 * Nunca incluye CarnetVacunasPath directamente (solo `carnetDisponible` bool),
 * mismo criterio de privacidad que la verificación KYC de Fase 1.
 */
function rh_mascota_publica(mysqli $conn, array $m, int $viewerUserId, bool $incluirFotos = true): array
{
    $razaId = $m['RazaId'] !== null ? (int) $m['RazaId'] : null;
    $razaNombre = rh_mascota_raza_nombre($conn, $razaId, $m['RazaTexto']);

    $data = [
        'mascotaId' => (int) $m['MascotaId'],
        'userId' => (int) $m['UserId'],
        'nombre' => $m['Nombre'],
        'sexo' => $m['Sexo'],
        'edadAnios' => $m['EdadAnios'] !== null ? (int) $m['EdadAnios'] : null,
        'edadMeses' => $m['EdadMeses'] !== null ? (int) $m['EdadMeses'] : null,
        'especie' => $m['Especie'],
        'razaId' => $razaId,
        'razaTexto' => $m['RazaTexto'],
        'raza' => $razaNombre,
        'descripcion' => $m['DescripcionTexto'],
        'carnetDisponible' => !empty($m['CarnetVacunasPath']),
        'carnetVisibilidad' => $m['CarnetVisibilidad'],
        'tengoAccesoCarnet' => rh_mascota_tiene_acceso_carnet($conn, $m, $viewerUserId),
        'esDueno' => (int) $m['UserId'] === $viewerUserId,
        'disponibleParaMatch' => (bool) $m['DisponibleParaMatch'],
        'estado' => $m['Estado'],
        'createdAt' => $m['CreatedAt'],
    ];

    if ($incluirFotos) {
        $data['fotos'] = rh_mascota_fotos($conn, (int) $m['MascotaId']);
    }

    return $data;
}
