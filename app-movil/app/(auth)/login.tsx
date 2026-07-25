import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { useAuth } from '../../src/auth/AuthProvider';
import { getGoogleClientId, useGoogleAuthRequest } from '../../src/auth/googleAuth';
import { AppButton } from '../../src/components/AppButton';
import { AppInput } from '../../src/components/AppInput';
import { Atmosphere } from '../../src/components/Atmosphere';
import { LogoImage } from '../../src/components/LogoImage';
import { elevation, radii } from '../../src/theme/elevation';
import { centeredContent } from '../../src/theme/layout';
import { fonts, type } from '../../src/theme/typography';
import { useTheme } from '../../src/theme/ThemeProvider';

const isWeb = Platform.OS === 'web';

export default function LoginScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { login, loginConGoogle } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const passwordInputRef = useRef<TextInput>(null);

  const googleConfigured = Boolean(getGoogleClientId());
  const [request, googleResponse, promptAsync] = useGoogleAuthRequest();
  const googleTokenHandled = useRef<string | null>(null);

  const logoY = useSharedValue(18);
  const logoOp = useSharedValue(0);
  const panelY = useSharedValue(28);
  const panelOp = useSharedValue(0);

  useEffect(() => {
    logoOp.value = withTiming(1, { duration: 520, easing: Easing.out(Easing.cubic) });
    logoY.value = withTiming(0, { duration: 520, easing: Easing.out(Easing.cubic) });
    panelOp.value = withDelay(120, withTiming(1, { duration: 480 }));
    panelY.value = withDelay(120, withTiming(0, { duration: 480, easing: Easing.out(Easing.cubic) }));
  }, [logoOp, logoY, panelOp, panelY]);

  // Web trae id_token directo; en nativo llega tras el exchange del code.
  useEffect(() => {
    const idToken =
      googleResponse?.type === 'success' ? googleResponse.params.id_token : undefined;
    if (!idToken || googleTokenHandled.current === idToken) return;
    googleTokenHandled.current = idToken;

    let cancelado = false;
    (async () => {
      setError(null);
      setLoading(true);
      const res = await loginConGoogle(idToken);
      if (cancelado) return;
      setLoading(false);
      if (res.success) {
        router.replace('/');
      } else {
        setError(res.message);
      }
    })();

    return () => {
      cancelado = true;
    };
  }, [googleResponse, loginConGoogle]);

  const logoAnim = useAnimatedStyle(() => ({
    opacity: logoOp.value,
    transform: [{ translateY: logoY.value }],
  }));
  const panelAnim = useAnimatedStyle(() => ({
    opacity: panelOp.value,
    transform: [{ translateY: panelY.value }],
  }));

  const onLogin = async () => {
    setError(null);
    setLoading(true);
    const res = await login(email.trim(), password);
    setLoading(false);
    if (res.success) {
      router.replace('/');
    } else {
      setError(res.message);
    }
  };

  const onGoogleLogin = async () => {
    if (!googleConfigured) {
      setError(t('auth.googleMissingClientId'));
      return;
    }
    setError(null);
    try {
      const result = await promptAsync();
      if (result.type === 'error') {
        setError(result.error?.message || t('auth.googleError'));
      }
      // success lo procesa el useEffect (incluye exchange en Android/iOS)
    } catch (e) {
      setError(e instanceof Error ? e.message : t('auth.googleError'));
    }
  };

  const form = (
    <ScrollView
      contentContainerStyle={[styles.container, isWeb && styles.containerWeb]}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      automaticallyAdjustKeyboardInsets={!isWeb}
    >
      <Animated.View style={[styles.brandBlock, logoAnim]}>
        <LogoImage style={styles.logo} />
        <Text style={[styles.brand, { color: colors.text }]}>Red Huellitas</Text>
        <Text style={[styles.tagline, { color: colors.textMuted }]}>{t('auth.loginTitle')}</Text>
      </Animated.View>

      <Animated.View
        style={[
          styles.panel,
          elevation.md,
          { backgroundColor: colors.surface, borderColor: colors.border },
          panelAnim,
        ]}
      >
        <AppInput
          placeholder={t('auth.email')}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          textContentType="emailAddress"
          autoComplete="email"
          returnKeyType="next"
          onSubmitEditing={() => passwordInputRef.current?.focus()}
          blurOnSubmit={false}
        />
        <AppInput
          ref={passwordInputRef}
          placeholder={t('auth.password')}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          textContentType="password"
          autoComplete="password"
          returnKeyType="go"
          onSubmitEditing={onLogin}
        />

        <Pressable style={styles.forgot} onPress={() => router.push('/(auth)/recuperar')}>
          <Text style={{ color: colors.primary, fontFamily: fonts.bodySemi }}>{t('auth.forgotPassword')}</Text>
        </Pressable>

        {error ? (
          <Text style={[styles.error, { color: colors.danger }]}>{error}</Text>
        ) : null}

        <AppButton label={t('auth.loginButton')} onPress={onLogin} loading={loading} />

        <AppButton
          label={t('auth.continueWithGoogle')}
          onPress={onGoogleLogin}
          variant="secondary"
          disabled={loading || (googleConfigured && !request)}
          style={{ marginTop: 10, opacity: googleConfigured ? 1 : 0.55 }}
        />
        {!googleConfigured ? (
          <Text style={[styles.hint, { color: colors.textMuted }]}>{t('auth.googleMissingClientIdHint')}</Text>
        ) : null}

        <Pressable style={styles.link} onPress={() => router.push('/(auth)/registro')}>
          <Text style={{ color: colors.accent, fontFamily: fonts.bodySemi }}>{t('auth.noAccount')}</Text>
        </Pressable>
      </Animated.View>
    </ScrollView>
  );

  const shell = (
    <Atmosphere intensity="auth" style={{ flex: 1 }}>
      {form}
    </Atmosphere>
  );

  if (isWeb) {
    return shell;
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {shell}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    alignItems: 'stretch',
    justifyContent: 'center',
    padding: 24,
    ...centeredContent,
  },
  containerWeb: { justifyContent: 'flex-start', paddingTop: 48, paddingBottom: 48 },
  brandBlock: { alignItems: 'center', marginBottom: 22 },
  logo: { width: 112, height: 112, marginBottom: 10 },
  brand: { ...type.hero, textAlign: 'center' },
  tagline: { ...type.bodySm, textAlign: 'center', marginTop: 4 },
  panel: {
    borderRadius: radii.xl,
    borderWidth: 1,
    padding: 20,
  },
  forgot: { alignSelf: 'flex-end', marginBottom: 12, marginTop: -4 },
  error: { ...type.bodySm, marginBottom: 10 },
  hint: { ...type.caption, textAlign: 'center', marginTop: 8 },
  link: { marginTop: 18, alignItems: 'center' },
});
