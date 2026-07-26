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
import { Atmosphere } from '../../src/components/Atmosphere';
import { LogoImage } from '../../src/components/LogoImage';
import { TipoUsuarioCatalogoItem } from '../../src/types';
import { radii } from '../../src/theme/elevation';
import { centeredContent } from '../../src/theme/layout';
import { fonts, type } from '../../src/theme/typography';
import { useTheme } from '../../src/theme/ThemeProvider';
import { AppInput } from '../../src/components/AppInput';

const isWeb = Platform.OS === 'web';

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

  const form = (
    <ScrollView
      contentContainerStyle={[styles.container, isWeb && styles.containerWeb]}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      automaticallyAdjustKeyboardInsets={!isWeb}
    >
      <LogoImage style={styles.logo} />
      <Text style={[styles.title, { color: colors.text }]}>{t('auth.registerTitle')}</Text>
      <Text style={[styles.subtitle, { color: colors.textMuted }]}>Red Huellitas</Text>

      <AppInput
        placeholder={t('auth.fullName')}
        value={nombreCompleto}
        onChangeText={setNombreCompleto}
        autoComplete="name"
        textContentType="name"
      />
      <AppInput
        placeholder={t('auth.email')}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        autoComplete="email"
        textContentType="emailAddress"
      />
      <AppInput
        placeholder={t('auth.password')}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="new-password"
        textContentType="newPassword"
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
  );

  if (isWeb) {
    return <Atmosphere intensity="auth">{form}</Atmosphere>;
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Atmosphere intensity="auth">{form}</Atmosphere>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: 'center', padding: 24, ...centeredContent },
  containerWeb: { justifyContent: 'flex-start', paddingTop: 32, paddingBottom: 48 },
  logo: { width: 100, height: 100, alignSelf: 'center', marginBottom: 12 },
  title: { ...type.title, textAlign: 'center', marginBottom: 4 },
  subtitle: { ...type.bodySm, textAlign: 'center', marginBottom: 20, fontFamily: fonts.bodySemi },
  input: {
    borderWidth: 1,
    borderRadius: radii.md,
    padding: 14,
    marginBottom: 12,
    fontSize: 16,
    fontFamily: fonts.body,
  },
  label: { ...type.label, marginBottom: 8 },
  tipoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  tipoChip: { borderWidth: 1, borderRadius: radii.pill, paddingVertical: 8, paddingHorizontal: 16 },
  clauseBox: { flexDirection: 'row', borderWidth: 1, borderRadius: radii.md, padding: 12, marginBottom: 16, gap: 10 },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  button: { borderRadius: radii.md, padding: 14, alignItems: 'center', marginTop: 8 },
  link: { marginTop: 20, alignItems: 'center' },
});
