<?php
/**
 * Cuándo una publicación deja de poder editarse.
 *
 * La regla es la misma que en Adopción: si ya hay otra persona involucrada,
 * cambiarle los datos a la publicación sería un engaño (prometés un cachorro y
 * después editás y es otro animal). A partir de ese punto la información queda
 * congelada y lo que valga se arregla en la conversación entre las dos partes.
 *
 * **No todos los módulos tienen el mismo disparador**, y eso es a propósito:
 * cada uno se bloquea con la señal real que tiene, no con una inventada.
 *
 * Y algunos directamente no se bloquean. Cuando el trato ya quedó guardado en
 * una copia propia —como el pedido, que se lleva su `NombreProducto` y su
 * `PrecioUnitario`— la publicación puede seguir editándose sin que a nadie le
 * cambie lo que acordó, y trabarla sería costo sin beneficio. El candado es
 * para cuando lo único que la otra persona tiene es la publicación misma.
 */

/**
 * Perdidos: se bloquea al marcarlo reencontrado.
 *
 * Un reporte reencontrado es un hecho cerrado; editarlo después reescribiría
 * la historia de algo que la comunidad ya ayudó a resolver.
 */
function rh_perdido_motivo_bloqueo_edicion(array $p): ?string
{
    if (($p['EstadoPerdido'] ?? '') === 'reencontrado') {
        return 'No podés editar un reporte ya marcado como reencontrado.';
    }
    return null;
}

/**
 * Productos: **nunca se bloquean, y acá el candado sobraría.**
 *
 * Lo que hay que proteger es el pedido, no la publicación, y el pedido ya está
 * protegido solo: `PedidoItem` guarda su propia copia de `NombreProducto` y
 * `PrecioUnitario` al confirmarse, y todo el flujo de pedidos (detalle, listado
 * y el PDF del comprobante) lee de ahí — no hay un solo `JOIN Producto` en ese
 * camino. Un pedido en curso queda tan congelado como uno ya entregado.
 *
 * Por eso el vendedor puede corregir una descripción o reponer stock mientras
 * tiene una venta abierta sin que a nadie le cambie lo que acordó. Bloquear la
 * publicación no agregaría ninguna garantía y sí le trabaría el catálogo.
 *
 * (El carrito sí muestra el precio vigente, que es lo correcto: todavía no hay
 * nada acordado, y el precio recién se congela al confirmar el pedido.)
 */
function rh_producto_motivo_bloqueo_edicion(mysqli $conn, int $productoId): ?string
{
    return null;
}

/**
 * Tránsito y Donaciones: se bloquean cuando el dueño marca "acordado".
 *
 * A diferencia de los otros módulos, acá el estado lo pone el dueño a mano
 * (`EstadoTransito` / `EstadoDonacion`, migración 035). No es por comodidad:
 * el acuerdo se cierra por WhatsApp o por chat y en la base no queda ningún
 * rastro del que se pueda deducir. Bloquear por "alguien abrió una
 * conversación" congelaría la publicación por una simple consulta.
 *
 * Es reversible a propósito: si el trato se cae, el dueño lo vuelve a
 * 'disponible' y recupera la edición, igual que en Adopción cuando se cancela
 * la última postulación.
 */
function rh_transito_motivo_bloqueo_edicion(array $t): ?string
{
    if (($t['EstadoTransito'] ?? '') === 'acordado') {
        return 'No podés editar mientras el tránsito esté acordado con alguien. '
            . 'Si el acuerdo se cae, marcalo como disponible y vas a poder editarlo.';
    }
    return null;
}

function rh_donacion_motivo_bloqueo_edicion(array $d): ?string
{
    if (($d['EstadoDonacion'] ?? '') === 'acordado') {
        return 'No podés editar mientras la donación esté acordada con alguien. '
            . 'Si el acuerdo se cae, marcala como disponible y vas a poder editarla.';
    }
    return null;
}

/**
 * Aplica el `ordenFotos` que manda la pantalla de edición: borra las que se
 * sacaron, guarda las nuevas y reescribe el orden de todas.
 *
 * El formato es un JSON de slots `["e:12", "n:0", "e:15"]`, donde `e:` es una
 * foto existente (por id) y `n:` un índice dentro de `$_FILES['fotos']`. Va en
 * un solo campo y no en dos listas separadas porque el orden final es la mezcla
 * de las dos: el usuario puede meter una foto nueva entre dos viejas, y con
 * listas separadas esa posición se pierde.
 *
 * Los cinco módulos nombran igual sus tablas de fotos (`XFoto`, `XFotoId`,
 * `XId`), así que alcanza con el prefijo en vez de cinco copias de este bloque.
 *
 * @param string $modulo   'Adopcion' | 'Transito' | 'Perdido' | 'Donacion' | 'Producto'
 * @param callable $guardar fn(array $file, int $id): string — devuelve el path relativo
 */
function rh_sincronizar_fotos(
    mysqli $conn,
    string $modulo,
    int $id,
    ?string $ordenRaw,
    ?array $filesField,
    callable $guardar,
    int $maxFotos = 6
): void {
    if ($ordenRaw === null || $ordenRaw === '') {
        return; // La pantalla no tocó las fotos: no hay nada que sincronizar.
    }

    $tabla = $modulo . 'Foto';
    $colPk = $modulo . 'FotoId';
    $colFk = $modulo . 'Id';

    $slots = json_decode($ordenRaw, true);
    if (!is_array($slots)) {
        json_error('ordenFotos inválido');
    }
    if (count($slots) > $maxFotos) {
        json_error("Máximo $maxFotos fotos por publicación");
    }

    $nuevas = rh_normalizar_archivos_multiples($filesField);
    foreach ($nuevas as $foto) {
        $error = rh_validar_imagen_subida($foto);
        if ($error) {
            json_error("Foto inválida: $error");
        }
    }

    $idsKeep = [];
    foreach ($slots as $slot) {
        if (is_string($slot) && str_starts_with($slot, 'e:')) {
            $fid = (int) substr($slot, 2);
            if ($fid > 0) {
                $idsKeep[] = $fid;
            }
        }
    }

    // Borrar las que quedaron fuera del orden nuevo (fila + archivo).
    $stmt = $conn->prepare("SELECT $colPk, Path FROM $tabla WHERE $colFk = ?");
    $stmt->bind_param('i', $id);
    $stmt->execute();
    $actuales = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    $stmt->close();

    $uploadsRoot = realpath(__DIR__ . '/../../uploads');
    foreach ($actuales as $foto) {
        $fid = (int) $foto[$colPk];
        if (in_array($fid, $idsKeep, true)) {
            continue;
        }
        $stmt = $conn->prepare("DELETE FROM $tabla WHERE $colPk = ? AND $colFk = ?");
        $stmt->bind_param('ii', $fid, $id);
        $stmt->execute();
        $stmt->close();

        if ($uploadsRoot && !empty($foto['Path'])) {
            $abs = $uploadsRoot . DIRECTORY_SEPARATOR
                . str_replace(['/', '\\'], DIRECTORY_SEPARATOR, $foto['Path']);
            if (is_file($abs)) {
                @unlink($abs);
            }
        }
    }

    $orden = 0;
    foreach ($slots as $slot) {
        if (!is_string($slot)) {
            continue;
        }
        if (str_starts_with($slot, 'e:')) {
            $fid = (int) substr($slot, 2);
            if ($fid <= 0) {
                continue;
            }
            $stmt = $conn->prepare("UPDATE $tabla SET Orden = ? WHERE $colPk = ? AND $colFk = ?");
            $stmt->bind_param('iii', $orden, $fid, $id);
            $stmt->execute();
            $stmt->close();
            $orden++;
        } elseif (str_starts_with($slot, 'n:')) {
            $idx = (int) substr($slot, 2);
            if (!isset($nuevas[$idx])) {
                continue;
            }
            $path = $guardar($nuevas[$idx], $id);
            $stmt = $conn->prepare("INSERT INTO $tabla ($colFk, Path, Orden) VALUES (?, ?, ?)");
            $stmt->bind_param('isi', $id, $path, $orden);
            $stmt->execute();
            $stmt->close();
            $orden++;
        }
    }
}
