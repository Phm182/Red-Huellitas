import { Ionicons } from '@expo/vector-icons';
import { router, usePathname } from 'expo-router';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';
import { reportesApi } from '../api/reportesApi';
import { ReporteTipo } from '../types';
import { radii } from '../theme/elevation';
import { centeredContent } from '../theme/layout';
import { type } from '../theme/typography';
import { useTheme } from '../theme/ThemeProvider';
import { hapticError, hapticExito } from '../utils/haptics';
import { AppButton } from './AppButton';
import { AppInput } from './AppInput';
import { ChipRow, ChipOption } from './ui/ChipRow';

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
      hapticExito();
      setEnviado(true);
      setTimeout(() => router.back(), 1100);
    } else {
      hapticError();
      setError(res.message);
    }
  };

  if (enviado) {
    return (
      <View style={[styles.container, styles.centrado, { backgroundColor: colors.background }]}>
        <Animated.View entering={ZoomIn.springify().damping(14)} style={styles.exito}>
          <View style={[styles.exitoIcono, { backgroundColor: colors.accentSoft }]}>
            <Ionicons name="checkmark" size={34} color={colors.success} />
          </View>
          <Text style={[type.titleSm, { color: colors.text, textAlign: 'center' }]}>
            {t('report.submitted')}
          </Text>
        </Animated.View>
      </View>
    );
  }

  const opciones: ChipOption<ReporteTipo>[] = [
    { valor: 'mejora', label: t('report.typeImprovement'), icon: 'bulb-outline' },
    { valor: 'falla', label: t('report.typeBug'), icon: 'bug-outline' },
  ];

  return (
    <Animated.View
      entering={FadeInDown.duration(280)}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <ChipRow
        opciones={opciones}
        seleccionado={tipo}
        onSelect={setTipo}
        scrollable={false}
        style={{ marginBottom: 16 }}
      />

      <AppInput
        placeholder={t('report.detailPlaceholder')}
        value={detalle}
        onChangeText={setDetalle}
        multiline
        numberOfLines={5}
        style={styles.textarea}
      />

      {error ? (
        <Text style={[type.bodySm, { color: colors.danger, marginBottom: 12 }]}>{error}</Text>
      ) : null}

      <AppButton
        label={t('common.send')}
        onPress={onEnviar}
        loading={submitting}
        disabled={!detalle.trim()}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, ...centeredContent },
  centrado: { alignItems: 'center', justifyContent: 'center' },
  textarea: { minHeight: 130, textAlignVertical: 'top' },
  exito: { alignItems: 'center', gap: 16 },
  exitoIcono: {
    width: 72,
    height: 72,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
