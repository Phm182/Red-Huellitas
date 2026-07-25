import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { reportesApi } from '../api/reportesApi';
import { useTheme } from '../theme/ThemeProvider';

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
      setEnviado(true);
      setTimeout(cerrar, 900);
    } else {
      setError(res.message);
    }
  };

  return (
    <>
      <Pressable onPress={() => setVisible(true)}>
        <Text style={{ color: colors.danger, fontSize: 13 }}>{t('report.denounceUser')}</Text>
      </Pressable>

      <Modal visible={visible} transparent animationType="fade" onRequestClose={cerrar}>
        <View style={styles.overlay}>
          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            {enviado ? (
              <Text style={{ color: colors.success, fontWeight: '600' }}>{t('report.denounceSubmitted')}</Text>
            ) : (
              <>
                <Text style={{ color: colors.text, fontWeight: '700', marginBottom: 10 }}>
                  {t('report.denounceUser')}
                </Text>
                <TextInput
                  style={[styles.input, { borderColor: colors.border, color: colors.text }]}
                  placeholder={t('report.denounceReasonPlaceholder')}
                  placeholderTextColor={colors.textMuted}
                  value={motivo}
                  onChangeText={setMotivo}
                />
                {error ? <Text style={{ color: colors.danger, marginBottom: 8 }}>{error}</Text> : null}
                <View style={styles.actions}>
                  <Pressable onPress={cerrar} style={styles.actionButton}>
                    <Text style={{ color: colors.textMuted }}>{t('common.cancel')}</Text>
                  </Pressable>
                  <Pressable onPress={onEnviar} style={styles.actionButton} disabled={!motivo.trim() || submitting}>
                    {submitting ? (
                      <ActivityIndicator color={colors.danger} />
                    ) : (
                      <Text style={{ color: colors.danger, fontWeight: '600' }}>{t('common.send')}</Text>
                    )}
                  </Pressable>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' },
  card: { width: '85%', maxWidth: 360, borderRadius: 12, padding: 20 },
  input: { borderWidth: 1, borderRadius: 8, padding: 10, marginBottom: 10 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 16 },
  actionButton: { padding: 8 },
});
