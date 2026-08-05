<?php
/**
 * Mi estado en HuePlay: nivel, puntos, récords y el podio.
 *
 * Va en `hueplay/` y no en `juego/`, que es HueGotchi: son cosas distintas.
 * HueGotchi tiene nivel POR MASCOTA (`MascotaJuego`); esto es el nivel de la
 * cuenta, que suma todos los juegos y es lo que se compara entre usuarios.
 */
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/juegos.php';

$userId = rh_require_auth($conn);

$perfil = rh_juego_perfil($conn, $userId);
$total = (int) $perfil['PuntosTotales'];

// Por juego: record, puntos acumulados y nivel propio. El nivel por juego es
// lo que hace que probar un juego nuevo se sienta como progreso desde la
// primera partida, en vez de quedar clavado en el nivel de cuenta.
$records = [];
$porJuego = [];
foreach (array_keys(RH_JUEGOS) as $codigo) {
    $records[$codigo] = rh_juego_record($conn, $userId, $codigo);
    $porJuego[$codigo] = rh_juego_progreso_juego(rh_juego_puntos_de($conn, $userId, $codigo));
}

// Top 10 global. Se lee de `UsuarioJuegoPerfil` y no de un GROUP BY sobre
// `JuegoPartida`: el total ya está sumado ahí, y el índice `idx_ranking` lo
// resuelve sin recorrer el historial entero de partidas.
$res = $conn->query(
    'SELECT p.UserId, p.PuntosTotales, p.Nivel, u.NombreCompleto, u.Username, u.AvatarPath
       FROM UsuarioJuegoPerfil p
       JOIN Usuario u ON u.UserId = p.UserId
      WHERE u.Estado = \'A\' AND p.PuntosTotales > 0
      ORDER BY p.PuntosTotales DESC
      LIMIT 10'
);

$ranking = [];
$posicion = 0;
while ($f = $res->fetch_assoc()) {
    $posicion++;
    $ranking[] = [
        'posicion' => $posicion,
        'userId' => (int) $f['UserId'],
        'nombreCompleto' => $f['NombreCompleto'],
        'username' => $f['Username'],
        'avatarPath' => $f['AvatarPath'],
        'puntos' => (int) $f['PuntosTotales'],
        'nivel' => (int) $f['Nivel'],
        'soyYo' => (int) $f['UserId'] === $userId,
    ];
}

// Mi puesto real, que casi nunca está en el top 10.
$stmt = $conn->prepare(
    'SELECT COUNT(*) + 1 AS Puesto FROM UsuarioJuegoPerfil WHERE PuntosTotales > ?'
);
$stmt->bind_param('i', $total);
$stmt->execute();
$miPuesto = (int) ($stmt->get_result()->fetch_assoc()['Puesto'] ?? 1);
$stmt->close();

// Desafíos esperando una respuesta mía, para el globito del hub.
rh_juego_expirar_desafios($conn, $userId);
$stmt = $conn->prepare(
    "SELECT COUNT(*) AS N FROM JuegoDesafio
      WHERE UserIdRetado = ? AND Estado IN ('pendiente','aceptado') AND PuntosRetado IS NULL"
);
$stmt->bind_param('i', $userId);
$stmt->execute();
$pendientes = (int) ($stmt->get_result()->fetch_assoc()['N'] ?? 0);
$stmt->close();

json_success([
    'progreso' => rh_juego_progreso($total),
    'partidasJugadas' => (int) $perfil['PartidasJugadas'],
    'desafiosGanados' => (int) $perfil['DesafiosGanados'],
    'desafiosPerdidos' => (int) $perfil['DesafiosPerdidos'],
    'records' => $records,
    'porJuego' => $porJuego,
    'ranking' => $ranking,
    'miPuesto' => $miPuesto,
    'desafiosPendientes' => $pendientes,
]);
