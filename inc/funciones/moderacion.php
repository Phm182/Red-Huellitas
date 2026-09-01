<?php
/**
 * Serializers y consultas del panel de moderación (bandejas de verificaciones,
 * denuncias y reportes). Requiere bd.php, respuesta.php y auth.php incluidos.
 *
 * Todo lo que se sirve desde acá es sólo para admins (rh_require_admin): las
 * verificaciones incluyen datos extraídos del DNI de terceros.
 */

const RH_MODERACION_LIMITE_DEFAULT = 20;
const RH_MODERACION_LIMITE_MAX = 50;

/**
 * Estados de resolución que acepta cada bandeja. La verificación usa los
 * mismos valores que ya escribe rh_verificacion_auto_aplicar().
 */
const RH_VERIFICACION_ESTADOS = ['pendiente', 'aprobado', 'rechazado'];
const RH_DENUNCIA_ESTADOS = ['pendiente', 'revisada', 'desestimada'];
const RH_REPORTE_ESTADOS = ['pendiente', 'resuelto', 'descartado'];

/**
 * Columnas *Id de Denuncia mapeadas al tipo de contenido que representan.
 * El orden importa: se devuelve la primera que venga cargada, y una denuncia
 * apunta como mucho a un contenido. El front usa el 'tipo' para saber a qué
 * pantalla navegar.
 */
const RH_DENUNCIA_CONTENIDOS = [
    'PostId' => 'publicacion',
    'HistoriaId' => 'historia',
    'AdopcionId' => 'adopcion',
    'CampaniaId' => 'campania',
    'PerdidoId' => 'perdido',
    'TransitoId' => 'transito',
    'DonacionId' => 'donacion',
    'VeterinariaId' => 'veterinaria',
    'ProductoId' => 'producto',
    'ComentarioId' => 'comentario',
];

/**
 * Soft-delete del contenido asociado a una denuncia (Estado = 'I').
 * Devuelve true si se actualizó alguna fila.
 */
function rh_moderacion_bajar_contenido(mysqli $conn, array $denuncia): bool
{
    $map = [
        'PostId' => ['Post', 'PostId'],
        'HistoriaId' => ['Historia', 'HistoriaId'],
        'AdopcionId' => ['Adopcion', 'AdopcionId'],
        'CampaniaId' => ['Campania', 'CampaniaId'],
        'PerdidoId' => ['Perdido', 'PerdidoId'],
        'TransitoId' => ['Transito', 'TransitoId'],
        'DonacionId' => ['Donacion', 'DonacionId'],
        'VeterinariaId' => ['Veterinaria', 'VeterinariaId'],
        'ProductoId' => ['Producto', 'ProductoId'],
        'ComentarioId' => ['Comentario', 'ComentarioId'],
    ];

    foreach ($map as $col => [$tabla, $pk]) {
        if (empty($denuncia[$col])) {
            continue;
        }
        $id = (int) $denuncia[$col];
        $stmt = $conn->prepare("UPDATE {$tabla} SET Estado = 'I' WHERE {$pk} = ? AND Estado = 'A'");
        $stmt->bind_param('i', $id);
        $stmt->execute();
        $afectadas = $stmt->affected_rows;
        $stmt->close();
        return $afectadas > 0;
    }

    return false;
}

/**
 * Lee ?cursor= y ?limit= con los mismos topes que el resto del proyecto.
 * @return array{0: ?int, 1: int}
 */
function rh_moderacion_paginacion(): array
{
    $cursor = isset($_GET['cursor']) && $_GET['cursor'] !== '' ? (int) $_GET['cursor'] : null;
    $limit = isset($_GET['limit'])
        ? max(1, min(RH_MODERACION_LIMITE_MAX, (int) $_GET['limit']))
        : RH_MODERACION_LIMITE_DEFAULT;

    return [$cursor, $limit];
}

/**
 * Lee ?estado= validándolo contra la lista permitida de la bandeja.
 * Un estado desconocido cae al default en vez de romper, igual que
 * rh_pedidos_listar().
 */
function rh_moderacion_estado(array $permitidos, string $default = 'pendiente'): string
{
    $estado = isset($_GET['estado']) && $_GET['estado'] !== '' ? (string) $_GET['estado'] : $default;
    return in_array($estado, $permitidos, true) ? $estado : $default;
}

/**
 * Resumen mínimo de un usuario para las filas de las bandejas. Incluye email
 * (que rh_usuario_resumen no expone) porque un moderador necesita poder
 * identificar a la persona detrás de una denuncia o una verificación.
 */
function rh_moderacion_usuario(?array $u): ?array
{
    if (!$u) {
        return null;
    }

    return [
        'userId' => (int) $u['UserId'],
        'username' => $u['Username'],
        'nombreCompleto' => $u['NombreCompleto'],
        'email' => $u['Email'],
        'avatarPath' => $u['AvatarPath'],
        'estado' => $u['Estado'],
        'rol' => $u['Rol'],
    ];
}

/**
 * Fila de la bandeja de verificaciones. Nunca devuelve los paths de las
 * imágenes: sólo booleanos de qué archivos hay, porque se sirven por
 * admin/verificacion_archivo.php con control de acceso propio.
 */
function rh_moderacion_verificacion_publica(array $v, ?array $usuario): array
{
    return [
        'verificacionId' => (int) $v['VerificacionId'],
        'userId' => (int) $v['UserId'],
        'usuario' => rh_moderacion_usuario($usuario),
        'estadoRevision' => $v['EstadoRevision'],
        'motivoRechazo' => $v['MotivoRechazo'],
        'tieneDniFrente' => !empty($v['DniFrentePath']),
        'tieneDniDorso' => !empty($v['DniDorsoPath']),
        'tieneSelfie' => !empty($v['SelfiePath']),
        // Resultado del análisis automático (migración 020). Sirve para que el
        // moderador vea por qué la IA no se animó a decidir sola.
        'autoScore' => isset($v['AutoScore']) && $v['AutoScore'] !== null ? (float) $v['AutoScore'] : null,
        'faceMatchScore' => isset($v['FaceMatchScore']) && $v['FaceMatchScore'] !== null
            ? (float) $v['FaceMatchScore']
            : null,
        'autoMetodo' => $v['AutoMetodo'] ?? null,
        'autoDetalle' => $v['AutoDetalle'] ?? null,
        'dniNumeroExtraido' => $v['DniNumeroExtraido'] ?? null,
        'nombreExtraido' => $v['NombreExtraido'] ?? null,
        'kycEstado' => $v['KycEstado'] ?? null,
        'revisadoPor' => isset($v['RevisadoPor']) && $v['RevisadoPor'] !== null ? (int) $v['RevisadoPor'] : null,
        'revisadoEn' => $v['RevisadoEn'] ?? null,
        'createdAt' => $v['CreatedAt'] ?? null,
    ];
}

/**
 * Qué contenido se denunció, mirando las columnas *Id de la fila.
 * Devuelve null cuando la denuncia es contra el usuario en general.
 */
function rh_moderacion_denuncia_contenido(array $d): ?array
{
    foreach (RH_DENUNCIA_CONTENIDOS as $columna => $tipo) {
        if (!empty($d[$columna])) {
            return ['tipo' => $tipo, 'id' => (int) $d[$columna]];
        }
    }
    return null;
}

function rh_moderacion_denuncia_publica(array $d, ?array $denunciante, ?array $denunciado): array
{
    return [
        'denunciaId' => (int) $d['DenunciaId'],
        'motivo' => $d['Motivo'],
        'detalle' => $d['Detalle'],
        'estadoRevision' => $d['EstadoRevision'],
        'contenido' => rh_moderacion_denuncia_contenido($d),
        'denunciante' => rh_moderacion_usuario($denunciante),
        'denunciado' => rh_moderacion_usuario($denunciado),
        'notaAdmin' => $d['NotaAdmin'] ?? null,
        'resueltoEn' => $d['ResueltoEn'] ?? null,
        'createdAt' => $d['CreatedAt'],
    ];
}

function rh_moderacion_reporte_publico(array $r, ?array $usuario): array
{
    return [
        'reporteId' => (int) $r['ReporteId'],
        'tipo' => $r['Tipo'],
        'detalle' => $r['Detalle'],
        'pantallaOrigen' => $r['PantallaOrigen'],
        'estadoRevision' => $r['EstadoRevision'],
        'usuario' => rh_moderacion_usuario($usuario),
        'notaAdmin' => $r['NotaAdmin'] ?? null,
        'resueltoEn' => $r['ResueltoEn'] ?? null,
        'createdAt' => $r['CreatedAt'],
    ];
}

/**
 * Trae en una sola query los usuarios que van a aparecer en una tanda de
 * filas, para que los serializers no hagan N+1 (mismo criterio que
 * rh_pedido_usuarios()).
 *
 * @param int[] $ids
 * @return array<int, array> indexado por UserId
 */
function rh_moderacion_usuarios(mysqli $conn, array $ids): array
{
    $ids = array_values(array_unique(array_filter($ids)));
    if ($ids === []) {
        return [];
    }

    $placeholders = implode(',', array_fill(0, count($ids), '?'));
    $stmt = $conn->prepare(
        "SELECT UserId, Username, NombreCompleto, Email, AvatarPath, Estado, Rol
         FROM Usuario WHERE UserId IN ($placeholders)"
    );
    $stmt->bind_param(str_repeat('i', count($ids)), ...$ids);
    $stmt->execute();
    $result = $stmt->get_result();

    $usuarios = [];
    while ($row = $result->fetch_assoc()) {
        $usuarios[(int) $row['UserId']] = $row;
    }
    $stmt->close();

    return $usuarios;
}

/**
 * Contadores de las tres bandejas, para el hub del panel.
 */
function rh_moderacion_resumen(mysqli $conn): array
{
    $contar = static function (string $tabla) use ($conn): int {
        $result = $conn->query("SELECT COUNT(*) AS Total FROM $tabla WHERE EstadoRevision = 'pendiente'");
        $row = $result->fetch_assoc();
        $result->close();
        return (int) $row['Total'];
    };

    return [
        'verificacionesPendientes' => $contar('UsuarioVerificacion'),
        'denunciasPendientes' => $contar('Denuncia'),
        'reportesPendientes' => $contar('ReporteSolicitud'),
    ];
}
