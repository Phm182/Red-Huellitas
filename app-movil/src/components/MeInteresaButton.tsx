import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { elevation, radii } from '../theme/elevation';
import { type } from '../theme/typography';
import { useTheme } from '../theme/ThemeProvider';
import { hapticError, hapticExito } from '../utils/haptics';
import { ApiResponse } from '../types';
import { AppButton } from './AppButton';
import { AppInput } from './AppInput';

type Props = {
  /** Namespace de traducción: `transito` o `donaciones`. */
  ns: 'transito' | 'donaciones';
  onEnviar: (mensaje?: string) => Promise<ApiResponse<unknown>>;
};

/**
 * "Me interesa" -- levantar la mano con un mensaje opcional de una línea,
 * sin el cuestionario que tiene Adopción. Molde del modal de
 * DenunciaButtonStub, con un solo campo en vez de motivos+detalle.
 */
export function MeInteresaButton({ ns, onEnviar }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const [visible, setVisible] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cerrar = () => {
    setVisible(false);
    setMensaje('');
    setEnviado(false);
    setError(null);
  };

  const enviar = async () => {
    setSubmitting(true);
    setError(null);
    const res = await onEnviar(mensaje.trim() || undefined);
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
      <Pressable
        onPress={() => setVisible(true)}
        style={[styles.trigger, { backgroundColor: colors.primary }]}
      >
        <Ionicons name="hand-left-outline" size={17} color={colors.primaryText} />
        <Text style={{ color: colors.primaryText, fontWeight: '600' }}>{t(`${ns}.meInteresa`)}</Text>
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
                      {t(`${ns}.interesRegistrado`)}
                    </Text>
                  </View>
                ) : (
                  <>
                    <View style={styles.encabezado}>
                      <View style={[styles.encabezadoIcono, { backgroundColor: colors.primarySoft }]}>
                        <Ionicons name="hand-left" size={18} color={colors.primary} />
                      </View>
                      <Text style={[type.titleSm, { color: colors.text, flex: 1 }]}>
                        {t(`${ns}.meInteresa`)}
                      </Text>
                    </View>

                    <AppInput
                      placeholder={t(`${ns}.meInteresaMensajePlaceholder`)}
                      value={mensaje}
                      onChangeText={setMensaje}
                      multiline
                      style={{ minHeight: 64, textAlignVertical: 'top' }}
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
                        label={t(`${ns}.meInteresaEnviar`)}
                        onPress={enviar}
                        loading={submitting}
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
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: radii.md,
    paddingVertical: 12,
    marginBottom: 12,
  },
  overlayWrap: { flex: 1 },
  overlay: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  cardWrap: { width: '100%', maxWidth: 400 },
  card: { borderRadius: radii.lg, borderWidth: 1, padding: 20 },
  encabezado: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  encabezadoIcono: {
    width: 36,
    height: 36,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
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
