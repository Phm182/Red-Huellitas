import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { useMemo, useRef } from 'react';

WebBrowser.maybeCompleteAuthSession();

const discovery = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
};

/**
 * Config para expo-auth-session con Google. Requiere Client IDs OAuth en
 * EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB/ANDROID/IOS.
 *
 * IMPORTANTE: el `nonce` y el objeto de config deben ser estables entre
 * renders. Si `extraParams.nonce` cambia en cada render (p.ej. Math.random()
 * inline), `useAuthRequest` re-dispara su efecto → setState → re-render →
 * loop infinito que cuelga la pestaña entera (muy visible en mobile web
 * cuando el teclado fuerza un re-layout al enfocar un input).
 */
export function useGoogleAuthRequest() {
  const clientId =
    process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB ||
    process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID ||
    process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS ||
    '';

  const redirectUri = AuthSession.makeRedirectUri();
  const nonceRef = useRef(Math.random().toString(36).slice(2));

  const config = useMemo(
    () => ({
      clientId,
      scopes: ['openid', 'profile', 'email'] as string[],
      redirectUri,
      responseType: AuthSession.ResponseType.IdToken,
      extraParams: { nonce: nonceRef.current },
    }),
    [clientId, redirectUri]
  );

  return AuthSession.useAuthRequest(config, discovery);
}
