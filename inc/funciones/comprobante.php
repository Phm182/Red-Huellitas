<?php
/**
 * Generación del comprobante PDF de un Pedido (Fase 6d), server-side con dompdf.
 *
 * Se genera al vuelo cada vez que se pide: no se guarda nada en disco. Así el
 * comprobante siempre refleja el estado real del pedido y no se acumula basura
 * de PDFs viejos.
 *
 * Requiere que quien llame haya hecho require_once de funciones/pedido.php.
 */

require_once __DIR__ . '/email.php';  // para rh_vendor_autoload()
require_once __DIR__ . '/pedido.php'; // para rh_pedido_items() y el número

function rh_comprobante_disponible(): bool
{
    return rh_vendor_autoload() !== null;
}

/**
 * Junta todo lo que el comprobante necesita: el pedido, sus items, y los datos
 * (nombre + email) de comprador y vendedor — que rh_pedido_publico() no trae.
 * Devuelve null si el pedido no existe.
 */
function rh_comprobante_datos(mysqli $conn, int $pedidoId): ?array
{
    $stmt = $conn->prepare('SELECT * FROM Pedido WHERE PedidoId = ?');
    $stmt->bind_param('i', $pedidoId);
    $stmt->execute();
    $pedido = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if (!$pedido) {
        return null;
    }

    $stmt = $conn->prepare('SELECT UserId, NombreCompleto, Username, Email FROM Usuario WHERE UserId IN (?, ?)');
    $compradorId = (int) $pedido['CompradorUserId'];
    $vendedorId = (int) $pedido['VendedorUserId'];
    $stmt->bind_param('ii', $compradorId, $vendedorId);
    $stmt->execute();
    $result = $stmt->get_result();

    $usuarios = [];
    while ($row = $result->fetch_assoc()) {
        $usuarios[(int) $row['UserId']] = $row;
    }
    $stmt->close();

    return [
        'pedido' => $pedido,
        'numero' => rh_pedido_numero_comprobante($pedidoId),
        'items' => rh_pedido_items($conn, $pedidoId),
        'comprador' => $usuarios[$compradorId] ?? null,
        'vendedor' => $usuarios[$vendedorId] ?? null,
    ];
}

/**
 * Devuelve el logo como data URI base64. dompdf corre con isRemoteEnabled(false)
 * a propósito (no queremos que un HTML de comprobante pueda pedir URLs), así que
 * la imagen tiene que ir embebida.
 */
function rh_comprobante_logo_data_uri(): ?string
{
    $logo = __DIR__ . '/../../imgLogo/RH Logo solo siluetas negro.png';
    if (!is_file($logo)) {
        return null;
    }
    return 'data:image/png;base64,' . base64_encode(file_get_contents($logo));
}

/**
 * @param bool $paraVendedor si es true incluye el desglose de comisión; el
 *                           comprador no tiene por qué ver cuánto retiene la
 *                           plataforma.
 */
function rh_comprobante_html(array $datos, bool $paraVendedor = false): string
{
    ob_start();
    include __DIR__ . '/../templates/comprobante.php';
    return ob_get_clean();
}

/**
 * Devuelve los BYTES del PDF (no lo emite). Quien llama decide si lo manda al
 * navegador o lo adjunta a un mail.
 */
function rh_comprobante_pdf(array $datos, bool $paraVendedor = false): string
{
    $autoload = rh_vendor_autoload();
    if ($autoload === null) {
        throw new RuntimeException('Falta vendor/ — correr composer install');
    }
    require_once $autoload;

    $options = new \Dompdf\Options();
    $options->set('isRemoteEnabled', false);   // el logo va embebido en base64
    $options->set('isHtml5ParserEnabled', true);
    $options->set('defaultFont', 'DejaVu Sans'); // sin esto las tildes y la ñ salen rotas

    $dompdf = new \Dompdf\Dompdf($options);
    $dompdf->loadHtml(rh_comprobante_html($datos, $paraVendedor), 'UTF-8');
    $dompdf->setPaper('A4', 'portrait');
    $dompdf->render();

    return $dompdf->output();
}

/**
 * Manda el comprobante por mail: PDF adjunto al comprador, y aviso de venta al
 * vendedor (con su propia copia, que sí incluye el desglose de comisión).
 *
 * Nunca lanza: un fallo de SMTP no puede tumbar un checkout. Marca
 * Pedido.ComprobanteEnviadoEn si al menos uno de los dos salió.
 *
 * @return array{comprador: bool, vendedor: bool}
 */
function rh_comprobante_enviar_email(mysqli $conn, int $pedidoId): array
{
    $resultado = ['comprador' => false, 'vendedor' => false];

    try {
        if (!rh_email_configurado() || !rh_comprobante_disponible()) {
            return $resultado;
        }

        $datos = rh_comprobante_datos($conn, $pedidoId);
        if ($datos === null) {
            return $resultado;
        }

        $numero = $datos['numero'];
        $total = number_format((float) $datos['pedido']['MontoProductos'], 2, ',', '.');
        $nombreVendedor = $datos['vendedor']['NombreCompleto'] ?? 'el vendedor';
        $nombreComprador = $datos['comprador']['NombreCompleto'] ?? 'un comprador';

        if (!empty($datos['comprador']['Email'])) {
            $cuerpo = "¡Gracias por tu compra en Red Huellitas!\n\n"
                . "Comprobante: $numero\n"
                . "Vendedor: $nombreVendedor\n"
                . "Total: \$$total\n\n"
                . "Te adjuntamos el comprobante en PDF.\n"
                . "Coordiná la entrega directamente con el vendedor desde la app.\n\n"
                . "— Red Huellitas\n";
            $resultado['comprador'] = rh_email_enviar(
                $datos['comprador']['Email'],
                "Tu compra en Red Huellitas — $numero",
                $cuerpo,
                ['nombre' => "comprobante-$numero.pdf", 'contenido' => rh_comprobante_pdf($datos, false)]
            );
        }

        if (!empty($datos['vendedor']['Email'])) {
            $recibis = number_format((float) $datos['pedido']['MontoVendedor'], 2, ',', '.');
            $cuerpo = "¡Tenés una venta nueva en Red Huellitas!\n\n"
                . "Comprobante: $numero\n"
                . "Comprador: $nombreComprador\n"
                . "Total de la venta: \$$total\n"
                . "Recibís: \$$recibis\n\n"
                . "Te adjuntamos el comprobante en PDF.\n"
                . "Entrá a la app para coordinar la entrega.\n\n"
                . "— Red Huellitas\n";
            $resultado['vendedor'] = rh_email_enviar(
                $datos['vendedor']['Email'],
                "Vendiste en Red Huellitas — $numero",
                $cuerpo,
                ['nombre' => "comprobante-$numero.pdf", 'contenido' => rh_comprobante_pdf($datos, true)]
            );
        }

        if ($resultado['comprador'] || $resultado['vendedor']) {
            $stmt = $conn->prepare('UPDATE Pedido SET ComprobanteEnviadoEn = NOW() WHERE PedidoId = ?');
            $stmt->bind_param('i', $pedidoId);
            $stmt->execute();
            $stmt->close();
        }
    } catch (\Throwable $e) {
        error_log('rh_comprobante_enviar_email: ' . $e->getMessage());
    }

    return $resultado;
}
