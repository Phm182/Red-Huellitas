import { router } from 'expo-router';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { authApi } from '../../src/api/authApi';
import { LogoImage } from '../../src/components/LogoImage';
import { centeredContent } from '../../src/theme/layout';
import { useTheme } from '../../src/theme/ThemeProvider';
import { AppInput } from '../../src/components/AppInput';

const isWeb = Platform.OS === 'web';

export default function RecuperarPasswordScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [paso, setPaso] = useState<'email' | 'codigo'>('email');
  const [email, setEmail] = useState('');
  const [codigo, setCodigo] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const enviarCodigo = async () => {
    setError(null);
    setMessage(null);
    setLoading(true);
    const res = await authApi.passwordOlvidada(email.trim());
    setLoading(false);
    if (!res.success) {
      setError(res.message);
      return;
    }
    setMessage(res.message);
    setPaso('codigo');
  };

  const restablecer = async () => {
    setError(null);
    setMessage(null);
    setLoading(true);
    const res = await authApi.passwordRestablecer(email.trim(), codigo.trim(), password);
    setLoading(false);
    if (!res.success) {
      setError(res.message);
      return;
    }
    setMessage(res.message);
    setTimeout(() => router.replace('/(auth)/login'), 1200);
  };

  return (
    <ScrollView
      contentContainerStyle={[styles.container, isWeb && styles.containerWeb, { backgroundColor: colors.background }]}
      keyboardShouldPersistTaps="handled"
    >
      <LogoImage style={styles.logo} />
      <Text style={[styles.title, { color: colors.text }]}>{t('auth.forgotTitle')}</Text>
      <Text style={[styles.sub, { color: colors.textMuted }]}>
        {paso === 'email' ? t('auth.forgotSubtitleEmail') : t('auth.forgotSubtitleCode')}
      </Text>

      {error ? <Text style={{ color: colors.danger, marginBottom: 12 }}>{error}</Text> : null}
      {message ? <Text style={{ color: colors.success, marginBottom: 12 }}>{message}</Text> : null}

      <AppInput
        placeholder={t('auth.email')}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        editable={paso === 'email' || true}
      />

      {paso === 'codigo' ? (
        <>
          <AppInput
            placeholder={t('auth.resetCode')}
            value={codigo}
            onChangeText={setCodigo}
            keyboardType="number-pad"
            maxLength={6}
          />
          <AppInput
            placeholder={t('auth.newPassword')}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
        </>
      ) : null}

      <Pressable
        style={[styles.button, { backgroundColor: colors.primary }]}
        onPress={paso === 'email' ? enviarCodigo : restablecer}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color={colors.primaryText} />
        ) : (
          <Text style={{ color: colors.primaryText, fontWeight: '600' }}>
            {paso === 'email' ? t('auth.sendResetCode') : t('auth.saveNewPassword')}
          </Text>
        )}
      </Pressable>

      <Pressable style={styles.link} onPress={() => router.back()}>
        <Text style={{ color: colors.primary }}>{t('auth.backToLogin')}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: 'center', padding: 24, ...centeredContent },
  containerWeb: { justifyContent: 'flex-start', paddingTop: 48, paddingBottom: 48 },
  logo: { width: 100, height: 100, alignSelf: 'center', marginBottom: 12 },
  title: { fontSize: 22, fontWeight: '700', textAlign: 'center', marginBottom: 8 },
  sub: { textAlign: 'center', marginBottom: 20, lineHeight: 20 },
  input: { borderWidth: 1, borderRadius: 10, padding: 14, marginBottom: 12, fontSize: 16 },
  button: { borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 8 },
  link: { marginTop: 20, alignItems: 'center' },
});
