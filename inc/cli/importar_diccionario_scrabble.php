<?php
/**
 * Carga el diccionario de HueScrabble en `ScrabbleDiccionario`.
 *
 * La fuente es `data/diccionario_scrabble_es.txt`: una palabra por línea, ya
 * normalizada (mayúsculas, sin tildes, Ñ conservada, sin abreviaturas ni
 * palabras de una sola letra) — sale de expandir el diccionario Hunspell
 * es_ES (stems + reglas de afijos) a todas sus formas flexionadas
 * (plurales, conjugaciones), que es lo que hace falta para que "CASAS" o
 * "CANTABA" sean válidas y no sólo sus lemas ("CASA", "CANTAR").
 *
 * Idempotente por diseño (`INSERT IGNORE`): correrlo de nuevo con el mismo
 * archivo no duplica nada, y correrlo con un archivo más grande sólo agrega
 * lo nuevo.
 *
 * Ejecución:
 *   C:\xampp\php\php.exe "C:\xampp\htdocs\Red Huellitas\inc\cli\importar_diccionario_scrabble.php"
 */

require_once __DIR__ . '/../funciones/bd.php';

const RH_SCRABBLE_DICCIONARIO_ARCHIVO = __DIR__ . '/data/diccionario_scrabble_es.txt';
const RH_SCRABBLE_DICCIONARIO_LOTE = 2000;

if (!is_file(RH_SCRABBLE_DICCIONARIO_ARCHIVO)) {
    fwrite(STDERR, 'No se encontró el archivo: ' . RH_SCRABBLE_DICCIONARIO_ARCHIVO . "\n");
    exit(1);
}

$fh = fopen(RH_SCRABBLE_DICCIONARIO_ARCHIVO, 'r');
if (!$fh) {
    fwrite(STDERR, "No se pudo abrir el archivo del diccionario.\n");
    exit(1);
}

$leidas = 0;
$insertadas = 0;
$rechazadas = 0;
$lote = [];

$aplicarLote = function () use (&$lote, &$insertadas, $conn) {
    if (!$lote) {
        return;
    }
    $placeholders = implode(',', array_fill(0, count($lote), '(?)'));
    $stmt = $conn->prepare("INSERT IGNORE INTO ScrabbleDiccionario (Palabra) VALUES $placeholders");
    $stmt->bind_param(str_repeat('s', count($lote)), ...$lote);
    $stmt->execute();
    $insertadas += $stmt->affected_rows;
    $stmt->close();
    $lote = [];
};

while (($linea = fgets($fh)) !== false) {
    $palabra = trim($linea);
    $leidas++;

    // Guarda de forma, aunque el archivo ya viene normalizado: cualquier
    // línea rara (vacía, con espacios, fuera de 2-20 caracteres A-ZÑ) se
    // descarta en vez de romper el import entero.
    if ($palabra === '' || mb_strlen($palabra) < 2 || mb_strlen($palabra) > 20) {
        $rechazadas++;
        continue;
    }
    if (!preg_match('/^[A-ZÑ]+$/u', $palabra)) {
        $rechazadas++;
        continue;
    }

    $lote[] = $palabra;
    if (count($lote) >= RH_SCRABBLE_DICCIONARIO_LOTE) {
        $aplicarLote();
    }

    if ($leidas % 50000 === 0) {
        echo "...$leidas líneas leídas\n";
    }
}
$aplicarLote();
fclose($fh);

$total = (int) ($conn->query('SELECT COUNT(*) AS n FROM ScrabbleDiccionario')->fetch_assoc()['n'] ?? 0);

printf(
    "Listo: %d líneas leídas, %d nuevas insertadas, %d rechazadas por formato. Total en la tabla: %d.\n",
    $leidas,
    $insertadas,
    $rechazadas,
    $total
);
