import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
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
import { noticiasApi } from '../../src/api/noticiasApi';
import { useAuth } from '../../src/auth/AuthProvider';
import { LogoImage } from '../../src/components/LogoImage';
import { TipoUsuarioCatalogoItem } from '../../src/types';
import { centeredContent } from '../../src/theme/layout';
import { useTheme } from '../../src/theme/ThemeProvider';

export default function RegistroScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { registro } = useAuth();

  const [tipos, setTipos] = useState<TipoUsuarioCatalogoItem[]>([]);

  useEffect(() => {
    noticiasApi.tipos().then((res) => {
      if (res.success && res.data) {
        setTipos(res.data.tipos);
      }
    });
  }, []);

  const [nombreCompleto, setNombreCompleto] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [aceptaClausula, setAceptaClausula] = useState(false);
  const [tipoUsuarioCodigo, setTipoUsuarioCodigo] = useState('individual');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const puedeEnviar = nombreCompleto.trim() && email.trim() && password.length >= 8 && aceptaClausula;

  const onSubmit = async () => {
    setError(null);
    setLoading(true);
    const res = await registro(email.trim(), password, nombreCompleto.trim(), aceptaClausula, tipoUsuarioCodigo);
    setLoading(false);
    if (res.success) {
      router.replace('/');
    } else {
      setError(res.message);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <LogoImage style={styles.logo} />
        <Text style={[styles.title, { color: colors.text }]}>{t('auth.registerTitle')}</Text>

        <TextInput
          style={[styles.input, { borderColor: colors.border, color: colors.text }]}
          placeholder={t('auth.fullName')}
          placeholderTextColor={colors.textMuted}
          value={nombreCompleto}
          onChangeText={setNombreCompleto}
        />
        <TextInput
          style={[styles.input, { borderColor: colors.border, color: colors.text }]}
          placeholder={t('auth.email')}
          placeholderTextColor={colors.textMuted}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <TextInput
          style={[styles.input, { borderColor: colors.border, color: colors.text }]}
          placeholder={t('auth.password')}
          placeholderTextColor={colors.textMuted}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <Text style={[styles.label, { color: colors.text }]}>{t('tipoUsuario.selectorLabel')}</Text>
        <View style={styles.tipoRow}>
          {tipos.map((tipo) => {
            const activo = tipoUsuarioCodigo === tipo.codigo;
            return (
              <Pressable
                key={tipo.codigo}
                onPress={() => setTipoUsuarioCodigo(tipo.codigo)}
                style={[
                  styles.tipoChip,
                  { borderColor: colors.primary, backgroundColor: activo ? colors.primary : 'transparent' },
                ]}
              >
                <Text style={{ color: activo ? colors.primaryText : colors.primary, fontWeight: '600' }}>
                  {t(`tipoUsuario.${tipo.codigo}`, tipo.nombre)}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Pressable
          style={[styles.clauseBox, { borderColor: colors.border, backgroundColor: colors.surface }]}
          onPress={() => setAceptaClausula((v) => !v)}
        >
          <View
            style={[
              styles.checkbox,
              { borderColor: colors.primary, backgroundColor: aceptaClausula ? colors.primary : 'transparent' },
            ]}
          >
            {aceptaClausula ? <Text style={{ color: colors.primaryText }}>✓</Text> : null}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.text, fontWeight: '600', marginBottom: 4 }}>
              {t('auth.acceptClause')}
            </Text>
            <Text style={{ color: colors.textMuted, fontSize: 12, lineHeight: 17 }}>
              {t('auth.antiCriaderosClause')}
            </Text>
          </View>
        </Pressable>

        {error ? <Text style={{ color: colors.danger, marginBottom: 12 }}>{error}</Text> : null}

        <Pressable
          style={[styles.button, { backgroundColor: puedeEnviar ? colors.primary : colors.border }]}
          onPress={onSubmit}
          disabled={!puedeEnviar || loading}
        >
          {loading ? (
            <ActivityIndicator color={colors.primaryText} />
          ) : (
            <Text style={{ color: colors.primaryText, fontWeight: '600' }}>{t('auth.registerButton')}</Text>
          )}
        </Pressable>

        <Pressable style={styles.link} onPress={() => router.push('/(auth)/login')}>
          <Text style={{ color: colors.primary }}>{t('auth.hasAccount')}</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: 'center', padding: 24, ...centeredContent },
  logo: { width: 100, height: 100, alignSelf: 'center', marginBottom: 12 },
  title: { fontSize: 24, fontWeight: '700', textAlign: 'center', marginBottom: 20 },
  input: { borderWidth: 1, borderRadius: 10, padding: 14, marginBottom: 12, fontSize: 16 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  tipoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  tipoChip: { borderWidth: 1, borderRadius: 20, paddingVertical: 8, paddingHorizontal: 16 },
  clauseBox: { flexDirection: 'row', borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 16, gap: 10 },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  button: { borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 8 },
  link: { marginTop: 20, alignItems: 'center' },
});
