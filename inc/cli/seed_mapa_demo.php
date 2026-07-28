<?php
/**
 * Datos de demo para el mapa: publicaciones repartidas por CABA.
 *
 * Siembra publicaciones reales en las siete capas que dibuja el mapa, con
 * coordenadas de barrios de verdad, para poder ver cómo se comporta el
 * agrupado y los filtros sin tener que cargar todo a mano.
 *
 * Uso:
 *   C:\xampp\php\php.exe "C:\xampp\htdocs\Red Huellitas\inc\cli\seed_mapa_demo.php"
 *   C:\xampp\php\php.exe "...\seed_mapa_demo.php" --limpiar   (borra sólo lo sembrado)
 *
 * Todo lo que crea lleva la marca RH_SEED_MARCA en un campo de texto, así
 * `--limpiar` puede borrar exactamente esto y nada más. Sin esa marca, limpiar
 * sería "borrá lo último que se creó", que tarde o temprano se lleva puesto
 * algo cargado a mano.
 */

if (PHP_SAPI !== 'cli') {
    http_response_code(403);
    exit("Sólo por línea de comandos.\n");
}

require_once __DIR__ . '/../funciones/bd.php';

const RH_SEED_MARCA = '[demo-mapa]';

/** Barrios de CABA con coordenadas reales. */
const RH_BARRIOS = [
    ['Palermo',        -34.5885, -58.4266],
    ['Recoleta',       -34.5875, -58.3974],
    ['Caballito',      -34.6187, -58.4404],
    ['Belgrano',       -34.5627, -58.4560],
    ['Villa Crespo',   -34.5990, -58.4380],
    ['San Telmo',      -34.6212, -58.3731],
    ['Almagro',        -34.6096, -58.4200],
    ['Flores',         -34.6280, -58.4640],
    ['Colegiales',     -34.5750, -58.4490],
    ['Núñez',          -34.5450, -58.4620],
    ['Boedo',          -34.6300, -58.4180],
    ['Chacarita',      -34.5880, -58.4560],
];

$limpiar = in_array('--limpiar', $argv, true);

// ---------------------------------------------------------------------------
// Limpieza
// ---------------------------------------------------------------------------
if ($limpiar) {
    $like = '%' . RH_SEED_MARCA . '%';
    $borrados = 0;

    // Las fotos tienen FK contra su publicación, así que van primero.
    $hijos = [
        ['AdopcionFoto', 'AdopcionId', 'Adopcion', 'AdopcionId', 'Descripcion'],
        ['TransitoFoto', 'TransitoId', 'Transito', 'TransitoId', 'Descripcion'],
        ['PerdidoFoto', 'PerdidoId', 'Perdido', 'PerdidoId', 'Descripcion'],
        ['DonacionFoto', 'DonacionId', 'Donacion', 'DonacionId', 'Descripcion'],
        ['ProductoFoto', 'ProductoId', 'Producto', 'ProductoId', 'Descripcion'],
        ['VeterinariaFoto', 'VeterinariaId', 'Veterinaria', 'VeterinariaId', 'Descripcion'],
    ];
    foreach ($hijos as [$tablaHija, $fk, $tablaPadre, $pk, $campo]) {
        $stmt = $conn->prepare(
            "DELETE FROM $tablaHija WHERE $fk IN (SELECT $pk FROM $tablaPadre WHERE $campo LIKE ?)"
        );
        $stmt->bind_param('s', $like);
        $stmt->execute();
        $stmt->close();
    }

    foreach ([
        ['Adopcion', 'Descripcion'],
        ['Transito', 'Descripcion'],
        ['Perdido', 'Descripcion'],
        ['Donacion', 'Descripcion'],
        ['Producto', 'Descripcion'],
        ['Veterinaria', 'Descripcion'],
        ['Campania', 'Descripcion'],
    ] as [$tabla, $campo]) {
        $stmt = $conn->prepare("DELETE FROM $tabla WHERE $campo LIKE ?");
        $stmt->bind_param('s', $like);
        $stmt->execute();
        $borrados += $stmt->affected_rows;
        $stmt->close();
    }

    echo "Borradas $borrados publicaciones de demo.\n";
    exit(0);
}

// ---------------------------------------------------------------------------
// Autor: cualquier usuario activo sirve; se prefiere el primero.
// ---------------------------------------------------------------------------
$autor = $conn->query("SELECT UserId FROM Usuario WHERE Estado = 'A' ORDER BY UserId LIMIT 1")->fetch_row();
if (!$autor) {
    fwrite(STDERR, "No hay ningún usuario activo para figurar como autor.\n");
    exit(1);
}
$userId = (int) $autor[0];

$categoria = $conn->query('SELECT CategoriaId FROM ProductoCategoriaCatalogo ORDER BY CategoriaId LIMIT 1')->fetch_row();
$categoriaId = $categoria ? (int) $categoria[0] : null;

/** Dispersa un punto hasta ~600 m para que no queden todos apilados. */
function rh_cerca(float $v, float $grados = 0.006): float
{
    return $v + (mt_rand(-1000, 1000) / 1000) * $grados;
}

$desc = static fn(string $texto): string => "$texto " . RH_SEED_MARCA;

$creados = [];
$hoy = date('Y-m-d');

// --- Adopción -------------------------------------------------------------
$animales = [
    ['Michi', 'hembra', 'gato', 'siames'], ['Rocco', 'macho', 'perro', 'labrador'],
    ['Nala', 'hembra', 'perro', 'caniche'], ['Simba', 'macho', 'gato', 'naranja'],
    ['Luna', 'hembra', 'perro', 'mestizo'], ['Toby', 'macho', 'perro', 'beagle'],
];
$stmt = $conn->prepare(
    'INSERT INTO Adopcion (UserId, Nombre, Sexo, EdadAnios, Especie, RazaTexto, Descripcion, ZonaDescripcion, ZonaLat, ZonaLng)
     VALUES (?,?,?,?,?,?,?,?,?,?)'
);
foreach ($animales as $i => [$nombre, $sexo, $especie, $raza]) {
    [$barrio, $blat, $blng] = RH_BARRIOS[$i % count(RH_BARRIOS)];
    $edad = mt_rand(1, 8);
    $d = $desc("$nombre busca familia en $barrio.");
    $lat = rh_cerca($blat); $lng = rh_cerca($blng);
    $stmt->bind_param('ississssdd', $userId, $nombre, $sexo, $edad, $especie, $raza, $d, $barrio, $lat, $lng);
    $stmt->execute();
}
$stmt->close();
$creados['adopcion'] = count($animales);

// --- Tránsito -------------------------------------------------------------
$stmt = $conn->prepare(
    'INSERT INTO Transito (UserId, Tipo, Nombre, Sexo, Especie, RazaTexto, Descripcion, DuracionDias, ZonaDescripcion, ZonaLat, ZonaLng)
     VALUES (?,?,?,?,?,?,?,?,?,?,?)'
);
$transitos = [
    ['necesito', 'Pelusa', 'hembra', 'gato', 'angora', 30],
    ['ofrezco', null, null, 'perro', null, 60],
    ['necesito', 'Coco', 'macho', 'perro', 'mestizo', 15],
    ['ofrezco', null, null, 'gato', null, 45],
];
foreach ($transitos as $i => [$tipo, $nombre, $sexo, $especie, $raza, $dias]) {
    [$barrio, $blat, $blng] = RH_BARRIOS[($i + 3) % count(RH_BARRIOS)];
    $d = $desc($tipo === 'necesito' ? "Necesito tránsito en $barrio." : "Ofrezco tránsito en $barrio.");
    $lat = rh_cerca($blat); $lng = rh_cerca($blng);
    $stmt->bind_param('issssssisdd', $userId, $tipo, $nombre, $sexo, $especie, $raza, $d, $dias, $barrio, $lat, $lng);
    $stmt->execute();
}
$stmt->close();
$creados['transito'] = count($transitos);

// --- Perdidos -------------------------------------------------------------
$stmt = $conn->prepare(
    'INSERT INTO Perdido (UserId, Tipo, Nombre, Sexo, Especie, RazaTexto, Descripcion, UltimoLugarDescripcion, UltimoLugarLat, UltimoLugarLng, FechaSuceso)
     VALUES (?,?,?,?,?,?,?,?,?,?,?)'
);
$perdidos = [
    ['perdido', 'Nube', 'hembra', 'gato', 'blanco'],
    ['perdido', 'Zeus', 'macho', 'perro', 'ovejero'],
    ['encontrado', 'Sin nombre', 'macho', 'perro', 'mestizo'],
    ['perdido', 'Kira', 'hembra', 'perro', 'salchicha'],
];
foreach ($perdidos as $i => [$tipo, $nombre, $sexo, $especie, $raza]) {
    [$barrio, $blat, $blng] = RH_BARRIOS[($i + 6) % count(RH_BARRIOS)];
    $d = $desc($tipo === 'perdido' ? "Se perdió en $barrio." : "Lo encontré en $barrio.");
    $lat = rh_cerca($blat); $lng = rh_cerca($blng);
    $stmt->bind_param('isssssssdds', $userId, $tipo, $nombre, $sexo, $especie, $raza, $d, $barrio, $lat, $lng, $hoy);
    $stmt->execute();
}
$stmt->close();
$creados['perdidos'] = count($perdidos);

// --- Donaciones -----------------------------------------------------------
$stmt = $conn->prepare(
    'INSERT INTO Donacion (UserId, Tipo, Categoria, Descripcion, Especie, ZonaDescripcion, ZonaLat, ZonaLng)
     VALUES (?,?,?,?,?,?,?,?)'
);
$donaciones = [
    ['ofrezco', 'alimento', 'perro', 'Bolsa de alimento cerrada'],
    ['necesito', 'insumo', 'gato', 'Piedritas sanitarias'],
    ['ofrezco', 'insumo', 'perro', 'Correa y collar sin uso'],
    ['necesito', 'alimento', 'gato', 'Alimento para gatitos'],
];
foreach ($donaciones as $i => [$tipo, $cat, $especie, $texto]) {
    [$barrio, $blat, $blng] = RH_BARRIOS[($i + 1) % count(RH_BARRIOS)];
    $d = $desc("$texto — $barrio.");
    $lat = rh_cerca($blat); $lng = rh_cerca($blng);
    $stmt->bind_param('isssssdd', $userId, $tipo, $cat, $d, $especie, $barrio, $lat, $lng);
    $stmt->execute();
}
$stmt->close();
$creados['donaciones'] = count($donaciones);

// --- Productos ------------------------------------------------------------
if ($categoriaId !== null) {
    $stmt = $conn->prepare(
        'INSERT INTO Producto (UserId, TipoListado, CategoriaId, Nombre, Descripcion, Precio, Cantidad, Especie, ZonaDescripcion, ZonaLat, ZonaLng)
         VALUES (?,?,?,?,?,?,?,?,?,?,?)'
    );
    $productos = [
        ['producto', 'Cucha mediana de madera', 25000, 'perro'],
        ['producto', 'Rascador para gatos', 18000, 'gato'],
        ['servicio', 'Paseos por hora', 4000, 'perro'],
        ['producto', 'Comedero doble acero', 7500, 'perro'],
        ['servicio', 'Peluquería canina a domicilio', 12000, 'perro'],
    ];
    foreach ($productos as $i => [$tipoL, $nombre, $precio, $especie]) {
        [$barrio, $blat, $blng] = RH_BARRIOS[($i + 4) % count(RH_BARRIOS)];
        $d = $desc("$nombre en $barrio.");
        $cant = mt_rand(1, 5);
        $lat = rh_cerca($blat); $lng = rh_cerca($blng);
        $stmt->bind_param('isissdissdd', $userId, $tipoL, $categoriaId, $nombre, $d, $precio, $cant, $especie, $barrio, $lat, $lng);
        $stmt->execute();
    }
    $stmt->close();
    $creados['productos'] = count($productos);
}

// --- Veterinarias (ubicación exacta) --------------------------------------
$stmt = $conn->prepare(
    'INSERT INTO Veterinaria (UserId, Nombre, Descripcion, Telefono, Horario, ZonaDescripcion, ZonaLat, ZonaLng)
     VALUES (?,?,?,?,?,?,?,?)'
);
$vets = [
    ['Veterinaria San Roque', 'Lun a Vie 9 a 19'],
    ['Clínica Animal Palermo', 'Todos los días 8 a 22'],
    ['Vet Belgrano 24hs', 'Guardia 24 horas'],
    ['Consultorio Caballito', 'Lun a Sab 10 a 18'],
];
foreach ($vets as $i => [$nombre, $horario]) {
    [$barrio, $blat, $blng] = RH_BARRIOS[($i * 2) % count(RH_BARRIOS)];
    $d = $desc("Atención veterinaria en $barrio.");
    $tel = '11' . mt_rand(30000000, 69999999);
    $lat = rh_cerca($blat, 0.003); $lng = rh_cerca($blng, 0.003);
    $stmt->bind_param('isssssdd', $userId, $nombre, $d, $tel, $horario, $barrio, $lat, $lng);
    $stmt->execute();
}
$stmt->close();
$creados['veterinarias'] = count($vets);

// --- Campañas (ubicación exacta) ------------------------------------------
$stmt = $conn->prepare(
    'INSERT INTO Campania (UserId, Tipo, Titulo, Descripcion, FechaDesde, FechaHasta, ZonaDescripcion, ZonaLat, ZonaLng)
     VALUES (?,?,?,?,?,?,?,?,?)'
);
$campanias = [
    ['castracion', 'Castración gratuita municipal'],
    ['vacunacion', 'Vacunación antirrábica'],
    ['castracion', 'Quirófano móvil'],
];
foreach ($campanias as $i => [$tipo, $titulo]) {
    [$barrio, $blat, $blng] = RH_BARRIOS[($i * 3 + 1) % count(RH_BARRIOS)];
    $d = $desc("$titulo en $barrio.");
    $hasta = date('Y-m-d', strtotime('+' . (10 + $i * 5) . ' days'));
    $lat = rh_cerca($blat, 0.003); $lng = rh_cerca($blng, 0.003);
    $stmt->bind_param('issssssdd', $userId, $tipo, $titulo, $d, $hoy, $hasta, $barrio, $lat, $lng);
    $stmt->execute();
}
$stmt->close();
$creados['campanias'] = count($campanias);

echo "Sembrado:\n";
foreach ($creados as $k => $n) {
    printf("  %-14s %d\n", $k, $n);
}
echo "\nBorrar sólo esto:  php inc/cli/seed_mapa_demo.php --limpiar\n";
