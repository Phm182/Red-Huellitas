import { router } from 'expo-router';
import React, { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useAuth } from '../../src/auth/AuthProvider';
import { useGoogleAuthRequest } from '../../src/auth/googleAuth';
import { LogoImage } from '../../src/components/LogoImage';
import { centeredContent } from '../../src/theme/layout';
import { useTheme } from '../../src/theme/ThemeProvider';

export default function LoginScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { login, loginConGoogle } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const passwordInputRef = useRef<TextInput>(null);

  const [request, , promptAsync] = useGoogleAuthRequest();

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
    const result = await promptAsync();
    if (result.type === 'success' && result.params.id_token) {
      setLoading(true);
      const res = await loginConGoogle(result.params.id_token);
      setLoading(false);
      if (res.success) {
        router.replace('/');
      } else {
        setError(res.message);
      }
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <LogoImage style={styles.logo} />
        <Text style={[styles.title, { color: colors.text }]}>{t('auth.loginTitle')}</Text>

        <TextInput
          style={[styles.input, { borderColor: colors.border, color: colors.text }]}
          placeholder={t('auth.email')}
          placeholderTextColor={colors.textMuted}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          returnKeyType="next"
          onSubmitEditing={() => passwordInputRef.current?.focus()}
          blurOnSubmit={false}
        />
        <TextInput
          ref={passwordInputRef}
          style={[styles.input, { borderColor: colors.border, color: colors.text }]}
          placeholder={t('auth.password')}
          placeholderTextColor={colors.textMuted}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          returnKeyType="go"
          onSubmitEditing={onLogin}
        />

        {error ? <Text style={{ color: colors.danger, marginBottom: 12 }}>{error}</Text> : null}

        <Pressable
          style={[styles.button, { backgroundColor: colors.primary }]}
          onPress={onLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={colors.primaryText} />
          ) : (
            <Text style={{ color: colors.primaryText, fontWeight: '600' }}>{t('auth.loginButton')}</Text>
          )}
        </Pressable>

        <Pressable
          style={[styles.button, styles.googleButton, { borderColor: colors.border }]}
          onPress={onGoogleLogin}
          disabled={!request}
        >
          <Text style={{ color: colors.text, fontWeight: '600' }}>{t('auth.continueWithGoogle')}</Text>
        </Pressable>

        <Pressable style={styles.link} onPress={() => router.push('/(auth)/registro')}>
          <Text style={{ color: colors.primary }}>{t('auth.noAccount')}</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, alignItems: 'stretch', justifyContent: 'center', padding: 24, ...centeredContent },
  logo: { width: 120, height: 120, alignSelf: 'center', marginBottom: 16 },
  title: { fontSize: 24, fontWeight: '700', textAlign: 'center', marginBottom: 24 },
  input: { borderWidth: 1, borderRadius: 10, padding: 14, marginBottom: 12, fontSize: 16 },
  button: { borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 8 },
  googleButton: { borderWidth: 1, backgroundColor: 'transparent' },
  link: { marginTop: 20, alignItems: 'center' },
});
