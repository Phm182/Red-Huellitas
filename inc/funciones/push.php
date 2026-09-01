<?php
/**
 * Envío de notificaciones push vía el servicio de Expo. Nunca lanza
 * excepción — si la red falla o Expo rechaza los tokens, el llamador
 * (ej. campanias/crear.php) no debe verse afectado (mismo criterio
 * defensivo que rh_noticias_obtener_html()).
 */

const RH_EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const RH_EXPO_PUSH_TIMEOUT_SEGUNDOS = 10;

/** Expo rechaza los envíos de más de 100 mensajes por request. */
const RH_EXPO_PUSH_MAX_POR_LOTE = 100;

/**
 * Envía la misma notificación a una lista de Expo push tokens.
 *
 * $tokens: array de strings tipo "ExponentPushToken[...]".
 * $data:   payload opcional que la app recibe al tocar la notificación; se usa
 *          para abrir la pantalla correspondiente (ej. ['ruta' => '/juego/12']).
 */
function rh_enviar_push(array $tokens, string $titulo, string $body, ?array $data = null): void
{
    $tokens = array_values(array_filter($tokens));
    if (count($tokens) === 0) {
        return;
    }

    // Se manda de a 100: por encima de eso Expo rechaza el request entero, así
    // que sin esto una campaña grande no le llegaba a nadie.
    foreach (array_chunk($tokens, RH_EXPO_PUSH_MAX_POR_LOTE) as $lote) {
        $mensajes = array_map(
            function (string $token) use ($titulo, $body, $data) {
                $mensaje = ['to' => $token, 'title' => $titulo, 'body' => $body, 'sound' => 'default'];
                if ($data !== null) {
                    $mensaje['data'] = $data;
                }
                return $mensaje;
            },
            $lote
        );

        $ch = curl_init(RH_EXPO_PUSH_URL);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($mensajes));
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Content-Type: application/json',
            'Accept: application/json',
            'Accept-Encoding: gzip, deflate',
        ]);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, RH_EXPO_PUSH_TIMEOUT_SEGUNDOS);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
        $respuesta = curl_exec($ch);
        $errorCurl = curl_error($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        // Antes esto se descartaba entero: si un push no llegaba (token
        // vencido, credencial de FCM mal puesta, lo que sea), no había forma
        // de saber por qué sin agregar logging a mano cada vez. Expo
        // devuelve el detalle por mensaje en `data[].status`/`.message`, así
        // que alcanza con loguear la respuesta cruda cuando algo no salió
        // bien — no hace falta parsearla acá.
        if ($errorCurl !== '' || $httpCode >= 400 || (is_string($respuesta) && str_contains($respuesta, '"status":"error"'))) {
            error_log('rh_enviar_push falló: httpCode=' . $httpCode . ' curlError=' . $errorCurl . ' respuesta=' . substr((string) $respuesta, 0, 2000));
        }
    }
}
