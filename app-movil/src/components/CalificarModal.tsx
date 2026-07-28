import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { AppInput } from './AppInput';
import { Estrellas } from './Estrellas';
import { calificacionesApi } from '../api/equiposApi';
import { radii } from '../theme/elevation';
import { fonts } from '../theme/typography';
import { useTheme } from '../theme/ThemeProvider';
import { hapticLeve } from '../utils/haptics';

type Props = {
  visible: boolean;
  onClose: () => void;
  campaniaId: number;
  paraTipo: 'usuario' | 'equipo';
  paraId: number;
  /** A quién estoy calificando, para que el modal lo diga. */
  nombre: string;
  /** Puntaje y comentario previos: calificar de nuevo corrige, no duplica. */
  puntajeInicial?: number;
  comentarioInicial?: string;
  onListo?: () => void;
};

/**
 * Estrellas + comentario, en una hoja.
 *
 * Sirve para los dos sentidos —el participante calificando al organizador y
 * el organizador calificando a cada participante— porque lo único que cambia
 * es a quién apunta.
 *
 * Se puede volver a abrir sobre una calificación ya dejada: el backend hace
 * upsert, así que corregirse es editar la propia nota y no sumar otra.
 */
export function CalificarModal({
  visible,
  onClose,
  campaniaId,
  paraTipo,
  paraId,
  nombre,
  puntajeInicial = 0,
  comentarioInicial = '',
  onListo,
}: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const [puntaje, setPuntaje] = useState(puntajeInicial);
  const [comentario, setComentario] = useState(comentarioInicial);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const enviar = async () => {
    if (puntaje < 1) return;
    hapticLeve();
    setEnviando(true);
    setError(null);

    const res = await calificacionesApi.calificar({
      campaniaId,
      paraTipo,
      paraId,
      puntaje,
      comentario: comentario.trim() || undefined,
    });
    setEnviando(false);

    if (!res.success) {
      setError(res.message);
      return;
    }
    onListo?.();
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.fondo} onPress={onClose}>
        <Pressable
          style={[styles.hoja, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={(e) => e.stopPropagation()}
        >
          <Text style={[styles.titulo, { color: colors.text }]}>
            {t('calificaciones.calificarA', { nombre })}
          </Text>

          <View style={styles.estrellas}>
            <Estrellas valor={puntaje} size={34} onChange={setPuntaje} />
          </View>

          <AppInput
            value={comentario}
            onChangeText={setComentario}
            placeholder={t('calificaciones.comentarioPlaceholder')}
            multiline
            style={{ minHeight: 88, textAlignVertical: 'top' }}
          />

          {error ? <Text style={{ color: colors.danger, marginTop: 8 }}>{error}</Text> : null}

          <View style={styles.acciones}>
            <Pressable onPress={onClose} style={styles.botonTexto}>
              <Text style={{ color: colors.textMuted, fontWeight: '600' }}>
                {t('common.cancel')}
              </Text>
            </Pressable>

            <Pressable
              onPress={enviar}
              disabled={puntaje < 1 || enviando}
              style={[
                styles.enviar,
                { backgroundColor: puntaje >= 1 ? colors.primary : colors.border },
              ]}
            >
              {enviando ? (
                <ActivityIndicator color={colors.primaryText} />
              ) : (
                <Text style={{ color: colors.primaryText, fontWeight: '700' }}>
                  {t('common.send')}
                </Text>
              )}
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fondo: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 22,
  },
  hoja: { width: '100%', maxWidth: 420, borderWidth: 1, borderRadius: radii.xl, padding: 18 },
  titulo: { fontFamily: fonts.bodySemi, fontSize: 17, marginBottom: 14 },
  estrellas: { alignItems: 'center', marginBottom: 16 },
  acciones: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 10, marginTop: 16 },
  botonTexto: { paddingVertical: 10, paddingHorizontal: 12 },
  enviar: { borderRadius: radii.lg, paddingVertical: 11, paddingHorizontal: 22, minWidth: 96, alignItems: 'center' },
});
