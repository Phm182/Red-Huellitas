import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { perfilApi } from '../../../src/api/perfilApi';
import { useAuth } from '../../../src/auth/AuthProvider';
import { Visibilidad } from '../../../src/types';
import { centeredContent } from '../../../src/theme/layout';
import { useTheme } from '../../../src/theme/ThemeProvider';

export default function WhatsappScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { user, actualizarUsuario } = useAuth();

  const [numero, setNumero] = useState(user?.whatsappNumero ?? '');
  const [visibilidad, setVisibilidad] = useState<Visibilidad>(user?.whatsappVisibilidad ?? 'privada');
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onGuardar = async () => {
    setError(null);
    setMensaje(null);
    setLoading(true);
    const res = await perfilApi.guardarWhatsapp(numero.trim(), visibilidad);
    setLoading(false);
    if (res.success && res.data && user) {
      actualizarUsuario({ ...user, whatsappNumero: res.data.whatsappNumero, whatsappVisibilidad: res.data.whatsappVisibilidad });
      setMensaje(t('common.changesSaved'));
    } else {
      setError(res.message);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.label, { color: colors.text }]}>{t('settings.whatsappNumber')}</Text>
      <Text style={{ color: colors.textMuted, marginBottom: 16 }}>{t('settings.whatsappHelp')}</Text>

      <TextInput
        style={[styles.input, { borderColor: colors.border, color: colors.text }]}
        placeholder="+549..."
        placeholderTextColor={colors.textMuted}
        value={numero}
        onChangeText={setNumero}
        keyboardType="phone-pad"
      />

      <Text style={[styles.label, { color: colors.text, marginTop: 8 }]}>{t('settings.whatsappVisibility')}</Text>
      <View style={styles.segmented}>
        <Pressable
          style={[
            styles.segment,
            { borderColor: colors.primary, backgroundColor: visibilidad === 'publica' ? colors.primary : 'transparent' },
          ]}
          onPress={() => setVisibilidad('publica')}
        >
          <Text style={{ color: visibilidad === 'publica' ? colors.primaryText : colors.primary, fontWeight: '600' }}>
            {t('settings.visibilityPublic')}
          </Text>
        </Pressable>
        <Pressable
          style={[
            styles.segment,
            { borderColor: colors.primary, backgroundColor: visibilidad === 'privada' ? colors.primary : 'transparent' },
          ]}
          onPress={() => setVisibilidad('privada')}
        >
          <Text style={{ color: visibilidad === 'privada' ? colors.primaryText : colors.primary, fontWeight: '600' }}>
            {t('settings.visibilityPrivate')}
          </Text>
        </Pressable>
      </View>

      {mensaje ? <Text style={{ color: colors.success, marginBottom: 12, marginTop: 16 }}>{mensaje}</Text> : null}
      {error ? <Text style={{ color: colors.danger, marginBottom: 12, marginTop: 16 }}>{error}</Text> : null}

      <Pressable
        style={[styles.button, { backgroundColor: colors.primary, marginTop: error || mensaje ? 0 : 20 }]}
        onPress={onGuardar}
        disabled={loading}
      >
        {loading ? <ActivityIndicator color={colors.primaryText} /> : (
          <Text style={{ color: colors.primaryText, fontWeight: '600' }}>{t('common.save')}</Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, ...centeredContent },
  label: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
  input: { borderWidth: 1, borderRadius: 10, padding: 14, marginBottom: 12, fontSize: 16 },
  segmented: { flexDirection: 'row', gap: 8, marginTop: 8 },
  segment: { flex: 1, borderWidth: 1, borderRadius: 8, padding: 10, alignItems: 'center' },
  button: { borderRadius: 10, padding: 14, alignItems: 'center' },
});
