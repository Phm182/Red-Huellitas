<?php
/**
 * Envío de notificaciones push vía el servicio de Expo. Nunca lanza
 * excepción — si la red falla o Expo rechaza los tokens, el llamador
 * (ej. campanias/crear.php) no debe verse afectado (mismo criterio
 * defensivo que rh_noticias_obtener_html()).
 */

const RH_EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const RH_EXPO_PUSH_TIMEOUT_SEGUNDOS = 10;

/**
 * Envía la misma notificación a una lista de Expo push tokens.
 * $tokens: array de strings tipo "ExponentPushToken[...]".
 */
function rh_enviar_push(array $tokens, string $titulo, string $body): void
{
    if (count($tokens) === 0) {
        return;
    }

    $mensajes = array_map(
        fn (string $token) => ['to' => $token, 'title' => $titulo, 'body' => $body, 'sound' => 'default'],
        $tokens
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
    curl_exec($ch);
    curl_close($ch);
}
