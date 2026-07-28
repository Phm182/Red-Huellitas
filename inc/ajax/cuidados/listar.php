<?php
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/especies.php';

$userId = rh_require_auth($conn);

$especie = $_GET['especie'] ?? '';
if (!in_array($especie, rh_especies_validas(), true)) {
    // Sin especie pedida, arranca por la de las mascotas del usuario: para
    // alguien que sólo tiene gatos, abrir en "perro" es ruido.
    $stmt = $conn->prepare(
        "SELECT Especie, COUNT(*) AS n FROM Mascota
         WHERE UserId = ? AND Estado = 'A' GROUP BY Especie ORDER BY n DESC LIMIT 1"
    );
    $stmt->bind_param('i', $userId);
    $stmt->execute();
    $fila = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    $especie = $fila && in_array($fila['Especie'], ['perro', 'gato', 'otro'], true)
        ? $fila['Especie']
        : 'perro';
}

$stmt = $conn->prepare(
    "SELECT CuidadoId, Especie, Categoria, Titulo, Resumen, Cuerpo
     FROM CuidadoRecomendacion
     WHERE Especie = ? AND Estado = 'A'
     ORDER BY Categoria, Orden"
);
$stmt->bind_param('s', $especie);
$stmt->execute();
$res = $stmt->get_result();

$cuidados = [];
while ($f = $res->fetch_assoc()) {
    $cuidados[] = [
        'cuidadoId' => (int) $f['CuidadoId'],
        'especie' => $f['Especie'],
        'categoria' => $f['Categoria'],
        'titulo' => $f['Titulo'],
        'resumen' => $f['Resumen'],
        'cuerpo' => $f['Cuerpo'],
    ];
}
$stmt->close();

json_success(['especie' => $especie, 'cuidados' => $cuidados]);
