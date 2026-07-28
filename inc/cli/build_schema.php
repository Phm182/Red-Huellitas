<?php
/**
 * Regenera `sql/000_todo_schema.sql` concatenando todas las migraciones.
 *
 * Ese archivo es el "instalador": con él solo se levanta una base desde cero
 * con la versión final del esquema, sin tener que correr 35 archivos a mano.
 * Como se genera, **nunca se edita a mano** — se agrega la migración nueva a
 * `sql/` y se vuelve a correr esto.
 *
 * Uso:
 *   C:\xampp\php\php.exe "C:\xampp\htdocs\Red Huellitas\inc\cli\build_schema.php"
 *   C:\xampp\php\php.exe "...\build_schema.php" --check     (no escribe; falla si está desactualizado)
 *   C:\xampp\php\php.exe "...\build_schema.php" --verificar (genera y lo prueba en una base descartable)
 *
 * Por qué concatena las migraciones en vez de hacer un `mysqldump --no-data`:
 * el dump traería sólo la estructura y se perderían los seeds, que no son
 * opcionales — el catálogo de razas, las categorías de productos, los planes
 * HuePlus y el contenido de Cuidados son parte de una instalación que funcione.
 * Concatenar también mantiene el archivo honesto: es exactamente lo mismo que
 * correr las migraciones en orden, no una foto que puede diferir.
 *
 * Las migraciones son idempotentes (patrón `information_schema` + PREPARE), así
 * que correr el archivo entero sobre una base ya creada tampoco rompe nada.
 */

if (PHP_SAPI !== 'cli') {
    http_response_code(403);
    exit("Sólo por línea de comandos.\n");
}

const RH_SCHEMA_SALIDA = '000_todo_schema.sql';

$sqlDir = realpath(__DIR__ . '/../../sql');
if ($sqlDir === false) {
    fwrite(STDERR, "No encuentro el directorio sql/\n");
    exit(1);
}

$soloCheck = in_array('--check', $argv, true);
$verificar = in_array('--verificar', $argv, true);

// ---------------------------------------------------------------------------
// Juntar las migraciones en orden numérico.
// ---------------------------------------------------------------------------
$archivos = [];
foreach (glob($sqlDir . '/*.sql') as $ruta) {
    $nombre = basename($ruta);
    if ($nombre === RH_SCHEMA_SALIDA) {
        continue; // la salida no se incluye a sí misma
    }
    if (!preg_match('/^(\d{3})_/', $nombre, $m)) {
        fwrite(STDERR, "Ignorado (no arranca con NNN_): $nombre\n");
        continue;
    }
    $numero = $m[1];
    if (isset($archivos[$numero])) {
        // Dos migraciones con el mismo número: el orden entre ellas es
        // ambiguo y en producción se corre una sola. Se corta acá.
        fwrite(STDERR, "ERROR: número de migración duplicado ($numero):\n");
        fwrite(STDERR, "  - " . basename($archivos[$numero]) . "\n  - $nombre\n");
        fwrite(STDERR, "Renumerá una de las dos antes de regenerar.\n");
        exit(1);
    }
    $archivos[$numero] = $ruta;
}

if (count($archivos) === 0) {
    fwrite(STDERR, "No hay migraciones en $sqlDir\n");
    exit(1);
}

ksort($archivos, SORT_STRING);
$numeros = array_keys($archivos);
$desde = reset($numeros);
$hasta = end($numeros);

// ---------------------------------------------------------------------------
// Armar el archivo.
// ---------------------------------------------------------------------------
$sep = str_repeat('-', 77);
$fecha = date('Y-m-d');

$salida = <<<CAB
-- =============================================================================
-- Red Huellitas — schema completo ($desde … $hasta)
--
-- ARCHIVO GENERADO — no editar a mano.
-- Se regenera con:  php inc/cli/build_schema.php
-- Si agregás una migración a sql/, volvé a correr eso y commiteá el resultado.
--
-- Última generación: $fecha  ·  Migraciones incluidas: %COUNT%
--
-- Sirve para crear la base desde cero con la versión final del esquema:
--   mysql --default-character-set=utf8mb4 -u root < sql/000_todo_schema.sql
--
-- ⚠️ Correr SIEMPRE con --default-character-set=utf8mb4. El cliente de MySQL
--    asume latin1 y sin eso los acentos de los seeds entran rotos.
-- =============================================================================

CREATE DATABASE IF NOT EXISTS huellitas
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE huellitas;

SET NAMES utf8mb4;


CAB;

$salida = str_replace('%COUNT%', (string) count($archivos), $salida);

foreach ($archivos as $numero => $ruta) {
    $nombre = basename($ruta);
    $contenido = file_get_contents($ruta);

    // Sacar el BOM si lo tuviera: en el medio del archivo concatenado MySQL lo
    // leería como parte de una sentencia y tiraría error de sintaxis.
    $contenido = preg_replace('/^\xEF\xBB\xBF/', '', $contenido);

    $salida .= "-- $sep\n";
    $salida .= "-- $nombre\n";
    $salida .= "-- $sep\n\n";
    $salida .= rtrim($contenido) . "\n\n\n";
}

$destino = $sqlDir . '/' . RH_SCHEMA_SALIDA;

// ---------------------------------------------------------------------------
// --check: sirve para que un hook o un review avise si quedó desactualizado.
// Se compara ignorando la línea de fecha, que cambia sola todos los días.
// ---------------------------------------------------------------------------
$sinFecha = static fn(string $s): string => preg_replace('/^-- Última generación: .*$/m', '', $s);

if ($soloCheck) {
    $actual = is_file($destino) ? file_get_contents($destino) : '';
    if ($sinFecha($actual) === $sinFecha($salida)) {
        echo "OK: 000_todo_schema.sql está al día (" . count($archivos) . " migraciones).\n";
        exit(0);
    }
    fwrite(STDERR, "DESACTUALIZADO: 000_todo_schema.sql no coincide con sql/.\n");
    fwrite(STDERR, "Corré: php inc/cli/build_schema.php\n");
    exit(1);
}

file_put_contents($destino, $salida);

printf(
    "Generado %s — %d migraciones (%s … %s), %s.\n",
    RH_SCHEMA_SALIDA,
    count($archivos),
    $desde,
    $hasta,
    number_format(strlen($salida) / 1024, 1) . ' KB'
);

// ---------------------------------------------------------------------------
// --verificar: la única prueba que importa es que el archivo levante una base
// de cero. Se hace sobre una base descartable para no tocar la real.
// ---------------------------------------------------------------------------
if (!$verificar) {
    echo "Tip: corré con --verificar para probarlo contra una base descartable.\n";
    exit(0);
}

require_once __DIR__ . '/../funciones/bd.php';

$baseTest = 'huellitas_build_test';
echo "\nVerificando contra `$baseTest`...\n";

$conn->query("DROP DATABASE IF EXISTS `$baseTest`");
$conn->query("CREATE DATABASE `$baseTest` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");

// El archivo trae su propio CREATE DATABASE/USE apuntando a `huellitas`, así
// que para probarlo en otra base hay que reapuntarlo.
$sqlTest = preg_replace(
    ['/CREATE DATABASE IF NOT EXISTS huellitas/', '/^USE huellitas;/m'],
    ["CREATE DATABASE IF NOT EXISTS `$baseTest`", "USE `$baseTest`;"],
    $salida
);

$tmp = sys_get_temp_dir() . '/rh_build_schema_test.sql';
file_put_contents($tmp, $sqlTest);

$mysql = 'C:\\xampp\\mysql\\bin\\mysql.exe';
$cmd = sprintf(
    '"%s" --default-character-set=utf8mb4 -u root %s < "%s" 2>&1',
    $mysql,
    escapeshellarg($baseTest),
    $tmp
);
exec($cmd, $out, $code);
@unlink($tmp);

if ($code !== 0) {
    fwrite(STDERR, "FALLÓ al crear la base desde cero:\n" . implode("\n", $out) . "\n");
    exit(1);
}

$contar = static function (mysqli $c, string $base): int {
    $stmt = $c->prepare(
        'SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = ?'
    );
    $stmt->bind_param('s', $base);
    $stmt->execute();
    $n = (int) $stmt->get_result()->fetch_row()[0];
    $stmt->close();
    return $n;
};

$tablasTest = $contar($conn, $baseTest);
$tablasReal = $contar($conn, 'huellitas');

printf("Tablas creadas desde cero: %d  ·  en la base real: %d\n", $tablasTest, $tablasReal);

$conn->query("DROP DATABASE `$baseTest`");

if ($tablasTest < $tablasReal) {
    fwrite(STDERR, "AVISO: faltan " . ($tablasReal - $tablasTest) . " tabla(s) respecto de la base real.\n");
    fwrite(STDERR, "Puede que haya cambios aplicados a mano que no quedaron en ninguna migración.\n");
    exit(1);
}

echo "OK: la base se crea entera desde este archivo.\n";
