<?php
/**
 * Mascotas del usuario con su estado de juego resumido, para el selector.
 * No crea filas en MascotaJuego: las mascotas que nunca se jugaron se
 * devuelven con los stats por defecto (todo en 100), y la fila real se crea
 * recién cuando el usuario entra a jugar con esa mascota.
 */
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/mascotas.php';
require_once __DIR__ . '/../../funciones/juego.php';

$userId = rh_require_auth($conn);

if (!rh_usuario_verificado($conn, $userId)) {
    json_error('Necesitás tu cuenta verificada para jugar', 403);
}

$stmt = $conn->prepare(
    "SELECT Mascota.*,
            MascotaJuego.Hambre, MascotaJuego.Felicidad, MascotaJuego.Energia, MascotaJuego.Higiene,
            MascotaJuego.StatsActualizadoEn, MascotaJuego.Nivel, MascotaJuego.RachaDias,
            MascotaJuego.AvatarPath,
            TIMESTAMPDIFF(SECOND, MascotaJuego.StatsActualizadoEn, NOW()) AS SegundosDesdeStats
     FROM Mascota
     LEFT JOIN MascotaJuego ON MascotaJuego.MascotaId = Mascota.MascotaId
     WHERE Mascota.UserId = ? AND Mascota.Estado = 'A'
     ORDER BY Mascota.MascotaId DESC"
);
$stmt->bind_param('i', $userId);
$stmt->execute();
$result = $stmt->get_result();

$mascotas = [];
while ($row = $result->fetch_assoc()) {
    // Sin fila de juego todavía: valores por defecto, sin escribir nada.
    $juego = [
        'MascotaId' => $row['MascotaId'],
        'Hambre' => $row['Hambre'] ?? 100,
        'Felicidad' => $row['Felicidad'] ?? 100,
        'Energia' => $row['Energia'] ?? 100,
        'Higiene' => $row['Higiene'] ?? 100,
        'StatsActualizadoEn' => $row['StatsActualizadoEn'] ?? date('Y-m-d H:i:s'),
        'AvatarPath' => $row['AvatarPath'],
    ];

    $stats = rh_juego_stats_actuales($juego);
    $avatarPath = $row['AvatarPath'];
    if ($avatarPath === null) {
        $fotos = rh_mascota_fotos($conn, (int) $row['MascotaId']);
        $avatarPath = $fotos[0]['path'] ?? null;
    }

    $mascotas[] = [
        'mascotaId' => (int) $row['MascotaId'],
        'nombre' => $row['Nombre'],
        'especie' => $row['Especie'],
        'avatarPath' => $avatarPath,
        'stats' => $stats,
        'animo' => rh_juego_animo($stats),
        'nivel' => (int) ($row['Nivel'] ?? 1),
        'rachaDias' => (int) ($row['RachaDias'] ?? 0),
        'empezado' => $row['StatsActualizadoEn'] !== null,
    ];
}
$stmt->close();

json_success(['mascotas' => $mascotas]);
