import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { reportesApi } from '../api/reportesApi';
import { elevation, radii } from '../theme/elevation';
import { type } from '../theme/typography';
import { useTheme } from '../theme/ThemeProvider';
import { hapticError, hapticExito } from '../utils/haptics';
import { AppButton } from './AppButton';
import { AppInput } from './AppInput';

/** Motivos curados — el primero es el que más importa en una red animal. */
export const DENUNCIA_MOTIVOS = [
  'no_contenido_animal',
  'criadero_ilegal',
  'maltrato',
  'spam',
  'contenido_inapropiado',
  'otro',
] as const;

export type DenunciaMotivoKey = (typeof DENUNCIA_MOTIVOS)[number];

interface DenunciaButtonStubProps {
  userId: number;
  postId?: number;
  historiaId?: number;
  adopcionId?: number;
  campaniaId?: number;
  perdidoId?: number;
  transitoId?: number;
  donacionId?: number;
  veterinariaId?: number;
  productoId?: number;
  comentarioId?: number;
  /** Compacto: sólo el ícono (p. ej. en el visor de historias). */
  compacto?: boolean;
}

/**
 * Botón de denuncia genérico — apunta a un usuario y, opcionalmente,
 * a un contenido puntual (Post, Historia, Adopción, etc).
 */
export function DenunciaButtonStub({
  userId,
  postId,
  historiaId,
  adopcionId,
  campaniaId,
  perdidoId,
  transitoId,
  donacionId,
  veterinariaId,
  productoId,
  comentarioId,
  compacto = false,
}: DenunciaButtonStubProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const [visible, setVisible] = useState(false);
  const [motivoKey, setMotivoKey] = useState<DenunciaMotivoKey>('no_contenido_animal');
  const [detalle, setDetalle] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hayContenido = !!(
    postId ||
    historiaId ||
    adopcionId ||
    campaniaId ||
    perdidoId ||
    transitoId ||
    donacionId ||
    veterinariaId ||
    productoId ||
    comentarioId
  );

  const cerrar = () => {
    setVisible(false);
    setMotivoKey('no_contenido_animal');
    setDetalle('');
    setEnviado(false);
    setError(null);
  };

  const onEnviar = async () => {
    if (motivoKey === 'otro' && !detalle.trim()) return;
    setSubmitting(true);
    setError(null);

    const motivoLabel = t(`report.motivos.${motivoKey}`);
    const res = await reportesApi.crearDenuncia({
      userIdDenunciado: userId,
      motivo: motivoLabel,
      detalle: detalle.trim() || undefined,
      postId,
      historiaId,
      adopcionId,
      campaniaId,
      perdidoId,
      transitoId,
      donacionId,
      veterinariaId,
      productoId,
      comentarioId,
    });
    setSubmitting(false);
    if (res.success) {
      hapticExito();
      setEnviado(true);
      setTimeout(cerrar, 1100);
    } else {
      hapticError();
      setError(res.message);
    }
  };

  const puedeEnviar = motivoKey !== 'otro' || detalle.trim().length > 0;

  return (
    <>
      <Pressable
        onPress={() => setVisible(true)}
        style={compacto ? styles.triggerCompacto : styles.trigger}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={t('report.denounceContent')}
      >
        <Ionicons name="flag-outline" size={compacto ? 20 : 15} color={compacto ? '#fff' : colors.danger} />
        {compacto ? null : (
          <Text style={[type.label, { color: colors.danger }]}>
            {hayContenido ? t('report.denounceContent') : t('report.denounceUser')}
          </Text>
        )}
      </Pressable>

      <Modal visible={visible} transparent animationType="none" onRequestClose={cerrar}>
        <Animated.View entering={FadeIn.duration(160)} style={styles.overlayWrap}>
          <Pressable style={[styles.overlay, { backgroundColor: colors.overlay }]} onPress={cerrar}>
            <Pressable onPress={() => {}} style={styles.cardWrap}>
              <Animated.View
                entering={FadeInDown.springify().damping(18)}
                style={[
                  styles.card,
                  elevation.lg,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
              >
                {enviado ? (
                  <View style={styles.exito}>
                    <View style={[styles.exitoIcono, { backgroundColor: colors.accentSoft }]}>
                      <Ionicons name="checkmark" size={28} color={colors.success} />
                    </View>
                    <Text style={[type.titleSm, { color: colors.text, textAlign: 'center' }]}>
                      {t('report.denounceSubmitted')}
                    </Text>
                    <Text style={[type.bodySm, { color: colors.textMuted, textAlign: 'center' }]}>
                      {t('report.denouncePendingReview')}
                    </Text>
                  </View>
                ) : (
                  <>
                    <View style={styles.encabezado}>
                      <View style={[styles.encabezadoIcono, { backgroundColor: colors.primarySoft }]}>
                        <Ionicons name="flag" size={18} color={colors.danger} />
                      </View>
                      <Text style={[type.titleSm, { color: colors.text, flex: 1 }]}>
                        {hayContenido ? t('report.denounceContent') : t('report.denounceUser')}
                      </Text>
                    </View>

                    <Text style={[type.bodySm, { color: colors.textMuted, marginBottom: 10 }]}>
                      {t('report.denounceHint')}
                    </Text>

                    <View style={styles.motivos}>
                      {DENUNCIA_MOTIVOS.map((key) => {
                        const activo = motivoKey === key;
                        return (
                          <Pressable
                            key={key}
                            onPress={() => setMotivoKey(key)}
                            style={[
                              styles.motivoChip,
                              {
                                borderColor: activo ? colors.danger : colors.border,
                                backgroundColor: activo ? colors.danger : 'transparent',
                              },
                            ]}
                          >
                            <Text
                              style={{
                                color: activo ? '#fff' : colors.text,
                                fontWeight: '600',
                                fontSize: 13,
                              }}
                            >
                              {t(`report.motivos.${key}`)}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>

                    <AppInput
                      placeholder={
                        motivoKey === 'otro'
                          ? t('report.denounceReasonPlaceholder')
                          : t('report.denounceDetailOptional')
                      }
                      value={detalle}
                      onChangeText={setDetalle}
                      multiline
                      style={{ minHeight: 72, textAlignVertical: 'top', marginTop: 10 }}
                    />

                    {error ? (
                      <Text style={[type.bodySm, { color: colors.danger, marginBottom: 8 }]}>{error}</Text>
                    ) : null}

                    <View style={styles.acciones}>
                      <AppButton
                        label={t('common.cancel')}
                        variant="secondary"
                        onPress={cerrar}
                        style={{ flex: 1 }}
                      />
                      <AppButton
                        label={t('common.send')}
                        variant="danger"
                        onPress={onEnviar}
                        loading={submitting}
                        disabled={!puedeEnviar}
                        style={{ flex: 1 }}
                      />
                    </View>
                  </>
                )}
              </Animated.View>
            </Pressable>
          </Pressable>
        </Animated.View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  triggerCompacto: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  overlayWrap: { flex: 1 },
  overlay: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  cardWrap: { width: '100%', maxWidth: 400 },
  card: { borderRadius: radii.lg, borderWidth: 1, padding: 20 },
  encabezado: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  encabezadoIcono: {
    width: 36,
    height: 36,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  motivos: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  motivoChip: {
    borderWidth: 1,
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  acciones: { flexDirection: 'row', gap: 10, marginTop: 8 },
  exito: { alignItems: 'center', paddingVertical: 12, gap: 10 },
  exitoIcono: {
    width: 56,
    height: 56,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
