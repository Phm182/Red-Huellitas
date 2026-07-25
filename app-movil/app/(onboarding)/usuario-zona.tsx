import * as Location from 'expo-location';
import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
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
import { authApi } from '../../src/api/authApi';
import { useAuth } from '../../src/auth/AuthProvider';
import { centeredContent } from '../../src/theme/layout';
import { useTheme } from '../../src/theme/ThemeProvider';

export default function UsuarioZonaScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { user, actualizarUsuario } = useAuth();

  const [username, setUsername] = useState('');
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>(
    'idle'
  );
  const [zonaDescripcion, setZonaDescripcion] = useState('');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [aceptaClausula, setAceptaClausula] = useState(user?.aceptoClausulaAntiCriaderos ?? false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    const valido = /^[a-z0-9_.]{3,30}$/.test(username);
    if (!username) {
      setUsernameStatus('idle');
      return;
    }
    if (!valido) {
      setUsernameStatus('invalid');
      return;
    }
    setUsernameStatus('checking');
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const res = await authApi.checkUsername(username);
      if (res.success && res.data) {
        setUsernameStatus(res.data.available ? 'available' : 'taken');
      }
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [username]);

  const obtenerUbicacion = async () => {
    setLocationError(null);
    setLocating(true);
    const permiso = await Location.requestForegroundPermissionsAsync();
    if (!permiso.granted) {
      setLocationError(t('onboarding.locationPermissionDenied'));
      setLocating(false);
      return;
    }
    const posicion = await Location.getCurrentPositionAsync({});
    setCoords({ lat: posicion.coords.latitude, lng: posicion.coords.longitude });
    setLocating(false);
  };

  const necesitaAceptarClausula = !(user?.aceptoClausulaAntiCriaderos ?? false);
  const puedeContinuar =
    usernameStatus === 'available' &&
    coords !== null &&
    zonaDescripcion.trim().length > 0 &&
    (!necesitaAceptarClausula || aceptaClausula);

  const onSubmit = async () => {
    if (!coords) return;
    setError(null);
    setSubmitting(true);
    const res = await authApi.guardarOnboarding({
      username,
      zonaLat: coords.lat,
      zonaLng: coords.lng,
      zonaDescripcion: zonaDescripcion.trim(),
      aceptaClausulaAntiCriaderos: aceptaClausula,
    });
    setSubmitting(false);
    if (res.success && res.data) {
      actualizarUsuario(res.data.user);
      router.replace('/(onboarding)/verificacion');
    } else {
      setError(res.message);
    }
  };

  const isWeb = Platform.OS === 'web';

  const form = (
      <ScrollView
        contentContainerStyle={[styles.container, isWeb && styles.containerWeb]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        automaticallyAdjustKeyboardInsets={!isWeb}
      >
        <Text style={[styles.title, { color: colors.text }]}>{t('onboarding.usernameZoneTitle')}</Text>

        <TextInput
          style={[styles.input, { borderColor: colors.border, color: colors.text }]}
          placeholder={t('onboarding.username')}
          placeholderTextColor={colors.textMuted}
          value={username}
          onChangeText={(v) => setUsername(v.toLowerCase())}
          autoCapitalize="none"
        />
        {usernameStatus === 'checking' ? <ActivityIndicator color={colors.primary} /> : null}
        {usernameStatus === 'available' ? (
          <Text style={{ color: colors.success, marginBottom: 8 }}>{t('onboarding.usernameAvailable')}</Text>
        ) : null}
        {usernameStatus === 'taken' ? (
          <Text style={{ color: colors.danger, marginBottom: 8 }}>{t('onboarding.usernameTaken')}</Text>
        ) : null}
        {usernameStatus === 'invalid' ? (
          <Text style={{ color: colors.danger, marginBottom: 8 }}>{t('onboarding.usernameInvalid')}</Text>
        ) : null}

        <TextInput
          style={[styles.input, { borderColor: colors.border, color: colors.text }]}
          placeholder={t('onboarding.zoneLabel')}
          placeholderTextColor={colors.textMuted}
          value={zonaDescripcion}
          onChangeText={setZonaDescripcion}
        />

        <Pressable
          style={[styles.button, styles.outlineButton, { borderColor: colors.primary }]}
          onPress={obtenerUbicacion}
          disabled={locating}
        >
          {locating ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <Text style={{ color: colors.primary, fontWeight: '600' }}>
              {coords ? t('onboarding.locationObtained') : t('onboarding.getLocation')}
            </Text>
          )}
        </Pressable>
        {locationError ? <Text style={{ color: colors.danger, marginTop: 8 }}>{locationError}</Text> : null}

        {necesitaAceptarClausula ? (
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
            <Text style={{ flex: 1, color: colors.text, fontSize: 13 }}>{t('auth.acceptClause')}</Text>
          </Pressable>
        ) : null}

        {error ? <Text style={{ color: colors.danger, marginBottom: 12 }}>{error}</Text> : null}

        <Pressable
          style={[styles.button, { backgroundColor: puedeContinuar ? colors.primary : colors.border, marginTop: 16 }]}
          onPress={onSubmit}
          disabled={!puedeContinuar || submitting}
        >
          {submitting ? (
            <ActivityIndicator color={colors.primaryText} />
          ) : (
            <Text style={{ color: colors.primaryText, fontWeight: '600' }}>{t('common.continue')}</Text>
          )}
        </Pressable>
      </ScrollView>
  );

  if (isWeb) {
    return <View style={{ flex: 1, backgroundColor: colors.background }}>{form}</View>;
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {form}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: 'center', padding: 24, ...centeredContent },
  containerWeb: { justifyContent: 'flex-start', paddingTop: 32, paddingBottom: 48 },
  title: { fontSize: 22, fontWeight: '700', textAlign: 'center', marginBottom: 24 },
  input: { borderWidth: 1, borderRadius: 10, padding: 14, marginBottom: 8, fontSize: 16 },
  button: { borderRadius: 10, padding: 14, alignItems: 'center' },
  outlineButton: { borderWidth: 1, marginTop: 8, marginBottom: 8 },
  clauseBox: { flexDirection: 'row', borderWidth: 1, borderRadius: 10, padding: 12, marginTop: 12, gap: 10 },
  checkbox: { width: 22, height: 22, borderWidth: 2, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
});
