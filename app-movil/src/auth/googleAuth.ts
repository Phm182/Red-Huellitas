import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';

WebBrowser.maybeCompleteAuthSession();

const discovery = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
};

/**
 * Config para expo-auth-session con Google. Requiere que el usuario haya
 * creado Client IDs OAuth en Google Cloud Console y los haya puesto en
 * el .env (EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB/ANDROID/IOS).
 */
export function useGoogleAuthRequest() {
  const clientId =
    process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB ||
    process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID ||
    process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS ||
    '';

  const redirectUri = AuthSession.makeRedirectUri();

  return AuthSession.useAuthRequest(
    {
      clientId,
      scopes: ['openid', 'profile', 'email'],
      redirectUri,
      responseType: AuthSession.ResponseType.IdToken,
      extraParams: { nonce: Math.random().toString(36).slice(2) },
    },
    discovery
  );
}
