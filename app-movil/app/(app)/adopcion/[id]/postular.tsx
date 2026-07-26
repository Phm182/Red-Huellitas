import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { adopcionApi } from '../../../../src/api/adopcionApi';
import { perfilApi } from '../../../../src/api/perfilApi';
import { PreguntaRespuestaField } from '../../../../src/components/PreguntaRespuestaField';
import { Adopcion, RespuestaBorrador, VerificacionEstado } from '../../../../src/types';
import { centeredContent } from '../../../../src/theme/layout';
import { useTheme } from '../../../../src/theme/ThemeProvider';
import { SkeletonList } from '../../../../src/components/ui/Skeleton';

export default function PostularAdopcionScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [verificacion, setVerificacion] = useState<VerificacionEstado | null>(null);
  const [adopcion, setAdopcion] = useState<Adopcion | null>(null);
  const [respuestas, setRespuestas] = useState<Record<number, RespuestaBorrador>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let activo = true;
      setLoading(true);
      Promise.all([adopcionApi.obtener(Number(id)), perfilApi.estadoVerificacion()]).then(([resAdopcion, resVerif]) => {
        if (!activo) return;
        if (resAdopcion.success && resAdopcion.data) {
          setAdopcion(resAdopcion.data.adopcion);
        }
        if (resVerif.success && resVerif.data) {
          setVerificacion(resVerif.data);
        }
        setLoading(false);
      });
      return () => {
        activo = false;
      };
    }, [id])
  );

  const actualizarRespuesta = (preguntaId: number, respuesta: RespuestaBorrador) => {
    setRespuestas((prev) => ({ ...prev, [preguntaId]: respuesta }));
  };

  const preguntas = adopcion?.preguntas ?? [];
  const puedeEnviar = preguntas.every((p) => {
    const r = respuestas[p.adopcionPreguntaId];
    if (!r) return false;
    return p.tipo === 'opcion_multiple' ? r.opcionId !== undefined : !!r.texto?.trim();
  });

  const onEnviar = async () => {
    if (!adopcion || !puedeEnviar) return;
    setError(null);
    setSubmitting(true);
    const res = await adopcionApi.postular(adopcion.adopcionId, Object.values(respuestas));
    setSubmitting(false);
    if (res.success) {
      router.replace('/(app)/adopcion/mis-postulaciones');
    } else {
      setError(res.message);
    }
  };

  if (loading || !adopcion) {
    return <SkeletonList />;
  }

  if (verificacion?.estadoRevision !== 'aprobado') {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background, padding: 32 }]}>
        <Text style={[styles.gateTitle, { color: colors.text }]}>{t('feed.verificationRequiredTitle')}</Text>
        <Text style={{ color: colors.textMuted, textAlign: 'center', marginTop: 8, marginBottom: 24 }}>
          {t('feed.verificationRequiredBody')}
        </Text>
        <Pressable
          style={[styles.button, { backgroundColor: colors.primary }]}
          onPress={() => router.push('/(app)/ajustes/verificacion-estado')}
        >
          <Text style={{ color: colors.primaryText, fontWeight: '600' }}>{t('feed.goToVerification')}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={[styles.container, { backgroundColor: colors.background }, centeredContent]}>
      <Text style={[styles.titulo, { color: colors.text }]}>
        {t('adopcion.postularA', { nombre: adopcion.nombre })}
      </Text>

      {preguntas.map((pregunta) => (
        <PreguntaRespuestaField
          key={pregunta.adopcionPreguntaId}
          pregunta={pregunta}
          respuesta={respuestas[pregunta.adopcionPreguntaId] ?? { preguntaId: pregunta.adopcionPreguntaId }}
          onChange={(r) => actualizarRespuesta(pregunta.adopcionPreguntaId, r)}
        />
      ))}

      {error ? <Text style={{ color: colors.danger, marginBottom: 12 }}>{error}</Text> : null}

      <Pressable
        style={[styles.button, { backgroundColor: puedeEnviar ? colors.primary : colors.border }]}
        onPress={onEnviar}
        disabled={!puedeEnviar || submitting}
      >
        {submitting ? (
          <ActivityIndicator color={colors.primaryText} />
        ) : (
          <Text style={{ color: colors.primaryText, fontWeight: '600' }}>{t('adopcion.enviarPostulacion')}</Text>
        )}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  gateTitle: { fontSize: 18, fontWeight: '700', textAlign: 'center' },
  container: { flexGrow: 1, padding: 24 },
  titulo: { fontSize: 18, fontWeight: '700', marginBottom: 20 },
  button: { borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 8 },
});
