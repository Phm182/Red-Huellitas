<?php
/**
 * Equipos: organizaciones con varios miembros.
 *
 * Un equipo es un refugio, una protectora, una veterinaria, una ONG o un
 * organismo público. Cada persona sigue teniendo su usuario propio; el equipo
 * es una entidad aparte a la que se pertenece.
 *
 * Todo lo que decide **quién puede hacer qué** en un equipo pasa por
 * `rh_equipo_rol()`. Está concentrado acá a propósito: la membresía se
 * chequea en una docena de endpoints y alcanza con que uno se olvide para
 * que cualquiera pueda publicar en nombre de una organización conocida.
 */

require_once __DIR__ . '/uploads.php';

/** Roles que pueden aprobar miembros, editar el equipo y publicar por él. */
function rh_equipo_roles_admin(): array
{
    return ['dueno', 'admin'];
}

/**
 * Rol del usuario en el equipo, o null si no es miembro activo.
 *
 * Devuelve null también para los pendientes: pedir entrar no es estar.
 */
function rh_equipo_rol(mysqli $conn, int $equipoId, int $userId): ?string
{
    if ($userId <= 0 || $equipoId <= 0) {
        return null;
    }

    $stmt = $conn->prepare(
        "SELECT Rol FROM EquipoMiembro
         WHERE EquipoId = ? AND UserId = ? AND Estado = 'activo'"
    );
    $stmt->bind_param('ii', $equipoId, $userId);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    return $row ? $row['Rol'] : null;
}

/** ¿Puede aprobar miembros, editar los datos y publicar en nombre del equipo? */
function rh_equipo_puede_administrar(mysqli $conn, int $equipoId, int $userId): bool
{
    $rol = rh_equipo_rol($conn, $equipoId, $userId);

    return $rol !== null && in_array($rol, rh_equipo_roles_admin(), true);
}

/** Estado crudo de la membresía, incluyendo pendiente/rechazado/salio. */
function rh_equipo_membresia(mysqli $conn, int $equipoId, int $userId): ?array
{
    if ($userId <= 0) {
        return null;
    }

    $stmt = $conn->prepare(
        'SELECT EquipoMiembroId, Rol, Estado, CreatedAt FROM EquipoMiembro
         WHERE EquipoId = ? AND UserId = ?'
    );
    $stmt->bind_param('ii', $equipoId, $userId);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if (!$row) {
        return null;
    }

    return [
        'equipoMiembroId' => (int) $row['EquipoMiembroId'],
        'rol' => $row['Rol'],
        'estado' => $row['Estado'],
        'createdAt' => $row['CreatedAt'],
    ];
}

/** Equipos donde el usuario es miembro activo. Para elegir al publicar. */
function rh_equipos_de_usuario(mysqli $conn, int $userId): array
{
    $stmt = $conn->prepare(
        "SELECT e.*, t.Codigo AS TipoCodigo, t.Nombre AS TipoNombre,
                t.Icono AS TipoIcono, t.Color AS TipoColor, m.Rol
         FROM EquipoMiembro m
         JOIN Equipo e ON e.EquipoId = m.EquipoId
         JOIN TipoEquipoCatalogo t ON t.TipoEquipoId = e.TipoEquipoId
         WHERE m.UserId = ? AND m.Estado = 'activo' AND e.Estado = 'A'
         ORDER BY e.Nombre ASC"
    );
    $stmt->bind_param('i', $userId);
    $stmt->execute();
    $res = $stmt->get_result();

    $equipos = [];
    while ($row = $res->fetch_assoc()) {
        $equipos[] = rh_equipo_publico($conn, $row, $userId);
    }
    $stmt->close();

    return $equipos;
}

/** El catálogo de tipos, con el ícono y el color de cada insignia. */
function rh_tipos_equipo(mysqli $conn): array
{
    $res = $conn->query('SELECT Codigo, Nombre, Icono, Color FROM TipoEquipoCatalogo ORDER BY Orden ASC');

    $tipos = [];
    while ($row = $res->fetch_assoc()) {
        $tipos[] = [
            'codigo' => $row['Codigo'],
            'nombre' => $row['Nombre'],
            'icono' => $row['Icono'],
            'color' => $row['Color'],
        ];
    }

    return $tipos;
}

/** Cuántos miembros activos tiene. */
function rh_equipo_total_miembros(mysqli $conn, int $equipoId): int
{
    $stmt = $conn->prepare(
        "SELECT COUNT(*) AS n FROM EquipoMiembro WHERE EquipoId = ? AND Estado = 'activo'"
    );
    $stmt->bind_param('i', $equipoId);
    $stmt->execute();
    $n = (int) ($stmt->get_result()->fetch_assoc()['n'] ?? 0);
    $stmt->close();

    return $n;
}

/** Miembros activos con sus datos de usuario, para la pantalla del equipo. */
function rh_equipo_miembros(mysqli $conn, int $equipoId, string $estado = 'activo'): array
{
    $stmt = $conn->prepare(
        'SELECT m.EquipoMiembroId, m.Rol, m.Estado, m.Mensaje, m.CreatedAt,
                u.UserId, u.Username, u.NombreCompleto, u.AvatarPath
         FROM EquipoMiembro m
         JOIN Usuario u ON u.UserId = m.UserId
         WHERE m.EquipoId = ? AND m.Estado = ?
         ORDER BY FIELD(m.Rol, \'dueno\', \'admin\', \'miembro\'), m.CreatedAt ASC'
    );
    $stmt->bind_param('is', $equipoId, $estado);
    $stmt->execute();
    $res = $stmt->get_result();

    $miembros = [];
    while ($row = $res->fetch_assoc()) {
        $miembros[] = [
            'equipoMiembroId' => (int) $row['EquipoMiembroId'],
            'rol' => $row['Rol'],
            'estado' => $row['Estado'],
            'mensaje' => $row['Mensaje'],
            'desde' => $row['CreatedAt'],
            'usuario' => [
                'userId' => (int) $row['UserId'],
                'username' => $row['Username'],
                'nombreCompleto' => $row['NombreCompleto'],
                'avatarPath' => $row['AvatarPath'],
            ],
        ];
    }
    $stmt->close();

    return $miembros;
}

/**
 * Serializa un row de Equipo al shape público.
 *
 * El row puede venir con las columnas del catálogo ya unidas (TipoCodigo,
 * TipoNombre, …). Si no vienen, se buscan: los endpoints que hacen
 * `SELECT *` sin JOIN también tienen que poder serializar.
 */
function rh_equipo_publico(mysqli $conn, array $e, int $viewerUserId, ?float $distanciaKm = null): array
{
    $equipoId = (int) $e['EquipoId'];

    if (!isset($e['TipoCodigo'])) {
        $stmt = $conn->prepare(
            'SELECT Codigo, Nombre, Icono, Color FROM TipoEquipoCatalogo WHERE TipoEquipoId = ?'
        );
        $stmt->bind_param('i', $e['TipoEquipoId']);
        $stmt->execute();
        $t = $stmt->get_result()->fetch_assoc() ?: [];
        $stmt->close();

        $e['TipoCodigo'] = $t['Codigo'] ?? 'otro';
        $e['TipoNombre'] = $t['Nombre'] ?? 'Otro';
        $e['TipoIcono'] = $t['Icono'] ?? 'people';
        $e['TipoColor'] = $t['Color'] ?? '#8FA0B5';
    }

    $membresia = rh_equipo_membresia($conn, $equipoId, $viewerUserId);
    $rol = ($membresia && $membresia['estado'] === 'activo') ? $membresia['rol'] : null;

    return [
        'equipoId' => $equipoId,
        'nombre' => $e['Nombre'],
        'descripcion' => $e['Descripcion'],
        'avatarPath' => $e['AvatarPath'],
        'email' => $e['Email'],
        'telefono' => $e['Telefono'],
        'sitioWeb' => $e['SitioWeb'],
        'tipo' => [
            'codigo' => $e['TipoCodigo'],
            'nombre' => $e['TipoNombre'],
            'icono' => $e['TipoIcono'],
            'color' => $e['TipoColor'],
        ],
        // Como las veterinarias: un equipo tiene puerta a la calle, así que
        // su ubicación se publica exacta y no difuminada.
        'direccion' => $e['Direccion'],
        'zonaDescripcion' => $e['ZonaDescripcion'],
        'zonaLat' => $e['ZonaLat'] !== null ? (float) $e['ZonaLat'] : null,
        'zonaLng' => $e['ZonaLng'] !== null ? (float) $e['ZonaLng'] : null,
        'distanciaKm' => $distanciaKm !== null ? round($distanciaKm, 1) : null,
        'verificado' => (bool) $e['Verificado'],
        'totalMiembros' => rh_equipo_total_miembros($conn, $equipoId),
        // El rol del que está mirando: la pantalla decide con esto si muestra
        // "Unirme", "Pendiente de aprobación" o el panel de administración.
        'miRol' => $rol,
        'miEstadoMembresia' => $membresia['estado'] ?? null,
        'puedoAdministrar' => $rol !== null && in_array($rol, rh_equipo_roles_admin(), true),
        'estado' => $e['Estado'],
        'createdAt' => $e['CreatedAt'],
    ];
}

/** Directorio de avatares de equipo. */
function rh_dir_avatar_equipo(int $equipoId): string
{
    $dir = __DIR__ . '/../../uploads/equipos/' . $equipoId;
    if (!is_dir($dir)) {
        mkdir($dir, 0755, true);
    }

    return $dir;
}

/**
 * Guarda el avatar del equipo y devuelve la ruta relativa a `uploads/`.
 * Borra el anterior: un equipo tiene un solo avatar y los viejos sólo
 * ocupan disco.
 */
function rh_guardar_avatar_equipo(array $file, int $equipoId): string
{
    $dir = rh_dir_avatar_equipo($equipoId);

    foreach (glob($dir . '/avatar_*') ?: [] as $viejo) {
        @unlink($viejo);
    }

    $finfo = finfo_open(FILEINFO_MIME_TYPE);
    $mime = finfo_file($finfo, $file['tmp_name']);
    finfo_close($finfo);

    $filename = 'avatar_' . rh_nombre_archivo_random($mime);
    move_uploaded_file($file['tmp_name'], $dir . '/' . $filename);

    return rh_despues_guardar_imagen_publica('equipos/' . $equipoId . '/' . $filename);
}
