import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { campaniaApi } from '../../../../src/api/campaniaApi';
import { calificacionesApi } from '../../../../src/api/equiposApi';
import { CalificarModal } from '../../../../src/components/CalificarModal';
import { Estrellas, ReputacionLinea } from '../../../../src/components/Estrellas';
import { SkeletonList } from '../../../../src/components/ui/Skeleton';
import type { CampaniaInscripcionAdmin, CampaniaPanel, EstadoInscripcion } from '../../../../src/types';
import { centeredContent } from '../../../../src/theme/layout';
import { useTheme } from '../../../../src/theme/ThemeProvider';
import { hapticLeve } from '../../../../src/utils/haptics';

/** Color y etiqueta de cada estado. Se usa igual en el resumen y en la lista. */
const ESTADOS: Record<EstadoInscripcion, { color: string; labelKey: string; icono: string }> = {
  confirmada: { color: '#06D6A0', labelKey: 'campanias.estadoConfirmada', icono: 'checkmark-circle' },
  lista_espera: { color: '#FF9F1C', labelKey: 'campanias.estadoListaEspera', icono: 'hourglass' },
  ausente: { color: '#4CC9F0', labelKey: 'campanias.estadoAusente', icono: 'alert-circle' },
  cancelada: { color: '#94A3B8', labelKey: 'campanias.estadoCancelada', icono: 'close-circle' },
};

/**
 * Panel de la campaña, para quien la organiza.
 *
 * Todo sale de un solo endpoint: cinco llamadas en paralelo sobre las mismas
 * tablas sólo agregarían latencia y estados intermedios raros mientras se
 * dibuja.
 */
export default function AdministrarCampaniaScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const campaniaId = Number(id);

  const [panel, setPanel] = useState<CampaniaPanel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bajando, setBajando] = useState<number | null>(null);
  const [calificando, setCalificando] = useState<CampaniaInscripcionAdmin | null>(null);

  /** Pasar lista. Se recarga entero porque cambia la reputación del inscripto. */
  const marcarAsistencia = async (ins: CampaniaInscripcionAdmin, valor: 'si' | 'no') => {
    hapticLeve();
    const res = await calificacionesApi.asistencia(campaniaId, { [ins.usuario.userId]: valor });
    if (!res.success) setError(res.message);
    cargar();
  };

  const cargar = useCallback(async () => {
    const res = await campaniaApi.panel(campaniaId);
    if (res.success && res.data) setPanel(res.data);
    else setError(res.message);
    setLoading(false);
  }, [campaniaId]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      cargar();
    }, [cargar])
  );

  const darDeBaja = async (ins: CampaniaInscripcionAdmin) => {
    if (bajando !== null) return;
    setBajando(ins.campaniaInscripcionId);
    const res = await campaniaApi.darDeBaja(ins.campaniaInscripcionId);
    setBajando(null);
    // Se recarga entero en vez de tocar el estado local: una baja puede
    // ascender a otra persona, y adivinar ese efecto acá duplicaría la regla
    // que ya vive en el backend.
    if (res.success) await cargar();
    else setError(res.message);
  };

  if (loading) return <SkeletonList />;
  if (!panel) {
    return (
      <View style={[styles.centrado, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.danger }}>{error ?? t('common.error')}</Text>
      </View>
    );
  }

  const { resumen, campania, inscripciones } = panel;
  // Sin FechaHasta la campaña termina el mismo día que empieza. Misma regla
  // que rh_campania_termino() en el backend, que es quien decide de verdad.
  const termino = (campania.fechaHasta ?? campania.fechaDesde) < new Date().toISOString().slice(0, 10);
  const ocupacion =
    resumen.cupoMaximo !== null ? Math.min(1, resumen.confirmadas / resumen.cupoMaximo) : 0;

  return (
    <ScrollView contentContainerStyle={[styles.wrap, centeredContent, { backgroundColor: colors.background }]}>
      <Text style={[styles.titulo, { color: colors.text }]}>{campania.titulo}</Text>
      <Text style={{ color: colors.textMuted, marginBottom: 16 }}>
        {campania.fechaDesde}
        {campania.fechaHasta && campania.fechaHasta !== campania.fechaDesde ? ` → ${campania.fechaHasta}` : ''}
      </Text>

      {/* --- Ocupación --- */}
      <View style={[styles.tarjeta, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.filaEntre}>
          <Text style={[styles.tarjetaTitulo, { color: colors.text }]}>{t('campanias.ocupacion')}</Text>
          <Text style={{ color: colors.primary, fontWeight: '800', fontSize: 16 }}>
            {resumen.confirmadas}
            {resumen.cupoMaximo !== null ? ` / ${resumen.cupoMaximo}` : ` · ${t('campanias.cupoIlimitado')}`}
          </Text>
        </View>

        {resumen.cupoMaximo !== null ? (
          <View style={[styles.barra, { backgroundColor: colors.border }]}>
            <View
              style={[
                styles.barraLlena,
                { width: `${ocupacion * 100}%`, backgroundColor: ocupacion >= 1 ? '#FF9F1C' : '#06D6A0' },
              ]}
            />
          </View>
        ) : null}

        <View style={styles.chips}>
          {(['confirmada', 'lista_espera', 'ausente', 'cancelada'] as EstadoInscripcion[]).map((e) => {
            const cantidad =
              e === 'confirmada' ? resumen.confirmadas
              : e === 'lista_espera' ? resumen.listaEspera
              : e === 'ausente' ? resumen.ausentes
              : resumen.canceladas;
            return (
              <View key={e} style={[styles.chip, { borderColor: ESTADOS[e].color }]}>
                <Text style={{ color: ESTADOS[e].color, fontWeight: '700', fontSize: 12 }}>
                  {cantidad} {t(ESTADOS[e].labelKey)}
                </Text>
              </View>
            );
          })}
        </View>
      </View>

      {campania.mensajeAviso ? (
        <View style={[styles.tarjeta, { backgroundColor: colors.accentSoft, borderColor: colors.border }]}>
          <Text style={[styles.tarjetaTitulo, { color: colors.textMuted }]}>{t('campanias.mensajeAviso')}</Text>
          <Text style={{ color: colors.text, lineHeight: 20 }}>{campania.mensajeAviso}</Text>
        </View>
      ) : null}

      {/* --- Gente --- */}
      <Text style={[styles.seccion, { color: colors.text }]}>{t('campanias.inscriptos')}</Text>

      {inscripciones.length === 0 ? (
        <Text style={{ color: colors.textMuted }}>{t('campanias.sinInscriptos')}</Text>
      ) : null}

      {inscripciones.map((ins) => {
        const meta = ESTADOS[ins.estado];
        const activa = ins.estado === 'confirmada' || ins.estado === 'lista_espera';
        return (
          <View
            key={ins.campaniaInscripcionId}
            style={[styles.persona, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <View style={styles.filaEntre}>
              <View style={{ flex: 1 }}>
                <View style={styles.filaEstado}>
                  <Ionicons name={meta.icono as never} size={14} color={meta.color} />
                  <Text style={{ color: meta.color, fontSize: 11, fontWeight: '800' }}>
                    {t(meta.labelKey).toUpperCase()}
                  </Text>
                  <Text style={{ color: colors.textMuted, fontSize: 11 }}>#{ins.posicion}</Text>
                </View>
                <Text style={{ color: colors.text, fontWeight: '700' }}>{ins.usuario.nombreCompleto}</Text>
                <Text style={{ color: colors.textMuted, fontSize: 12 }}>@{ins.usuario.username}</Text>
              </View>

              {ins.usuario.whatsappNumero ? (
                <Pressable
                  onPress={() =>
                    Linking.openURL(`https://wa.me/${ins.usuario.whatsappNumero!.replace(/\D/g, '')}`)
                  }
                  hitSlop={8}
                  style={styles.iconoBtn}
                >
                  <Ionicons name="logo-whatsapp" size={20} color="#25D366" />
                </Pressable>
              ) : null}
            </View>

            {ins.notaAusencia ? (
              <Text style={{ color: colors.textMuted, fontStyle: 'italic', marginTop: 6, fontSize: 13 }}>
                “{ins.notaAusencia}”
              </Text>
            ) : null}

            {ins.respuestas.length > 0 ? (
              <View style={[styles.respuestas, { borderTopColor: colors.border }]}>
                {ins.respuestas.map((r, i) => (
                  <View key={i} style={{ marginTop: 6 }}>
                    <Text style={{ color: colors.textMuted, fontSize: 11 }}>{r.pregunta}</Text>
                    <Text style={{ color: colors.text, fontSize: 14 }}>{r.respuesta ?? '—'}</Text>
                  </View>
                ))}
              </View>
            ) : null}

            {/* Reputación e historial: es lo que responde "¿este se anotó
                cinco veces y no vino ninguna?" antes de darle un cupo. */}
            <View style={styles.reputacionFila}>
              <ReputacionLinea
                reputacion={ins.reputacion}
                sinDatosLabel={t('equipos.sinCalificaciones')}
              />
              {ins.asistencias.faltasSinAviso > 0 ? (
                <View style={[styles.alerta, { borderColor: colors.danger }]}>
                  <Ionicons name="alert-circle" size={12} color={colors.danger} />
                  <Text style={{ color: colors.danger, fontSize: 11, fontWeight: '700' }}>
                    {t('calificaciones.faltasSinAviso', { count: ins.asistencias.faltasSinAviso })}
                  </Text>
                </View>
              ) : null}
            </View>

            {/* Pasar lista y calificar recién tienen sentido una vez que pasó. */}
            {termino && (ins.estado === 'confirmada' || ins.estado === 'ausente') ? (
              <View style={[styles.postCampania, { borderTopColor: colors.border }]}>
                <View style={styles.asistenciaFila}>
                  <Text style={{ color: colors.textMuted, fontSize: 12, flex: 1 }}>
                    {t('calificaciones.vino')}
                  </Text>
                  {(['si', 'no'] as const).map((v) => (
                    <Pressable
                      key={v}
                      onPress={() => marcarAsistencia(ins, v)}
                      style={[
                        styles.asistenciaBtn,
                        {
                          borderColor: ins.asistio === v ? colors.primary : colors.border,
                          backgroundColor: ins.asistio === v ? colors.primary : 'transparent',
                        },
                      ]}
                    >
                      <Text
                        style={{
                          color: ins.asistio === v ? colors.primaryText : colors.textMuted,
                          fontWeight: '700',
                          fontSize: 12,
                        }}
                      >
                        {v === 'si' ? t('common.yes') : t('common.no')}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                <Pressable onPress={() => setCalificando(ins)} style={styles.calificarLink}>
                  <Ionicons name="star-outline" size={14} color={colors.primary} />
                  <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '700' }}>
                    {ins.miCalificacion
                      ? t('calificaciones.editarCalificacion')
                      : t('calificaciones.calificar')}
                  </Text>
                  {ins.miCalificacion ? (
                    <Estrellas valor={ins.miCalificacion.puntaje} size={12} />
                  ) : null}
                </Pressable>
              </View>
            ) : null}

            {activa ? (
              <Pressable
                onPress={() => darDeBaja(ins)}
                disabled={bajando !== null}
                style={styles.bajaLink}
              >
                {bajando === ins.campaniaInscripcionId ? (
                  <ActivityIndicator size="small" color={colors.danger} />
                ) : (
                  <Text style={{ color: colors.danger, fontSize: 12 }}>{t('campanias.darDeBaja')}</Text>
                )}
              </Pressable>
            ) : null}
          </View>
        );
      })}

      {calificando ? (
        <CalificarModal
          visible
          onClose={() => setCalificando(null)}
          campaniaId={campania.campaniaId}
          paraTipo="usuario"
          paraId={calificando.usuario.userId}
          nombre={calificando.usuario.nombreCompleto}
          puntajeInicial={calificando.miCalificacion?.puntaje ?? 0}
          comentarioInicial={calificando.miCalificacion?.comentario ?? ''}
          onListo={cargar}
        />
      ) : null}

      {error ? <Text style={{ color: colors.danger, marginTop: 12 }}>{error}</Text> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 18, paddingBottom: 40 },
  centrado: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  titulo: { fontSize: 20, fontWeight: '700' },
  tarjeta: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 14, padding: 14, marginBottom: 12 },
  tarjetaTitulo: { fontSize: 12, fontWeight: '800', letterSpacing: 0.5, marginBottom: 8 },
  filaEntre: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  filaEstado: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 2 },
  barra: { height: 8, borderRadius: 4, overflow: 'hidden', marginTop: 10 },
  barraLlena: { height: 8, borderRadius: 4 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 },
  chip: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 8, paddingVertical: 4 },
  reputacionFila: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8, flexWrap: 'wrap' },
  alerta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  postCampania: { borderTopWidth: StyleSheet.hairlineWidth, marginTop: 10, paddingTop: 10, gap: 8 },
  asistenciaFila: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  asistenciaBtn: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 5 },
  calificarLink: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  seccion: { fontSize: 16, fontWeight: '700', marginTop: 8, marginBottom: 10 },
  persona: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 14, padding: 14, marginBottom: 10 },
  iconoBtn: { padding: 4 },
  respuestas: { borderTopWidth: StyleSheet.hairlineWidth, marginTop: 10, paddingTop: 4 },
  bajaLink: { marginTop: 10, alignSelf: 'flex-start' },
});
