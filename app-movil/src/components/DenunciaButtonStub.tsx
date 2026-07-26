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

interface DenunciaButtonStubProps {
  userId: number;
  /** Si se denuncia desde una publicación puntual, queda asociada en Denuncia.PostId. */
  postId?: number;
  /** Si se denuncia desde un listado de adopción, queda asociada en Denuncia.AdopcionId. */
  adopcionId?: number;
  /** Si se denuncia desde una campaña, queda asociada en Denuncia.CampaniaId. */
  campaniaId?: number;
  /** Si se denuncia desde un reporte de perdido/encontrado, queda asociada en Denuncia.PerdidoId. */
  perdidoId?: number;
  /** Si se denuncia desde una publicación de tránsito, queda asociada en Denuncia.TransitoId. */
  transitoId?: number;
  /** Si se denuncia desde una publicación de donación, queda asociada en Denuncia.DonacionId. */
  donacionId?: number;
  /** Si se denuncia desde una veterinaria, queda asociada en Denuncia.VeterinariaId. */
  veterinariaId?: number;
  /** Si se denuncia desde una publicación de producto/servicio, queda asociada en Denuncia.ProductoId. */
  productoId?: number;
}

/**
 * Botón de denuncia genérico y reusable — apunta a un usuario y, opcionalmente,
 * a un contenido puntual (Post, Historia, Adopcion, Campania, etc).
 */
export function DenunciaButtonStub({
  userId,
  postId,
  adopcionId,
  campaniaId,
  perdidoId,
  transitoId,
  donacionId,
  veterinariaId,
  productoId,
}: DenunciaButtonStubProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const [visible, setVisible] = useState(false);
  const [motivo, setMotivo] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cerrar = () => {
    setVisible(false);
    setMotivo('');
    setEnviado(false);
    setError(null);
  };

  const onEnviar = async () => {
    if (!motivo.trim()) return;
    setSubmitting(true);
    setError(null);
    const res = await reportesApi.crearDenuncia(
      userId,
      motivo.trim(),
      undefined,
      postId,
      adopcionId,
      campaniaId,
      perdidoId,
      transitoId,
      donacionId,
      veterinariaId,
      productoId
    );
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

  return (
    <>
      <Pressable onPress={() => setVisible(true)} style={styles.trigger} hitSlop={8}>
        <Ionicons name="flag-outline" size={15} color={colors.danger} />
        <Text style={[type.label, { color: colors.danger }]}>{t('report.denounceUser')}</Text>
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
                  </View>
                ) : (
                  <>
                    <View style={styles.encabezado}>
                      <View style={[styles.encabezadoIcono, { backgroundColor: colors.primarySoft }]}>
                        <Ionicons name="flag" size={18} color={colors.danger} />
                      </View>
                      <Text style={[type.titleSm, { color: colors.text, flex: 1 }]}>
                        {t('report.denounceUser')}
                      </Text>
                    </View>

                    <AppInput
                      placeholder={t('report.denounceReasonPlaceholder')}
                      value={motivo}
                      onChangeText={setMotivo}
                      multiline
                      style={{ minHeight: 88, textAlignVertical: 'top' }}
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
                        disabled={!motivo.trim()}
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
  overlayWrap: { flex: 1 },
  overlay: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  cardWrap: { width: '100%', maxWidth: 380 },
  card: { borderRadius: radii.lg, borderWidth: 1, padding: 20 },
  encabezado: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  encabezadoIcono: {
    width: 36,
    height: 36,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acciones: { flexDirection: 'row', gap: 10, marginTop: 4 },
  exito: { alignItems: 'center', paddingVertical: 12, gap: 12 },
  exitoIcono: {
    width: 56,
    height: 56,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
