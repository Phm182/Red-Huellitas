<?php
/**
 * Seed completo de preprod: usuarios, mascotas, feed, mapa, match, chat, juego…
 *
 * Simula varias personas usando la app para poder recorrerla de punta a punta.
 *
 * Uso (local o preprod, según bd.php):
 *   php inc/cli/seed_preprod_demo.php
 *   php inc/cli/seed_preprod_demo.php --limpiar
 *
 * Login de todos los usuarios demo:
 *   email:  demo1@rh-demo.local … demo8@rh-demo.local
 *   clave:  Demo123!
 *
 * Todo lo sembrado se identifica por email *@rh-demo.local o la marca
 * [demo-preprod] en textos, así --limpiar no toca datos reales.
 */

if (PHP_SAPI !== 'cli') {
    http_response_code(403);
    exit("Sólo por línea de comandos.\n");
}

require_once __DIR__ . '/../funciones/bd.php';
require_once __DIR__ . '/../funciones/auth.php';

const RH_PREPROD_MARCA = '[demo-preprod]';
const RH_PREPROD_PASS = 'Demo123!';
const RH_PREPROD_EMAIL_LIKE = '%@rh-demo.local';

$limpiar = in_array('--limpiar', $argv, true);

function rh_marca(string $t): string
{
    return trim($t . ' ' . RH_PREPROD_MARCA);
}

function rh_demo_user_ids(mysqli $conn): array
{
    $ids = [];
    $res = $conn->query(
        "SELECT UserId FROM Usuario WHERE Email LIKE '" . $conn->real_escape_string(RH_PREPROD_EMAIL_LIKE) . "'"
    );
    while ($row = $res->fetch_row()) {
        $ids[] = (int) $row[0];
    }
    return $ids;
}

function rh_exec(mysqli $conn, string $sql): void
{
    if (!$conn->query($sql)) {
        throw new RuntimeException($conn->error . "\nSQL: " . $sql);
    }
}

function rh_limpiar(mysqli $conn): int
{
    $ids = rh_demo_user_ids($conn);
    if (!$ids) {
        echo "No había usuarios demo.\n";
        return 0;
    }
    $in = implode(',', $ids);
    $like = '%' . $conn->real_escape_string(RH_PREPROD_MARCA) . '%';

    // Orden cuidadoso por FKs (hijos → padres).
    $steps = [
        "DELETE FROM Calificacion WHERE DeUserId IN ($in) OR ContextoId IN (
            SELECT CampaniaId FROM Campania WHERE UserId IN ($in) OR Descripcion LIKE '$like')",
        "DELETE FROM CampaniaRespuesta WHERE CampaniaInscripcionId IN (
            SELECT CampaniaInscripcionId FROM CampaniaInscripcion WHERE UserId IN ($in))",
        "DELETE FROM CampaniaPreguntaOpcion WHERE CampaniaPreguntaId IN (
            SELECT CampaniaPreguntaId FROM CampaniaPregunta WHERE CampaniaId IN (
                SELECT CampaniaId FROM Campania WHERE UserId IN ($in)))",
        "DELETE FROM CampaniaPregunta WHERE CampaniaId IN (SELECT CampaniaId FROM Campania WHERE UserId IN ($in))",
        "DELETE FROM CampaniaInscripcion WHERE UserId IN ($in) OR CampaniaId IN (
            SELECT CampaniaId FROM Campania WHERE UserId IN ($in))",
        "DELETE FROM MatchWhatsappConsentimiento WHERE UserId IN ($in)",
        "DELETE FROM MatchMensaje WHERE UserIdEmisor IN ($in)",
        "DELETE FROM MascotaMatch WHERE UserIdA IN ($in) OR UserIdB IN ($in)",
        "DELETE FROM MascotaMatchSwipe WHERE MascotaIdOrigen IN (SELECT MascotaId FROM Mascota WHERE UserId IN ($in))
            OR MascotaIdDestino IN (SELECT MascotaId FROM Mascota WHERE UserId IN ($in))",
        "DELETE FROM Mensaje WHERE UserIdEmisor IN ($in)",
        "DELETE FROM ConversacionParticipante WHERE UserId IN ($in)",
        "DELETE c FROM Conversacion c
            LEFT JOIN ConversacionParticipante p ON p.ConversacionId = c.ConversacionId
            WHERE p.ConversacionId IS NULL",
        "DELETE FROM Notificacion WHERE UserId IN ($in) OR ActorUserId IN ($in)",
        "DELETE FROM SolicitudSeguimiento WHERE UserIdSolicitante IN ($in) OR UserIdDestino IN ($in)",
        "DELETE FROM Seguimiento WHERE UserIdSeguidor IN ($in) OR UserIdSeguido IN ($in)",
        "DELETE FROM PostReaccion WHERE UserId IN ($in)",
        "DELETE FROM PostFoto WHERE PostId IN (SELECT PostId FROM Post WHERE UserId IN ($in))",
        "DELETE FROM Post WHERE UserId IN ($in)",
        "DELETE FROM HistoriaVista WHERE UserId IN ($in)",
        "DELETE FROM HistoriaEncuestaVoto WHERE UserId IN ($in)",
        "DELETE FROM HistoriaPreguntaRespuesta WHERE UserId IN ($in)",
        "DELETE FROM HistoriaRespuesta WHERE UserId IN ($in)",
        "DELETE FROM Historia WHERE UserId IN ($in)",
        "DELETE FROM AdopcionFavorito WHERE UserId IN ($in)",
        "DELETE FROM AdopcionRespuesta WHERE AdopcionPostulacionId IN (
            SELECT AdopcionPostulacionId FROM AdopcionPostulacion WHERE UserId IN ($in))",
        "DELETE FROM AdopcionPostulacion WHERE UserId IN ($in)",
        "DELETE FROM AdopcionPreguntaOpcion WHERE AdopcionPreguntaId IN (
            SELECT AdopcionPreguntaId FROM AdopcionPregunta WHERE AdopcionId IN (
                SELECT AdopcionId FROM Adopcion WHERE UserId IN ($in)))",
        "DELETE FROM AdopcionPregunta WHERE AdopcionId IN (SELECT AdopcionId FROM Adopcion WHERE UserId IN ($in))",
        "DELETE FROM AdopcionFoto WHERE AdopcionId IN (SELECT AdopcionId FROM Adopcion WHERE UserId IN ($in))",
        "DELETE FROM Adopcion WHERE UserId IN ($in)",
        "DELETE FROM TransitoFoto WHERE TransitoId IN (SELECT TransitoId FROM Transito WHERE UserId IN ($in))",
        "DELETE FROM Transito WHERE UserId IN ($in)",
        "DELETE FROM PerdidoFoto WHERE PerdidoId IN (SELECT PerdidoId FROM Perdido WHERE UserId IN ($in))",
        "DELETE FROM Perdido WHERE UserId IN ($in)",
        "DELETE FROM DonacionFoto WHERE DonacionId IN (SELECT DonacionId FROM Donacion WHERE UserId IN ($in))",
        "DELETE FROM Donacion WHERE UserId IN ($in)",
        "DELETE FROM VeterinariaFoto WHERE VeterinariaId IN (SELECT VeterinariaId FROM Veterinaria WHERE UserId IN ($in))",
        "DELETE FROM Veterinaria WHERE UserId IN ($in)",
        "DELETE FROM ProductoFavorito WHERE UserId IN ($in)",
        "DELETE FROM ProductoFoto WHERE ProductoId IN (SELECT ProductoId FROM Producto WHERE UserId IN ($in))",
        "DELETE FROM CarritoItem WHERE CarritoId IN (SELECT CarritoId FROM Carrito WHERE UserId IN ($in))",
        "DELETE FROM Carrito WHERE UserId IN ($in)",
        "DELETE FROM PedidoItem WHERE PedidoId IN (SELECT PedidoId FROM Pedido WHERE CompradorUserId IN ($in) OR VendedorUserId IN ($in))",
        "DELETE FROM Pedido WHERE CompradorUserId IN ($in) OR VendedorUserId IN ($in)",
        "DELETE FROM Producto WHERE UserId IN ($in)",
        "DELETE FROM Campania WHERE UserId IN ($in)",
        "DELETE FROM EquipoMiembro WHERE UserId IN ($in)",
        "DELETE FROM Equipo WHERE Descripcion LIKE '$like' OR Nombre LIKE '%Demo Preprod%'",
        "DELETE FROM MascotaAvatarGeneracion WHERE UserId IN ($in)",
        "DELETE FROM MascotaJuego WHERE UserId IN ($in)",
        "DELETE FROM MascotaCarnetAcceso WHERE UserId IN ($in)",
        "DELETE FROM MascotaFoto WHERE MascotaId IN (SELECT MascotaId FROM Mascota WHERE UserId IN ($in))",
        "DELETE FROM Mascota WHERE UserId IN ($in)",
        "DELETE FROM UsuarioVerificacion WHERE UserId IN ($in)",
        "DELETE FROM UsuarioSesion WHERE UserId IN ($in)",
        "DELETE FROM PasswordReset WHERE UserId IN ($in)",
        "DELETE FROM ReporteSolicitud WHERE UserId IN ($in)",
        "DELETE FROM Denuncia WHERE UserIdDenunciante IN ($in) OR UserIdDenunciado IN ($in)",
        "DELETE FROM MapaCargaUsuarioDia WHERE UserId IN ($in)",
        "DELETE FROM Usuario WHERE UserId IN ($in)",
    ];

    // Algunas tablas pueden no existir / columnas distintas: tolerar error e informar.
    $ok = 0;
    foreach ($steps as $sql) {
        try {
            // Subconsultas con IN (SELECT…) y la misma tabla a veces fallan en MySQL;
            // materializamos con ids ya conocidos donde hace falta.
            if (!$conn->query($sql)) {
                // Reintentos silenciosos para tablas opcionales / nombres viejos.
                fwrite(STDERR, "aviso limpieza: " . $conn->error . "\n");
            } else {
                $ok += $conn->affected_rows;
            }
        } catch (Throwable $e) {
            fwrite(STDERR, "aviso limpieza: " . $e->getMessage() . "\n");
        }
    }
    return $ok;
}

if ($limpiar) {
    $n = rh_limpiar($conn);
    echo "Limpieza demo preprod OK (filas afectadas ~$n).\n";
    exit(0);
}

// Si ya hay demo, limpiar y volver a sembrar (idempotente).
if (rh_demo_user_ids($conn)) {
    echo "Ya había demo: limpiando antes de reseñar…\n";
    rh_limpiar($conn);
}

$hash = rh_hash_password(RH_PREPROD_PASS);
$tipoIndividual = (int) ($conn->query(
    "SELECT TipoUsuarioId FROM TipoUsuarioCatalogo WHERE Codigo='individual' LIMIT 1"
)->fetch_row()[0] ?? 0);
$tipoRefugio = (int) ($conn->query(
    "SELECT TipoUsuarioId FROM TipoUsuarioCatalogo WHERE Codigo='refugio' LIMIT 1"
)->fetch_row()[0] ?? $tipoIndividual);
$planHue = (int) ($conn->query(
    "SELECT PlanId FROM SuscripcionPlan WHERE Codigo IN ('hue_plus','hue_plus_comercial','vitrina_comercial') ORDER BY PlanId LIMIT 1"
)->fetch_row()[0] ?? 0);

$raza = static function (mysqli $conn, string $especie, string $nombre): ?int {
    $stmt = $conn->prepare('SELECT RazaId FROM RazaCatalogo WHERE Especie=? AND Nombre=? LIMIT 1');
    $stmt->bind_param('ss', $especie, $nombre);
    $stmt->execute();
    $id = $stmt->get_result()->fetch_row()[0] ?? null;
    $stmt->close();
    return $id !== null ? (int) $id : null;
};

$catProducto = static function (mysqli $conn, string $codigo): int {
    $stmt = $conn->prepare('SELECT CategoriaId FROM ProductoCategoriaCatalogo WHERE Codigo=? LIMIT 1');
    $stmt->bind_param('s', $codigo);
    $stmt->execute();
    $id = (int) ($stmt->get_result()->fetch_row()[0] ?? 0);
    $stmt->close();
    if ($id <= 0) {
        $id = (int) ($conn->query('SELECT CategoriaId FROM ProductoCategoriaCatalogo ORDER BY CategoriaId LIMIT 1')->fetch_row()[0] ?? 1);
    }
    return $id;
};

$usuariosDef = [
    // email local, username, nombre, barrio, lat, lng, tipo, whatsapp, hueplus?
    ['demo1@rh-demo.local', 'lucia_palermo', 'Lucía Fernández', 'Palermo', -34.5885, -58.4266, 'individual', '5491111110001', false],
    ['demo2@rh-demo.local', 'martin_belgrano', 'Martín Gómez', 'Belgrano', -34.5627, -58.4560, 'individual', '5491111110002', false],
    ['demo3@rh-demo.local', 'sofia_caballito', 'Sofía Ruiz', 'Caballito', -34.6187, -58.4404, 'individual', '5491111110003', true],
    ['demo4@rh-demo.local', 'refugio_huellas', 'Refugio Huellas CABA', 'Villa Crespo', -34.5990, -58.4380, 'refugio', '5491111110004', true],
    ['demo5@rh-demo.local', 'nacho_almagro', 'Ignacio Pérez', 'Almagro', -34.6096, -58.4200, 'individual', '5491111110005', false],
    ['demo6@rh-demo.local', 'vale_flores', 'Valentina Díaz', 'Flores', -34.6280, -58.4640, 'individual', '5491111110006', false],
    ['demo7@rh-demo.local', 'vet_san_telmo', 'Vet Amigos San Telmo', 'San Telmo', -34.6212, -58.3731, 'individual', '5491111110007', true],
    ['demo8@rh-demo.local', 'rescatistas_norte', 'Rescatistas del Norte', 'Núñez', -34.5450, -58.4620, 'refugio', '5491111110008', false],
];

$userIds = [];
foreach ($usuariosDef as $u) {
    [$email, $user, $nombre, $barrio, $lat, $lng, $tipo, $wa, $hue] = $u;
    $tipoId = $tipo === 'refugio' ? $tipoRefugio : $tipoIndividual;
    $planSql = ($hue && $planHue)
        ? ((int) $planHue) . ", '" . date('Y-m-d', strtotime('+60 days')) . "'"
        : 'NULL, NULL';
    $sql = sprintf(
        "INSERT INTO Usuario
            (Email, PasswordHash, NombreCompleto, Username, ZonaLat, ZonaLng, ZonaDescripcion,
             WhatsappNumero, WhatsappVisibilidad, OnboardingCompleto, AceptoClausulaAntiCriaderos,
             AceptoClausulaFecha, Rol, TipoUsuarioId, SuscripcionPlanId, SuscripcionPagaHasta, Estado)
         VALUES ('%s','%s','%s','%s',%F,%F,'%s','%s','publica','Y',1,NOW(),'usuario',%d,%s,'A')",
        $conn->real_escape_string($email),
        $conn->real_escape_string($hash),
        $conn->real_escape_string($nombre),
        $conn->real_escape_string($user),
        $lat,
        $lng,
        $conn->real_escape_string($barrio . ', CABA'),
        $conn->real_escape_string($wa),
        $tipoId,
        $planSql
    );
    rh_exec($conn, $sql);
    $userIds[] = (int) $conn->insert_id;
}

[$u1, $u2, $u3, $u4, $u5, $u6, $u7, $u8] = $userIds;
echo 'Usuarios demo: ' . implode(', ', $userIds) . "\n";

// Seguimientos cruzados
$follows = [
    [$u1, $u2], [$u1, $u4], [$u2, $u1], [$u2, $u3], [$u3, $u4], [$u3, $u5],
    [$u5, $u1], [$u5, $u6], [$u6, $u4], [$u6, $u8], [$u7, $u4], [$u8, $u1],
];
foreach ($follows as [$a, $b]) {
    rh_exec($conn, "INSERT IGNORE INTO Seguimiento (UserIdSeguidor, UserIdSeguido) VALUES ($a,$b)");
}

// Mascotas
$razas = [
    'lab' => $raza($conn, 'perro', 'Labrador Retriever'),
    'mestizo' => $raza($conn, 'perro', 'Mestizo'),
    'caniche' => $raza($conn, 'perro', 'Caniche'),
    'siames' => $raza($conn, 'gato', 'Siamés'),
    'mestizoG' => $raza($conn, 'gato', 'Mestizo / Común Europeo'),
    'maine' => $raza($conn, 'gato', 'Maine Coon'),
];

$mascotasDef = [
    // user, nombre, sexo, especie, razaKey, edadA, edadM, match, desc
    [$u1, 'Lola', 'hembra', 'perro', 'lab', 3, 0, 1, 'Cariñosa y juguetona'],
    [$u1, 'Mora', 'hembra', 'gato', 'siames', 2, 4, 1, 'Curiosa, ama las ventanas'],
    [$u2, 'Rocky', 'macho', 'perro', 'mestizo', 4, 2, 1, 'Ideal para departamento grande'],
    [$u2, 'Nube', 'hembra', 'gato', 'mestizoG', 1, 6, 1, 'Tranquila y mimosa'],
    [$u3, 'Toby', 'macho', 'perro', 'caniche', 5, 0, 1, 'Entrenado y sociable'],
    [$u4, 'Rita', 'hembra', 'perro', 'mestizo', 2, 0, 0, 'En el refugio, lista para adoptantes'],
    [$u5, 'Otto', 'macho', 'gato', 'maine', 3, 3, 1, 'Grande y noble'],
    [$u6, 'Pepa', 'hembra', 'perro', 'lab', 1, 2, 1, 'Cachorra con mucha energía'],
    [$u8, 'Chispa', 'hembra', 'gato', 'mestizoG', 0, 8, 0, 'Rescatada, en socialización'],
];

$mascotaIds = [];
foreach ($mascotasDef as $m) {
    [$uid, $nom, $sexo, $esp, $rk, $ea, $em, $match, $desc] = $m;
    $rid = $razas[$rk] ?? 'NULL';
    $ridSql = $rid === null || $rid === 'NULL' ? 'NULL' : (int) $rid;
    $descSql = $conn->real_escape_string(rh_marca($desc));
    $nomSql = $conn->real_escape_string($nom);
    rh_exec(
        $conn,
        "INSERT INTO Mascota
            (UserId, Nombre, Sexo, EdadAnios, EdadMeses, Especie, RazaId, DescripcionTexto,
             CarnetVisibilidad, DisponibleParaMatch, Estado)
         VALUES ($uid,'$nomSql','$sexo',$ea,$em,'$esp',$ridSql,'$descSql','publica',$match,'A')"
    );
    $mascotaIds[] = (int) $conn->insert_id;
}
[$m1, $m2, $m3, $m4, $m5, $m6, $m7, $m8, $m9] = $mascotaIds;
echo 'Mascotas: ' . implode(', ', $mascotaIds) . "\n";

// Juego HueGotchi para varias
foreach ([[$m1, $u1, 70, 85, 60, 90, 3, 120], [$m3, $u2, 40, 55, 80, 50, 2, 40], [$m5, $u3, 90, 95, 70, 80, 5, 300]] as $j) {
    [$mid, $uid, $h, $f, $e, $hi, $niv, $xp] = $j;
    rh_exec(
        $conn,
        "INSERT INTO MascotaJuego
            (MascotaId, UserId, Hambre, Felicidad, Energia, Higiene, Nivel, Experiencia, RachaDias, UltimaVisita)
         VALUES ($mid,$uid,$h,$f,$e,$hi,$niv,$xp,3,CURDATE())
         ON DUPLICATE KEY UPDATE Hambre=$h, Felicidad=$f, Energia=$e, Higiene=$hi"
    );
}

// Posts + reacciones
$posts = [
    [$u1, 'Paseo matutino por los Bosques de Palermo con Lola 🐕'],
    [$u2, 'Rocky descubrió que odia la lluvia… y ama las toallas.'],
    [$u3, 'Tips: enriquecimiento ambiental barato para gatos en dpto.'],
    [$u4, 'Este finde abrimos visitas al refugio. ¡Anotate!'],
    [$u5, 'Otto aprobó su control anual. Feliz vet day.'],
    [$u6, 'Primera clase de education canina con Pepa 💪'],
    [$u8, 'Rescate de la semana: Chispa ya come solita.'],
    [$u1, '¿Alguien recomienda guardería confiable en Palermo?'],
];
$postIds = [];
foreach ($posts as [$uid, $texto]) {
    $t = $conn->real_escape_string(rh_marca($texto));
    rh_exec($conn, "INSERT INTO Post (UserId, Texto, Estado) VALUES ($uid,'$t','A')");
    $postIds[] = (int) $conn->insert_id;
}
$reacciones = [
    [$postIds[0], $u2, 'guau'], [$postIds[0], $u3, 'amor'], [$postIds[0], $u5, 'huella'],
    [$postIds[1], $u1, 'me_divierte'], [$postIds[3], $u1, 'apoyo'], [$postIds[3], $u6, 'like'],
    [$postIds[6], $u4, 'abrazo'], [$postIds[7], $u7, 'like'],
];
foreach ($reacciones as [$pid, $uid, $tipo]) {
    rh_exec($conn, "INSERT IGNORE INTO PostReaccion (PostId, UserId, Tipo) VALUES ($pid,$uid,'$tipo')");
}

// Adopciones (refugio + rescatistas)
$adops = [
    [$u4, 'Luna', 'hembra', 'perro', 'mestizo', 2, 0, 'Palermo', -34.5885, -58.4266, 'Cachorra vacunada, sociable con chicos'],
    [$u4, 'Mishi', 'macho', 'gato', 'mestizoG', 1, 3, 'Villa Crespo', -34.5990, -58.4380, 'Gatito esterilizado, indoor'],
    [$u8, 'Bruno', 'macho', 'perro', 'lab', 4, 0, 'Belgrano', -34.5627, -58.4560, 'Adulto tranquilo, ideal casa con patio'],
    [$u8, 'Cleo', 'hembra', 'gato', 'siames', 3, 0, 'Núñez', -34.5450, -58.4620, 'Independiente y cariñosa'],
    [$u4, 'Tara', 'hembra', 'perro', 'caniche', 5, 6, 'Almagro', -34.6096, -58.4200, 'Ya tuvo hogar, busca segundo chance'],
];
$adopIds = [];
foreach ($adops as $a) {
    [$uid, $nom, $sexo, $esp, $rk, $ea, $em, $barrio, $lat, $lng, $desc] = $a;
    $rid = $razas[$rk] ?? null;
    $ridSql = $rid ? (int) $rid : 'NULL';
    rh_exec(
        $conn,
        sprintf(
            "INSERT INTO Adopcion
                (UserId, Nombre, Sexo, EdadAnios, EdadMeses, Especie, RazaId, Descripcion,
                 ZonaDescripcion, ZonaLat, ZonaLng, EstadoAdopcion, Estado)
             VALUES (%d,'%s','%s',%d,%d,'%s',%s,'%s','%s',%F,%F,'disponible','A')",
            $uid,
            $conn->real_escape_string($nom),
            $sexo,
            $ea,
            $em,
            $esp,
            $ridSql,
            $conn->real_escape_string(rh_marca($desc)),
            $conn->real_escape_string($barrio . ', CABA'),
            $lat,
            $lng
        )
    );
    $adopIds[] = (int) $conn->insert_id;
}
// Postulaciones
rh_exec($conn, "INSERT IGNORE INTO AdopcionPostulacion (AdopcionId, UserId, EstadoRevision) VALUES
    ({$adopIds[0]},$u1,'pendiente'),
    ({$adopIds[0]},$u2,'pendiente'),
    ({$adopIds[2]},$u3,'pendiente'),
    ({$adopIds[1]},$u5,'pendiente'),
    ({$adopIds[3]},$u6,'pendiente')");
rh_exec($conn, "INSERT IGNORE INTO AdopcionFavorito (AdopcionId, UserId) VALUES
    ({$adopIds[0]},$u3), ({$adopIds[2]},$u1), ({$adopIds[4]},$u2)");

// Tránsito
$transitos = [
    [$u1, 'necesito', 'Lola', 'hembra', 'perro', 'lab', 10, 'Palermo', -34.5885, -58.4266, 'Viajo 10 días, busco casa de tránsito responsable'],
    [$u4, 'ofrezco', null, null, 'perro', 'mestizo', 30, 'Villa Crespo', -34.5990, -58.4380, 'Ofrecemos tránsito temporario en el refugio satélite'],
    [$u5, 'necesito', 'Otto', 'macho', 'gato', 'maine', 14, 'Almagro', -34.6096, -58.4200, 'Mudanza, necesito cuidado por 2 semanas'],
    [$u8, 'ofrezco', null, null, 'gato', 'mestizoG', 21, 'Núñez', -34.5450, -58.4620, 'Cupos de tránsito para gatitos rescatados'],
    [$u2, 'necesito', 'Rocky', 'macho', 'perro', 'mestizo', 7, 'Belgrano', -34.5627, -58.4560, 'Fin de semana largo fuera de CABA'],
];
foreach ($transitos as $t) {
    [$uid, $tipo, $nom, $sexo, $esp, $rk, $dias, $barrio, $lat, $lng, $desc] = $t;
    $rid = $razas[$rk] ?? null;
    $ridSql = $rid ? (int) $rid : 'NULL';
    $nomSql = $nom ? "'" . $conn->real_escape_string($nom) . "'" : 'NULL';
    $sexoSql = $sexo ? "'$sexo'" : 'NULL';
    rh_exec(
        $conn,
        sprintf(
            "INSERT INTO Transito
                (UserId, Tipo, Nombre, Sexo, Especie, RazaId, Descripcion, DuracionDias,
                 EstadoTransito, ZonaDescripcion, ZonaLat, ZonaLng, Estado)
             VALUES (%d,'%s',%s,%s,'%s',%s,'%s',%d,'disponible','%s',%F,%F,'A')",
            $uid,
            $tipo,
            $nomSql,
            $sexoSql,
            $esp,
            $ridSql,
            $conn->real_escape_string(rh_marca($desc)),
            $dias,
            $conn->real_escape_string($barrio . ', CABA'),
            $lat,
            $lng
        )
    );
}

// Perdidos / encontrados
$perdidos = [
    [$u5, 'perdido', 'Coco', 'macho', 'perro', 'mestizo', 'Almagro', -34.6096, -58.4200, 'Se escapó ayer cerca de Rivadavia'],
    [$u6, 'encontrado', null, 'hembra', 'gato', 'mestizoG', 'Flores', -34.6280, -58.4640, 'Gata encontrada en balcón, collar rojo'],
    [$u2, 'perdido', 'Luna', 'hembra', 'gato', 'siames', 'Belgrano', -34.5627, -58.4560, 'Siamesa, muy asustadiza'],
    [$u1, 'encontrado', null, 'macho', 'perro', 'caniche', 'Palermo', -34.5885, -58.4266, 'Caniche chico sin collar en plaza'],
    [$u8, 'perdido', 'Negro', 'macho', 'perro', 'lab', 'Núñez', -34.5450, -58.4620, 'Labrador negro, responde a Negro'],
];
foreach ($perdidos as $p) {
    [$uid, $tipo, $nom, $sexo, $esp, $rk, $barrio, $lat, $lng, $desc] = $p;
    $rid = $razas[$rk] ?? null;
    $ridSql = $rid ? (int) $rid : 'NULL';
    $nomSql = $nom ? "'" . $conn->real_escape_string($nom) . "'" : 'NULL';
    rh_exec(
        $conn,
        sprintf(
            "INSERT INTO Perdido
                (UserId, Tipo, Nombre, Sexo, Especie, RazaId, Descripcion,
                 UltimoLugarDescripcion, UltimoLugarLat, UltimoLugarLng, FechaSuceso, EstadoPerdido, Estado)
             VALUES (%d,'%s',%s,'%s','%s',%s,'%s','%s',%F,%F,CURDATE(),'activo','A')",
            $uid,
            $tipo,
            $nomSql,
            $sexo,
            $esp,
            $ridSql,
            $conn->real_escape_string(rh_marca($desc)),
            $conn->real_escape_string($barrio . ', CABA'),
            $lat,
            $lng
        )
    );
}

// Donaciones
$dons = [
    [$u4, 'necesito', 'alimento', 'perro', 'Villa Crespo', -34.5990, -58.4380, 'Necesitamos bolsas de adulto 15kg'],
    [$u3, 'ofrezco', 'insumo', 'gato', 'Caballito', -34.6187, -58.4404, 'Arena y comedero nuevos sin uso'],
    [$u8, 'necesito', 'ropa', 'perro', 'Núñez', -34.5450, -58.4620, 'Abrigos para cachorros en invierno'],
    [$u1, 'ofrezco', 'alimento', 'gato', 'Palermo', -34.5885, -58.4266, 'Latas húmedas abiertas por mudanza'],
    [$u6, 'necesito', 'insumo', null, 'Flores', -34.6280, -58.4640, 'Transportadora mediana prestada/donada'],
];
foreach ($dons as $d) {
    [$uid, $tipo, $cat, $esp, $barrio, $lat, $lng, $desc] = $d;
    $espSql = $esp ? "'$esp'" : 'NULL';
    rh_exec(
        $conn,
        sprintf(
            "INSERT INTO Donacion
                (UserId, Tipo, Categoria, Descripcion, Especie, EstadoDonacion,
                 ZonaDescripcion, ZonaLat, ZonaLng, Estado)
             VALUES (%d,'%s','%s','%s',%s,'disponible','%s',%F,%F,'A')",
            $uid,
            $tipo,
            $cat,
            $conn->real_escape_string(rh_marca($desc)),
            $espSql,
            $conn->real_escape_string($barrio . ', CABA'),
            $lat,
            $lng
        )
    );
}

// Veterinarias
$vets = [
    [$u7, 'Vet Amigos San Telmo', 'San Telmo', -34.6212, -58.3731, 'Defensa 800', 'Clínica general y vacunas'],
    [$u7, 'Amigos Sucursal Boedo', 'Boedo', -34.6300, -58.4180, 'Av. San Juan 3500', 'Guardia 24hs fines de semana'],
    [$u3, 'Consultorio Sofía', 'Caballito', -34.6187, -58.4404, 'Acoyte 500', 'Atención felina a domicilio'],
    [$u4, 'Sala Refugio Huellas', 'Villa Crespo', -34.5990, -58.4380, 'Corrientes 5500', 'Atención a adoptantes del refugio'],
    [$u8, 'Punto Vet Norte', 'Belgrano', -34.5627, -58.4560, 'Cabildo 2200', 'Desparasitación y chip'],
];
foreach ($vets as $v) {
    [$uid, $nom, $barrio, $lat, $lng, $dir, $desc] = $v;
    rh_exec(
        $conn,
        sprintf(
            "INSERT INTO Veterinaria
                (UserId, Nombre, Descripcion, Telefono, WhatsappNumero, Horario, Direccion,
                 ZonaDescripcion, ZonaLat, ZonaLng, Estado)
             VALUES (%d,'%s','%s','1112345678','5491111110007','Lun-Vie 10-19','%s','%s',%F,%F,'A')",
            $uid,
            $conn->real_escape_string($nom),
            $conn->real_escape_string(rh_marca($desc)),
            $conn->real_escape_string($dir),
            $conn->real_escape_string($barrio . ', CABA'),
            $lat,
            $lng
        )
    );
}

// Equipo + campaña
$tipoEquipo = (int) ($conn->query(
    "SELECT TipoEquipoId FROM TipoEquipoCatalogo WHERE Codigo='refugio' LIMIT 1"
)->fetch_row()[0] ?? 0);
$equipoId = 0;
if ($tipoEquipo) {
    rh_exec(
        $conn,
        "INSERT INTO Equipo
            (TipoEquipoId, Nombre, Descripcion, Email, Telefono, Direccion, ZonaDescripcion, ZonaLat, ZonaLng, Verificado, Estado)
         VALUES (
            $tipoEquipo,
            'Huellas Unidas Demo Preprod',
            '" . $conn->real_escape_string(rh_marca('Red de refugios demo para pruebas')) . "',
            'equipo@rh-demo.local',
            '5491111110004',
            'Corrientes 5400',
            'Villa Crespo, CABA',
            -34.5990, -58.4380, 1, 'A'
         )"
    );
    $equipoId = (int) $conn->insert_id;
    rh_exec($conn, "INSERT INTO EquipoMiembro (EquipoId, UserId, Rol, Estado, ResueltoEn) VALUES
        ($equipoId,$u4,'dueno','activo',NOW()),
        ($equipoId,$u8,'admin','activo',NOW()),
        ($equipoId,$u1,'miembro','activo',NOW()),
        ($equipoId,$u3,'miembro','pendiente',NULL),
        ($equipoId,$u5,'miembro','activo',NOW())");
}

$campanias = [
    [$u4, 'castracion', 'Castración comunitaria Palermo', 'Palermo', -34.5885, -58.4266],
    [$u8, 'vacunacion', 'Vacunación antirrábica Núñez', 'Núñez', -34.5450, -58.4620],
    [$u4, 'vacunacion', 'Doble y Triple felina Villa Crespo', 'Villa Crespo', -34.5990, -58.4380],
    [$u7, 'castracion', 'Campaña San Telmo (cupos limitados)', 'San Telmo', -34.6212, -58.3731],
    [$u8, 'castracion', 'Operativo Belgrano rescates', 'Belgrano', -34.5627, -58.4560],
];
$campIds = [];
foreach ($campanias as $c) {
    [$uid, $tipo, $titulo, $barrio, $lat, $lng] = $c;
    $eq = $equipoId ? (string) $equipoId : 'NULL';
    rh_exec(
        $conn,
        sprintf(
            "INSERT INTO Campania
                (UserId, EquipoId, Tipo, Titulo, Descripcion, MensajeAviso, FechaDesde, FechaHasta,
                 ZonaDescripcion, Direccion, ZonaLat, ZonaLng, RequiereInscripcion, CupoMaximo, BajaLimiteHoras, Estado)
             VALUES (%d,%s,'%s','%s','%s','Llegá 15 min antes',CURDATE() + INTERVAL 7 DAY, CURDATE() + INTERVAL 8 DAY,
                     '%s','Plaza central',%F,%F,1,40,24,'A')",
            $uid,
            $eq,
            $tipo,
            $conn->real_escape_string($titulo),
            $conn->real_escape_string(rh_marca('Campaña demo abierta a la comunidad')),
            $conn->real_escape_string($barrio . ', CABA'),
            $lat,
            $lng
        )
    );
    $campIds[] = (int) $conn->insert_id;
}
rh_exec($conn, "INSERT IGNORE INTO CampaniaInscripcion (CampaniaId, UserId, Estado, Posicion) VALUES
    ({$campIds[0]},$u1,'confirmada',1),
    ({$campIds[0]},$u2,'confirmada',2),
    ({$campIds[0]},$u3,'lista_espera',3),
    ({$campIds[1]},$u5,'confirmada',1),
    ({$campIds[1]},$u6,'confirmada',2)");

// Productos (vendedora HuePlus)
$catAlim = $catProducto($conn, 'alimento');
$catJug = $catProducto($conn, 'juguetes');
$catHig = $catProducto($conn, 'higiene');
$catSal = $catProducto($conn, 'salud');
$catPaseo = $catProducto($conn, 'paseo');
$prods = [
    [$u3, 'producto', $catAlim, 'Alimento premium 3kg', 12500, 'perro', 'Caballito', -34.6187, -58.4404],
    [$u3, 'producto', $catJug, 'Pelota cuerda XL', 3500, 'perro', 'Caballito', -34.6187, -58.4404],
    [$u3, 'servicio', $catPaseo, 'Paseo 40 min zona Caballito', 6000, 'perro', 'Caballito', -34.6187, -58.4404],
    [$u7, 'producto', $catHig, 'Shampoo hipoalergénico', 4800, 'gato', 'San Telmo', -34.6212, -58.3731],
    [$u7, 'servicio', $catSal, 'Consulta veterinaria general', 18000, null, 'San Telmo', -34.6212, -58.3731],
];
$prodIds = [];
foreach ($prods as $p) {
    [$uid, $tipo, $cat, $nom, $precio, $esp, $barrio, $lat, $lng] = $p;
    $espSql = $esp ? "'$esp'" : 'NULL';
    rh_exec(
        $conn,
        sprintf(
            "INSERT INTO Producto
                (UserId, TipoListado, CategoriaId, Nombre, Descripcion, Precio, Cantidad, Especie,
                 ZonaDescripcion, ZonaLat, ZonaLng, Estado)
             VALUES (%d,'%s',%d,'%s','%s',%F,5,%s,'%s',%F,%F,'A')",
            $uid,
            $tipo,
            $cat,
            $conn->real_escape_string($nom),
            $conn->real_escape_string(rh_marca('Publicación de marketplace demo')),
            $precio,
            $espSql,
            $conn->real_escape_string($barrio . ', CABA'),
            $lat,
            $lng
        )
    );
    $prodIds[] = (int) $conn->insert_id;
}
rh_exec($conn, "INSERT IGNORE INTO ProductoFavorito (ProductoId, UserId) VALUES
    ({$prodIds[0]},$u1), ({$prodIds[2]},$u2), ({$prodIds[4]},$u5)");

// Match mutuo Lola(m1/u1) <-> Rocky(m3/u2)
$a = min($m1, $m3);
$b = max($m1, $m3);
$ua = $a === $m1 ? $u1 : $u2;
$ub = $a === $m1 ? $u2 : $u1;
rh_exec($conn, "INSERT IGNORE INTO MascotaMatchSwipe (MascotaIdOrigen, MascotaIdDestino, Direccion) VALUES
    ($m1,$m3,'like'), ($m3,$m1,'like'), ($m2,$m4,'like'), ($m4,$m2,'pass'), ($m5,$m8,'like')");
rh_exec(
    $conn,
    "INSERT IGNORE INTO MascotaMatch (MascotaIdA, MascotaIdB, UserIdA, UserIdB, Estado)
     VALUES ($a,$b,$ua,$ub,'A')"
);
$matchId = (int) ($conn->query(
    "SELECT MatchId FROM MascotaMatch WHERE MascotaIdA=$a AND MascotaIdB=$b"
)->fetch_row()[0] ?? 0);
if ($matchId) {
    rh_exec(
        $conn,
        "INSERT INTO MatchMensaje (MatchId, UserIdEmisor, Texto) VALUES
            ($matchId,$u1,'" . $conn->real_escape_string(rh_marca('¡Hola! Lola y Rocky se cayeron bien 🐾')) . "'),
            ($matchId,$u2,'" . $conn->real_escape_string(rh_marca('Jajaja sí, ¿plaza Sicilia el sábado?')) . "'),
            ($matchId,$u1,'" . $conn->real_escape_string(rh_marca('Dale, 11 hs. Llevo agua.')) . "')"
    );
}

// Chat DM
rh_exec($conn, 'INSERT INTO Conversacion (UltimoMensajeEn) VALUES (NOW())');
$conv1 = (int) $conn->insert_id;
rh_exec($conn, "INSERT INTO ConversacionParticipante (ConversacionId, UserId, Estado) VALUES
    ($conv1,$u1,'activa'), ($conv1,$u4,'activa')");
rh_exec(
    $conn,
    "INSERT INTO Mensaje (ConversacionId, UserIdEmisor, Texto, Tipo) VALUES
        ($conv1,$u1,'" . $conn->real_escape_string(rh_marca('Hola! Vi a Luna en adopción, ¿sigue disponible?')) . "','texto'),
        ($conv1,$u4,'" . $conn->real_escape_string(rh_marca('Sí! Podés acercarte mañana de 15 a 18.')) . "','texto'),
        ($conv1,$u1,'" . $conn->real_escape_string(rh_marca('Perfecto, voy con DNI.')) . "','texto')"
);
rh_exec($conn, 'INSERT INTO Conversacion (UltimoMensajeEn) VALUES (NOW())');
$conv2 = (int) $conn->insert_id;
rh_exec($conn, "INSERT INTO ConversacionParticipante (ConversacionId, UserId, Estado) VALUES
    ($conv2,$u2,'activa'), ($conv2,$u3,'solicitud')");
rh_exec(
    $conn,
    "INSERT INTO Mensaje (ConversacionId, UserIdEmisor, Texto, Tipo) VALUES
        ($conv2,$u2,'" . $conn->real_escape_string(rh_marca('Hola Sofi, ¿sigue el servicio de paseo?')) . "','texto')"
);

// Notificaciones
$notifs = [
    [$u1, 'match_nuevo', '¡Nuevo match!', 'Lola hizo match con Rocky', '/(app)/match', $u2, $m1],
    [$u2, 'match_nuevo', '¡Nuevo match!', 'Rocky hizo match con Lola', '/(app)/match', $u1, $m3],
    [$u4, 'adopcion_postulacion', 'Nueva postulación', 'Lucía se postuló a Luna', '/(app)/adopcion', $u1, null],
    [$u3, 'seguimiento', 'Nuevo seguidor', 'Martín empezó a seguirte', '/(app)/perfil', $u2, null],
    [$u1, 'chat_mensaje', 'Mensaje nuevo', 'Refugio Huellas te respondió', '/(app)/chat', $u4, null],
    [$u5, 'campania', 'Inscripción OK', 'Quedaste anotado en vacunación Núñez', '/(app)/campanias', $u8, null],
    [$u6, 'sistema', 'Bienvenida demo', 'Cuenta de prueba preprod lista', null, null, null],
    [$u8, 'donacion', 'Pedido de ayuda', 'Alguien miró tu pedido de ropa', '/(app)/donaciones', $u1, null],
];
foreach ($notifs as $n) {
    [$uid, $tipo, $tit, $cuerpo, $ruta, $actor, $mid] = $n;
    $rutaSql = $ruta ? "'" . $conn->real_escape_string($ruta) . "'" : 'NULL';
    $actorSql = $actor ? (int) $actor : 'NULL';
    $midSql = $mid ? (int) $mid : 'NULL';
    rh_exec(
        $conn,
        sprintf(
            "INSERT INTO Notificacion (UserId, Tipo, Titulo, Cuerpo, Ruta, ActorUserId, MascotaId, Leida)
             VALUES (%d,'%s','%s','%s',%s,%s,%s,0)",
            $uid,
            $conn->real_escape_string($tipo),
            $conn->real_escape_string($tit),
            $conn->real_escape_string(rh_marca($cuerpo)),
            $rutaSql,
            $actorSql,
            $midSql
        )
    );
}

// Mapa consumo baseline (opcional, no rompe si falta)
@$conn->query("INSERT INTO MapaCargaMes (Periodo, Cargas) VALUES (DATE_FORMAT(NOW(),'%Y-%m'), 12)
    ON DUPLICATE KEY UPDATE Cargas = GREATEST(Cargas, 12)");
foreach ($userIds as $uid) {
    @$conn->query(
        "INSERT INTO MapaCargaUsuarioDia (UserId, Dia, Cargas) VALUES ($uid, CURDATE(), 2)
         ON DUPLICATE KEY UPDATE Cargas = GREATEST(Cargas, 2)"
    );
}

echo "\n✅ Seed preprod listo.\n";
echo "Login (todos):\n";
echo "  clave: " . RH_PREPROD_PASS . "\n";
foreach ($usuariosDef as $i => $u) {
    echo '  ' . $u[0] . '  (@' . $u[1] . ")  barrio {$u[3]}\n";
}
echo "\nPara borrar: php inc/cli/seed_preprod_demo.php --limpiar\n";
