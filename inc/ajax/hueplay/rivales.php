<?php
/**
 * A quién retar.
 *
 * Primero la gente que seguís, porque retar a un conocido es lo que más se usa,
 * y después cualquiera que esté jugando. La búsqueda por nombre usa el mismo
 * criterio que el resto de la app.
 *
 * Se excluye a quien ya tiene un duelo abierto conmigo en ese juego: si no,
 * aparece el botón de retar, lo tocás y el backend te contesta 409.
 */
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/juegos.php';

$userId = rh_require_auth($conn);

$codigo = trim($_GET['juegoCodigo'] ?? 'huematch');
$busqueda = trim($_GET['q'] ?? '');

if (!rh_juego_existe($codigo)) {
    json_error('Juego desconocido');
}

$sql = "
    SELECT u.UserId, u.NombreCompleto, u.Username, u.AvatarPath,
           COALESCE(p.Nivel, 1) AS Nivel,
           COALESCE(p.PuntosTotales, 0) AS Puntos,
           (s.SeguimientoId IS NOT NULL) AS LoSigo
      FROM Usuario u
      LEFT JOIN UsuarioJuegoPerfil p ON p.UserId = u.UserId
      LEFT JOIN Seguimiento s ON s.UserIdSeguidor = ? AND s.UserIdSeguido = u.UserId
     WHERE u.Estado = 'A'
       AND u.EsBot = 0
       AND u.UserId <> ?
       AND NOT EXISTS (
           SELECT 1 FROM JuegoDesafio jd
            WHERE jd.JuegoCodigo = ?
              AND jd.Estado IN ('pendiente','aceptado')
              AND jd.ExpiraEn > NOW()
              AND ((jd.UserIdRetador = ? AND jd.UserIdRetado = u.UserId)
                OR (jd.UserIdRetador = u.UserId AND jd.UserIdRetado = ?))
       )
";

$tipos = 'iisii';
$params = [$userId, $userId, $codigo, $userId, $userId];

if ($busqueda !== '') {
    $sql .= ' AND (u.NombreCompleto LIKE ? OR u.Username LIKE ?)';
    $like = '%' . $busqueda . '%';
    $tipos .= 'ss';
    $params[] = $like;
    $params[] = $like;
}

// Los que seguís primero; después por nivel, que da rivales parejos arriba.
$sql .= ' ORDER BY LoSigo DESC, Puntos DESC LIMIT 40';

$stmt = $conn->prepare($sql);
$stmt->bind_param($tipos, ...$params);
$stmt->execute();
$res = $stmt->get_result();

$rivales = [];
while ($f = $res->fetch_assoc()) {
    $rivales[] = [
        'userId' => (int) $f['UserId'],
        'nombreCompleto' => $f['NombreCompleto'],
        'username' => $f['Username'],
        'avatarPath' => $f['AvatarPath'],
        'nivel' => (int) $f['Nivel'],
        'puntos' => (int) $f['Puntos'],
        'loSigo' => (bool) $f['LoSigo'],
    ];
}
$stmt->close();

json_success(['rivales' => $rivales]);
