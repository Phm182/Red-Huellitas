import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

WebBrowser.maybeCompleteAuthSession();

/**
 * Client ID de la plataforma actual (para mostrar “falta config” en la UI).
 * Las vars EXPO_PUBLIC_* se inyectan al arrancar Metro; si las cambiás, reiniciá con --clear.
 */
export function getGoogleClientId(): string {
  const web = (process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB || '').trim();
  const android = (process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID || '').trim();
  const ios = (process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS || '').trim();

  if (Platform.OS === 'android') {
    return android || web;
  }
  if (Platform.OS === 'ios') {
    return ios || web;
  }
  return web || android || ios;
}

/**
 * URI fija en web para que coincida con Google Cloud Console.
 * Si usáramos window.location completo (con /login), Google responde redirect_uri_mismatch.
 */
export function getGoogleRedirectUri(): string | undefined {
  if (Platform.OS !== 'web') {
    return undefined; // nativo: lo arma el provider (scheme de la app)
  }
  const fromEnv = (process.env.EXPO_PUBLIC_GOOGLE_REDIRECT_URI || '').trim();
  if (fromEnv) {
    return fromEnv;
  }
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }
  return 'http://localhost:8081';
}

/**
 * Usa el provider oficial de Google:
 * - Web: id_token (sin PKCE) → evita "code_challenge_method" inválido
 * - Android/iOS: code + intercambio → id_token
 */
export function useGoogleAuthRequest() {
  const webClientId = (process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB || '').trim() || undefined;
  const androidClientId =
    (process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID || '').trim() || undefined;
  const iosClientId = (process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS || '').trim() || undefined;
  const redirectUri = getGoogleRedirectUri();

  return Google.useIdTokenAuthRequest({
    webClientId,
    androidClientId,
    iosClientId,
    clientId: getGoogleClientId() || 'unconfigured',
    ...(redirectUri ? { redirectUri } : {}),
  });
}
