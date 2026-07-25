import { router, usePathname } from 'expo-router';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { reportesApi } from '../api/reportesApi';
import { ReporteTipo } from '../types';
import { centeredContent } from '../theme/layout';
import { useTheme } from '../theme/ThemeProvider';

export function ReportModal() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const pantallaOrigen = usePathname();

  const [tipo, setTipo] = useState<ReporteTipo>('mejora');
  const [detalle, setDetalle] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onEnviar = async () => {
    if (!detalle.trim()) return;
    setError(null);
    setSubmitting(true);
    const res = await reportesApi.crearReporte(tipo, detalle.trim(), pantallaOrigen);
    setSubmitting(false);
    if (res.success) {
      setEnviado(true);
      setTimeout(() => router.back(), 900);
    } else {
      setError(res.message);
    }
  };

  if (enviado) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.success, fontSize: 16, fontWeight: '600' }}>{t('report.submitted')}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.segmented}>
        <Pressable
          style={[
            styles.segment,
            { borderColor: colors.primary, backgroundColor: tipo === 'mejora' ? colors.primary : 'transparent' },
          ]}
          onPress={() => setTipo('mejora')}
        >
          <Text style={{ color: tipo === 'mejora' ? colors.primaryText : colors.primary, fontWeight: '600' }}>
            {t('report.typeImprovement')}
          </Text>
        </Pressable>
        <Pressable
          style={[
            styles.segment,
            { borderColor: colors.primary, backgroundColor: tipo === 'falla' ? colors.primary : 'transparent' },
          ]}
          onPress={() => setTipo('falla')}
        >
          <Text style={{ color: tipo === 'falla' ? colors.primaryText : colors.primary, fontWeight: '600' }}>
            {t('report.typeBug')}
          </Text>
        </Pressable>
      </View>

      <TextInput
        style={[styles.textarea, { borderColor: colors.border, color: colors.text }]}
        placeholder={t('report.detailPlaceholder')}
        placeholderTextColor={colors.textMuted}
        value={detalle}
        onChangeText={setDetalle}
        multiline
        numberOfLines={5}
      />

      {error ? <Text style={{ color: colors.danger, marginBottom: 12 }}>{error}</Text> : null}

      <Pressable
        style={[styles.button, { backgroundColor: detalle.trim() ? colors.primary : colors.border }]}
        onPress={onEnviar}
        disabled={!detalle.trim() || submitting}
      >
        {submitting ? (
          <ActivityIndicator color={colors.primaryText} />
        ) : (
          <Text style={{ color: colors.primaryText, fontWeight: '600' }}>{t('common.send')}</Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, ...centeredContent },
  segmented: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  segment: { flex: 1, borderWidth: 1, borderRadius: 8, padding: 12, alignItems: 'center' },
  textarea: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
    fontSize: 15,
    minHeight: 120,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  button: { borderRadius: 10, padding: 14, alignItems: 'center' },
});
