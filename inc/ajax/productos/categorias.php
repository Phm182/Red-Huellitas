<?php
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';

rh_require_auth($conn);

$result = $conn->query('SELECT CategoriaId, Codigo, Nombre FROM ProductoCategoriaCatalogo ORDER BY Orden ASC');

$categorias = [];
while ($row = $result->fetch_assoc()) {
    $categorias[] = [
        'categoriaId' => (int) $row['CategoriaId'],
        'codigo' => $row['Codigo'],
        'nombre' => $row['Nombre'],
    ];
}

json_success(['categorias' => $categorias]);
