<?php
/**
 * Vínculos familiares del usuario, de los dos lados: en qué tutelas es el
 * menor y en cuáles es el tutor. La pantalla de Familia se dibuja con esto.
 */
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/menores.php';

$userId = rh_require_auth($conn);

$sql =
    'SELECT t.TutelaId, t.UserIdMenor, t.UserIdTutor, t.Estado, t.IniciadaPor, t.CreatedAt, t.ResueltaEn,
            m.NombreCompleto AS MenorNombre, m.Username AS MenorUsuario, m.AvatarPath AS MenorAvatar,
            u.NombreCompleto AS TutorNombre, u.Username AS TutorUsuario, u.AvatarPath AS TutorAvatar
       FROM Tutela t
       JOIN Usuario m ON m.UserId = t.UserIdMenor
       JOIN Usuario u ON u.UserId = t.UserIdTutor
      WHERE t.UserIdMenor = ? OR t.UserIdTutor = ?
      ORDER BY FIELD(t.Estado, \'pendiente\', \'aceptada\', \'rechazada\', \'revocada\'), t.CreatedAt DESC';

$stmt = $conn->prepare($sql);
$stmt->bind_param('ii', $userId, $userId);
$stmt->execute();
$res = $stmt->get_result();

$items = [];
while ($f = $res->fetch_assoc()) {
    $soyMenor = ((int) $f['UserIdMenor']) === $userId;
    // Quien confirma es el lado opuesto al que inició.
    $debeConfirmar = $f['IniciadaPor'] === 'menor'
        ? (int) $f['UserIdTutor']
        : (int) $f['UserIdMenor'];

    $items[] = [
        'tutelaId' => (int) $f['TutelaId'],
        'estado' => $f['Estado'],
        'iniciadaPor' => $f['IniciadaPor'],
        'soyMenor' => $soyMenor,
        'puedoResolver' => $f['Estado'] === 'pendiente' && $debeConfirmar === $userId,
        'creadaEn' => $f['CreatedAt'],
        'resueltaEn' => $f['ResueltaEn'],
        'menor' => [
            'userId' => (int) $f['UserIdMenor'],
            'nombre' => $f['MenorNombre'],
            'usuario' => $f['MenorUsuario'],
            'avatarPath' => $f['MenorAvatar'],
        ],
        'tutor' => [
            'userId' => (int) $f['UserIdTutor'],
            'nombre' => $f['TutorNombre'],
            'usuario' => $f['TutorUsuario'],
            'avatarPath' => $f['TutorAvatar'],
        ],
    ];
}
$stmt->close();

$edad = rh_edad_de($conn, $userId);

json_success([
    'items' => $items,
    // El front necesita saber si a esta cuenta le aplican las restricciones,
    // para mostrar el aviso de "vinculá un adulto" antes de que choque contra
    // un 403 al intentar chatear.
    'yo' => [
        'edad' => $edad,
        'fechaCargada' => $edad !== null,
        'esMenor' => rh_es_menor($conn, $userId),
        'tutorUserId' => rh_tutor_de($conn, $userId),
    ],
]);
