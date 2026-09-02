import * as Google from 'expo-auth-session/providers/google';
import { exchangeCodeAsync } from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

WebBrowser.maybeCompleteAuthSession();

/**
 * En Android, `WebBrowser.openAuthSessionAsync` corre una carrera interna entre
 * "volvió el AppState a active" y "llegó la URL de redirect" (WebBrowser.js,
 * `_openAuthSessionPolyfillAsync`). Se comprobó en dispositivo que el AppState
 * gana casi siempre, así que `promptAsync()` resuelve como 'dismiss' aunque
 * Google sí haya redirigido con éxito — y esa URL la termina navegando Expo
 * Router como ruta normal (por eso existe app/oauthredirect.tsx).
 * Para que esa pantalla pueda terminar el login necesita el `code_verifier`
 * (PKCE) de la request que la generó; como esa request vive sólo en el estado
 * del hook del componente de login, se guarda acá en memoria del módulo justo
 * antes de abrir el browser.
 */
let pendingGoogleAuth: { codeVerifier: string; redirectUri: string; clientId: string; state: string } | null =
  null;

export function stashPendingGoogleAuth(request: {
  codeVerifier?: string | null;
  redirectUri: string;
  clientId: string;
  state: string;
}) {
  if (!request.codeVerifier) return;
  pendingGoogleAuth = {
    codeVerifier: request.codeVerifier,
    redirectUri: request.redirectUri,
    clientId: request.clientId,
    state: request.state,
  };
}

/** Intercambia el `code` recibido en app/oauthredirect.tsx por un id_token de Google. */
export async function exchangeGooglePendingAuthCode(
  code: string,
  state: string | undefined
): Promise<string> {
  const pending = pendingGoogleAuth;
  pendingGoogleAuth = null;
  if (!pending) {
    throw new Error(
      'No se encontró el intento de login con Google en curso (¿se reinició la app durante el proceso?)'
    );
  }
  if (state && state !== pending.state) {
    throw new Error('El login con Google no coincide con el que se inició (state distinto).');
  }
  const tokenResponse = await exchangeCodeAsync(
    {
      clientId: pending.clientId,
      code,
      redirectUri: pending.redirectUri,
      extraParams: { code_verifier: pending.codeVerifier },
    },
    Google.discovery
  );
  if (!tokenResponse.idToken) {
    throw new Error('Google no devolvió un id_token para esta cuenta.');
  }
  return tokenResponse.idToken;
}

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
