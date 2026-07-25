<?php
/**
 * Envío de emails vía SMTP (PHPMailer). Config en inc/config/email.local.php,
 * mismo patrón que mercadopago.php / google_auth.php: si el archivo no está o
 * está incompleto, la feature se desactiva sola y nadie explota.
 *
 * Criterio de errores: esto NUNCA lanza. Un problema de SMTP no puede romper
 * un checkout — devuelve false y deja el detalle en error_log (mismo criterio
 * que mp_webhook.php, que tampoco relanza).
 */

function rh_email_config(): array
{
    $configFile = __DIR__ . '/../config/email.local.php';
    if (!is_file($configFile)) {
        return [];
    }
    return require $configFile;
}

/**
 * Ruta al autoload de composer. Devuelve null si no se corrió composer install
 * — el proyecto tiene que seguir funcionando sin vendor/ (todo lo anterior a
 * Fase 6d se construyó sin dependencias a propósito).
 */
function rh_vendor_autoload(): ?string
{
    $autoload = __DIR__ . '/../../vendor/autoload.php';
    return is_readable($autoload) ? $autoload : null;
}

function rh_email_configurado(): bool
{
    if (rh_vendor_autoload() === null) {
        return false;
    }
    $config = rh_email_config();
    return !empty($config['MAIL_FROM']) && !empty($config['SMTP_HOST']);
}

/**
 * Manda un mail de texto plano, opcionalmente con UN adjunto.
 *
 * @param array|null $adjunto ['nombre' => 'comprobante.pdf', 'contenido' => <bytes>]
 * @return bool true si se envió; false si no está configurado o falló.
 */
function rh_email_enviar(string $to, string $asunto, string $cuerpo, ?array $adjunto = null): bool
{
    if (!filter_var($to, FILTER_VALIDATE_EMAIL)) {
        error_log('rh_email: destinatario inválido: ' . $to);
        return false;
    }
    if (!rh_email_configurado()) {
        // No es un error: en un entorno sin credenciales esto es lo esperado.
        return false;
    }

    require_once rh_vendor_autoload();
    $config = rh_email_config();

    // El adjunto va a un archivo temporal porque PHPMailer::addAttachment()
    // trabaja con paths. Se borra siempre, incluso si el envío falla.
    $tmpPath = null;

    try {
        $mail = new \PHPMailer\PHPMailer\PHPMailer(true);

        $mail->isSMTP();
        $mail->Host = $config['SMTP_HOST'];
        $mail->SMTPAuth = true;
        $mail->Username = $config['SMTP_USER'] ?? '';
        $mail->Password = $config['SMTP_PASS'] ?? '';
        $mail->Port = (int) ($config['SMTP_PORT'] ?? 587);
        $mail->CharSet = 'UTF-8';
        $mail->Timeout = 20;

        $secure = strtolower(trim((string) ($config['SMTP_SECURE'] ?? 'tls')));
        if ($secure === 'tls') {
            $mail->SMTPSecure = \PHPMailer\PHPMailer\PHPMailer::ENCRYPTION_STARTTLS;
        } elseif ($secure === 'ssl' || $secure === 'smtps') {
            $mail->SMTPSecure = \PHPMailer\PHPMailer\PHPMailer::ENCRYPTION_SMTPS;
        } else {
            $mail->SMTPSecure = false;
        }

        $mail->setFrom($config['MAIL_FROM'], $config['MAIL_NAME'] ?? 'Red Huellitas');
        $mail->addAddress($to);
        $mail->Subject = $asunto;
        $mail->Body = $cuerpo;

        if ($adjunto !== null && !empty($adjunto['contenido'])) {
            $tmpPath = tempnam(sys_get_temp_dir(), 'rh_adj_');
            file_put_contents($tmpPath, $adjunto['contenido']);
            $mail->addAttachment($tmpPath, $adjunto['nombre'] ?? 'adjunto.pdf');
        }

        $ok = $mail->send();
        if (!$ok) {
            error_log('rh_email: send() devolvió false — ' . $mail->ErrorInfo);
        }
        return $ok;
    } catch (\Throwable $e) {
        error_log('rh_email: ' . $e->getMessage());
        return false;
    } finally {
        if ($tmpPath !== null && is_file($tmpPath)) {
            @unlink($tmpPath);
        }
    }
}
