import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, Text } from 'react-native';
import { useAuth } from '../src/auth/AuthProvider';
import { exchangeGooglePendingAuthCode } from '../src/auth/googleAuth';
import { AppButton } from '../src/components/AppButton';
import { Atmosphere } from '../src/components/Atmosphere';
import { type } from '../src/theme/typography';
import { useTheme } from '../src/theme/ThemeProvider';

/**
 * Destino del redirect de Google en Android (`redhuellitas://oauthredirect`).
 * En este build, `WebBrowser.openAuthSessionAsync` no llega a resolver el
 * `promptAsync()` de la pantalla de login (ver comentario en
 * src/auth/googleAuth.ts) — el sistema operativo entrega el link acá, a Expo
 * Router, así que esta pantalla termina el login "a mano": toma el `code`,
 * lo cambia por un id_token con el code_verifier guardado, y llama a
 * loginConGoogle igual que haría el flujo normal.
 */
export default function OAuthRedirectScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { loginConGoogle } = useAuth();
  const params = useLocalSearchParams<{ code?: string; state?: string; error?: string }>();
  const [error, setError] = useState<string | null>(null);
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    if (params.error) {
      setError(t('auth.googleFinishError'));
      return;
    }
    if (!params.code) {
      setError(t('auth.googleFinishError'));
      return;
    }

    (async () => {
      try {
        const idToken = await exchangeGooglePendingAuthCode(params.code as string, params.state as string | undefined);
        const res = await loginConGoogle(idToken);
        if (res.success) {
          router.replace('/');
        } else {
          setError(res.message || t('auth.googleFinishError'));
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : t('auth.googleFinishError'));
      }
    })();
  }, [params.code, params.state, params.error, loginConGoogle, t]);

  return (
    <Atmosphere intensity="auth" style={styles.container}>
      {error ? (
        <>
          <Text style={[type.body, styles.message, { color: colors.danger }]}>{error}</Text>
          <AppButton label={t('auth.backToLogin')} onPress={() => router.replace('/(auth)/login')} />
        </>
      ) : (
        <>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[type.body, styles.message, { color: colors.text }]}>{t('auth.googleFinishing')}</Text>
        </>
      )}
    </Atmosphere>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 16 },
  message: { textAlign: 'center' },
});
