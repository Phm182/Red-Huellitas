import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { campaniaApi } from '../../../../src/api/campaniaApi';
import { AppInput } from '../../../../src/components/AppInput';
import { SkeletonList } from '../../../../src/components/ui/Skeleton';
import type { Campania, RespuestaCampania } from '../../../../src/types';
import { centeredContent } from '../../../../src/theme/layout';
import { useTheme } from '../../../../src/theme/ThemeProvider';

/**
 * Formulario de inscripción a una campaña.
 *
 * Pantalla aparte y no un modal dentro del detalle: el formulario lo arma quien
 * organiza y puede tener quince preguntas, así que necesita scroll propio y
 * poder volver atrás sin perder lo escrito de la pantalla anterior.
 *
 * Si la campaña no tiene preguntas, esta pantalla ni se abre — el detalle
 * inscribe directo.
 */
export default function InscribirmeCampaniaScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const campaniaId = Number(id);

  const [campania, setCampania] = useState<Campania | null>(null);
  const [loading, setLoading] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** Respuestas por preguntaId. El texto y la opción no conviven. */
  const [respuestas, setRespuestas] = useState<Record<number, { texto?: string; opcionId?: number }>>({});

  useFocusEffect(
    useCallback(() => {
      let activo = true;
      setLoading(true);
      campaniaApi.obtener(campaniaId).then((res) => {
        if (!activo) return;
        if (res.success && res.data) setCampania(res.data.campania);
        else setError(res.message);
        setLoading(false);
      });
      return () => {
        activo = false;
      };
    }, [campaniaId])
  );

  if (loading) return <SkeletonList />;
  if (!campania) {
    return (
      <View style={[styles.centrado, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.danger }}>{error ?? t('common.error')}</Text>
      </View>
    );
  }

  const preguntas = campania.preguntas ?? [];

  const faltantes = preguntas.filter((p) => {
    if (!p.obligatoria) return false;
    const r = respuestas[p.campaniaPreguntaId];
    return !r || (!r.texto?.trim() && !r.opcionId);
  });

  const onEnviar = async () => {
    if (faltantes.length > 0 || enviando) return;
    setEnviando(true);
    setError(null);

    const payload: RespuestaCampania[] = Object.entries(respuestas)
      .map(([preguntaId, r]) => ({
        campaniaPreguntaId: Number(preguntaId),
        ...(r.opcionId ? { campaniaPreguntaOpcionId: r.opcionId } : {}),
        ...(r.texto?.trim() ? { texto: r.texto.trim() } : {}),
      }))
      .filter((r) => r.texto || r.campaniaPreguntaOpcionId);

    const res = await campaniaApi.inscribirme(campaniaId, payload);
    setEnviando(false);

    if (!res.success) {
      setError(res.message);
      return;
    }
    // El backend responde distinto según si entró o quedó esperando; el
    // mensaje que manda ya lo explica, así que se muestra tal cual.
    router.replace({
      pathname: '/(app)/campanias/[id]',
      params: { id: campaniaId, aviso: res.message },
    });
  };

  return (
    <ScrollView contentContainerStyle={[styles.wrap, centeredContent, { backgroundColor: colors.background }]}>
      <Text style={[styles.titulo, { color: colors.text }]}>{campania.titulo}</Text>

      {campania.mensajeAviso ? (
        <View style={[styles.aviso, { backgroundColor: colors.accentSoft, borderColor: colors.border }]}>
          <Ionicons name="information-circle" size={18} color={colors.primary} />
          <Text style={{ color: colors.text, flex: 1, lineHeight: 20 }}>{campania.mensajeAviso}</Text>
        </View>
      ) : null}

      {campania.cupoDisponible === 0 ? (
        <View style={[styles.aviso, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="hourglass-outline" size={18} color={colors.textMuted} />
          <Text style={{ color: colors.textMuted, flex: 1, lineHeight: 20 }}>
            {t('campanias.avisoListaEspera')}
          </Text>
        </View>
      ) : null}

      {preguntas.map((p) => {
        const r = respuestas[p.campaniaPreguntaId] ?? {};
        return (
          <View key={p.campaniaPreguntaId} style={{ marginTop: 16 }}>
            <Text style={[styles.pregunta, { color: colors.text }]}>
              {p.texto}
              {p.obligatoria ? <Text style={{ color: colors.danger }}> *</Text> : null}
            </Text>

            {p.tipo === 'texto' ? (
              <AppInput
                value={r.texto ?? ''}
                onChangeText={(v) =>
                  setRespuestas((prev) => ({ ...prev, [p.campaniaPreguntaId]: { texto: v } }))
                }
                multiline
                style={{ minHeight: 60 }}
              />
            ) : null}

            {p.tipo === 'si_no' ? (
              <View style={styles.fila}>
                {[t('common.yes'), t('common.no')].map((label) => {
                  const activo = r.texto === label;
                  return (
                    <Pressable
                      key={label}
                      onPress={() =>
                        setRespuestas((prev) => ({ ...prev, [p.campaniaPreguntaId]: { texto: label } }))
                      }
                      style={[
                        styles.opcion,
                        {
                          borderColor: colors.primary,
                          backgroundColor: activo ? colors.primary : 'transparent',
                        },
                      ]}
                    >
                      <Text style={{ color: activo ? colors.primaryText : colors.primary, fontWeight: '600' }}>
                        {label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : null}

            {p.tipo === 'opcion_multiple'
              ? p.opciones.map((o) => {
                  const activo = r.opcionId === o.campaniaPreguntaOpcionId;
                  return (
                    <Pressable
                      key={o.campaniaPreguntaOpcionId}
                      onPress={() =>
                        setRespuestas((prev) => ({
                          ...prev,
                          [p.campaniaPreguntaId]: { opcionId: o.campaniaPreguntaOpcionId },
                        }))
                      }
                      style={[
                        styles.opcionLarga,
                        {
                          borderColor: activo ? colors.primary : colors.border,
                          backgroundColor: activo ? colors.primarySoft : 'transparent',
                        },
                      ]}
                    >
                      <Ionicons
                        name={activo ? 'radio-button-on' : 'radio-button-off'}
                        size={18}
                        color={activo ? colors.primary : colors.textMuted}
                      />
                      <Text style={{ color: colors.text }}>{o.texto}</Text>
                    </Pressable>
                  );
                })
              : null}
          </View>
        );
      })}

      {error ? <Text style={{ color: colors.danger, marginTop: 14 }}>{error}</Text> : null}

      <Pressable
        onPress={onEnviar}
        disabled={faltantes.length > 0 || enviando}
        style={[
          styles.boton,
          { backgroundColor: faltantes.length > 0 ? colors.border : colors.primary },
        ]}
      >
        {enviando ? (
          <ActivityIndicator color={colors.primaryText} />
        ) : (
          <Text style={{ color: colors.primaryText, fontWeight: '700' }}>
            {t('campanias.confirmarInscripcion')}
          </Text>
        )}
      </Pressable>

      {faltantes.length > 0 ? (
        <Text style={{ color: colors.textMuted, fontSize: 12, textAlign: 'center', marginTop: 8 }}>
          {t('campanias.faltanRespuestas', { cantidad: faltantes.length })}
        </Text>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 20, paddingBottom: 40 },
  centrado: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  titulo: { fontSize: 20, fontWeight: '700', marginBottom: 12 },
  aviso: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    padding: 12,
    marginBottom: 4,
  },
  pregunta: { fontSize: 15, fontWeight: '600', marginBottom: 8 },
  fila: { flexDirection: 'row', gap: 8 },
  opcion: { flex: 1, borderWidth: 1, borderRadius: 10, padding: 12, alignItems: 'center' },
  opcionLarga: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  boton: { borderRadius: 12, padding: 15, alignItems: 'center', marginTop: 24 },
});
