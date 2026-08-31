import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { hueplayApi } from '../../../src/api/hueplayApi';
import { variantePorJuegoCodigo } from '../../../src/juego/huedoku/motor';
import { ChipRow } from '../../../src/components/ui/ChipRow';
import { DiarioHoy, DiarioPeriodo, DiarioRanking, DiarioRankingPeriodo, DiarioReto } from '../../../src/types/hueplay';
import { radii } from '../../../src/theme/elevation';
import { centeredContent } from '../../../src/theme/layout';
import { fonts } from '../../../src/theme/typography';
import { useTheme } from '../../../src/theme/ThemeProvider';
import { hapticLeve } from '../../../src/utils/haptics';
import { rhAvatarUrl } from '../../../src/utils/media';

/** A qué pantalla lleva cada juego cuando se juega el reto del día. */
const RUTAS: Record<string, string> = {
  huematch: '/(app)/hueplay/huematch',
  huememo: '/(app)/hueplay/huememo',
  huetrivia: '/(app)/hueplay/huetrivia',
  huezip: '/(app)/hueplay/huezip',
  huedoku6: '/(app)/hueplay/huedoku',
  huedoku9facil: '/(app)/hueplay/huedoku',
  huedoku9dificil: '/(app)/hueplay/huedoku',
};

const COLORES: Record<string, string> = {
  huematch: '#E8577E',
  huememo: '#4CC3A5',
  huetrivia: '#B36FE0',
  huezip: '#F0A830',
  huedoku6: '#D9834F',
  huedoku9facil: '#D9834F',
  huedoku9dificil: '#D9834F',
};

const ICONOS: Record<string, keyof typeof MaterialCommunityIcons.glyphMap> = {
  huematch: 'view-grid',
  huememo: 'cards',
  huetrivia: 'comment-question-outline',
  huezip: 'gesture-swipe',
  huedoku6: 'view-grid-outline',
  huedoku9facil: 'view-grid-outline',
  huedoku9dificil: 'view-grid-outline',
};

/**
 * El reto diario: el mismo tablero para todos, un intento por día.
 *
 * La diferencia con jugar suelto no es el juego sino la comparación. Como todos
 * reciben la misma semilla, el puntaje de hoy dice algo: no es "yo hice 3000"
 * sino "hice 3000 donde vos hiciste 2400, con las mismas fichas". Por eso la
 * pantalla muestra el puesto y cuánta gente jugó y no sólo el número.
 */
export default function DiarioScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const [datos, setDatos] = useState<DiarioHoy | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  /** Ranking abierto, por código de juego. Se pide recién al desplegarlo. */
  const [abierto, setAbierto] = useState<string | null>(null);
  const [ranking, setRanking] = useState<DiarioRanking | null>(null);
  const [cargandoRanking, setCargandoRanking] = useState(false);

  /**
   * Ranking global (suma los tres retos), aparte del "ver tabla" por juego de
   * arriba. Vive en un modal propio con tabs de período.
   */
  const [rankingGlobalVisible, setRankingGlobalVisible] = useState(false);
  const [periodo, setPeriodo] = useState<DiarioPeriodo>('dia');
  const [rankingPeriodo, setRankingPeriodo] = useState<DiarioRankingPeriodo | null>(null);
  const [cargandoRankingPeriodo, setCargandoRankingPeriodo] = useState(false);

  const cargar = useCallback(async () => {
    setError(null);
    const res = await hueplayApi.diarioHoy();
    if (res.success && res.data) {
      setDatos(res.data);
    } else {
      setError(res.message ?? t('common.error'));
    }
    setCargando(false);
  }, [t]);

  // Al volver de jugar hay que refrescar: el reto pasó a jugado y el puesto
  // cambió. Con `useFocusEffect` eso ocurre solo, sin que la pantalla de juego
  // tenga que avisar nada.
  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar])
  );

  const verRanking = useCallback(
    async (codigo: string) => {
      hapticLeve();
      if (abierto === codigo) {
        setAbierto(null);
        return;
      }
      setAbierto(codigo);
      setRanking(null);
      setCargandoRanking(true);
      const res = await hueplayApi.diarioRanking(codigo);
      if (res.success && res.data) setRanking(res.data);
      setCargandoRanking(false);
    },
    [abierto]
  );

  const cargarRankingPeriodo = useCallback(async (p: DiarioPeriodo) => {
    setCargandoRankingPeriodo(true);
    const res = await hueplayApi.diarioRankingPeriodo(p);
    if (res.success && res.data) setRankingPeriodo(res.data);
    setCargandoRankingPeriodo(false);
  }, []);

  const abrirRankingGlobal = useCallback(() => {
    hapticLeve();
    setRankingGlobalVisible(true);
    setPeriodo('dia');
    setRankingPeriodo(null);
    cargarRankingPeriodo('dia');
  }, [cargarRankingPeriodo]);

  const cambiarPeriodo = useCallback(
    (p: DiarioPeriodo) => {
      hapticLeve();
      setPeriodo(p);
      setRankingPeriodo(null);
      cargarRankingPeriodo(p);
    },
    [cargarRankingPeriodo]
  );

  const jugar = useCallback((reto: DiarioReto) => {
    const ruta = RUTAS[reto.juegoCodigo];
    // Sin semilla no se puede jugar el reto: es la que garantiza que sea el
    // mismo tablero que el de todos. Si no vino, es porque ya se jugó.
    if (!ruta || reto.semilla === undefined) return;
    hapticLeve();
    // Las 3 variantes de HueDoku comparten pantalla (`huedoku.tsx`) — la
    // variante viaja como parámetro aparte, derivada del propio juegoCodigo.
    const variante = variantePorJuegoCodigo(reto.juegoCodigo);
    const extra = variante ? `&variante=${variante}` : '';
    router.push(`${ruta}?diario=1&semilla=${reto.semilla}${extra}` as never);
  }, []);

  if (cargando) {
    return (
      <View style={[styles.centro, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <>
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[styles.cuerpo, centeredContent]}
    >
      <View style={styles.encabezado}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.titulo, { color: colors.text }]}>{t('hueplay.diario.titulo')}</Text>
          <Text style={[styles.bajada, { color: colors.textMuted }]}>
            {t('hueplay.diario.bajada')}
          </Text>
        </View>
        <Pressable
          onPress={abrirRankingGlobal}
          style={[styles.botonRanking, { backgroundColor: colors.primarySoft, borderColor: colors.primary }]}
        >
          <Ionicons name="trophy" size={16} color={colors.primary} />
          <Text style={{ color: colors.primary, fontFamily: fonts.bodySemi, fontSize: 13 }}>
            {t('hueplay.diario.ranking')}
          </Text>
        </Pressable>
      </View>

      {datos && datos.racha > 0 ? (
        <View style={[styles.racha, { backgroundColor: colors.primarySoft, borderColor: colors.primary }]}>
          <Ionicons name="flame" size={18} color={colors.primary} />
          <Text style={{ color: colors.text, fontFamily: fonts.bodySemi, fontSize: 14 }}>
            {t('hueplay.diario.racha', { dias: datos.racha })}
          </Text>
        </View>
      ) : null}

      {error ? <Text style={{ color: colors.danger, marginTop: 12 }}>{error}</Text> : null}

      {datos?.retos.map((reto) => {
        const color = COLORES[reto.juegoCodigo] ?? colors.primary;
        const esteAbierto = abierto === reto.juegoCodigo;

        return (
          <View
            key={reto.juegoCodigo}
            style={[styles.tarjeta, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <View style={styles.fila}>
              <View style={[styles.icono, { backgroundColor: color + '22' }]}>
                <MaterialCommunityIcons name={ICONOS[reto.juegoCodigo] ?? 'gamepad-variant'} size={22} color={color} />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={[styles.juegoTitulo, { color: colors.text }]}>{reto.titulo}</Text>
                <Text style={{ color: colors.textMuted, fontSize: 12 }}>
                  {reto.jugado
                    ? t('hueplay.diario.tuPuntaje', {
                        puntos: reto.miPuntaje ?? 0,
                        puesto: reto.miPuesto ?? 0,
                        total: reto.participantes,
                      })
                    : t('hueplay.diario.jugaron', { total: reto.participantes })}
                </Text>
              </View>

              {reto.jugado ? (
                <View style={[styles.listo, { borderColor: colors.border }]}>
                  <Ionicons name="checkmark" size={16} color={colors.textMuted} />
                </View>
              ) : (
                <Pressable
                  onPress={() => jugar(reto)}
                  style={[styles.boton, { backgroundColor: color }]}
                >
                  <Text style={styles.botonTexto}>{t('hueplay.diario.jugar')}</Text>
                </Pressable>
              )}
            </View>

            <Pressable onPress={() => verRanking(reto.juegoCodigo)} style={styles.verTabla}>
              <Text style={{ color: colors.textMuted, fontSize: 12 }}>
                {t('hueplay.diario.verTabla')}
              </Text>
              <Ionicons
                name={esteAbierto ? 'chevron-up' : 'chevron-down'}
                size={14}
                color={colors.textMuted}
              />
            </Pressable>

            {esteAbierto ? (
              cargandoRanking ? (
                <ActivityIndicator color={colors.primary} style={{ marginVertical: 12 }} />
              ) : ranking && ranking.ranking.length > 0 ? (
                <View style={{ marginTop: 4 }}>
                  {ranking.ranking.map((r) => (
                    <View key={r.userId} style={[styles.puesto, { borderBottomColor: colors.border }]}>
                      <Text style={[styles.puestoNum, { color: colors.textMuted }]}>{r.puesto}</Text>
                      {r.avatarPath ? (
                        <Image source={{ uri: rhAvatarUrl(r.avatarPath) }} style={styles.avatar} />
                      ) : (
                        <View style={[styles.avatar, { backgroundColor: colors.border }]} />
                      )}
                      <Text style={{ color: colors.text, flex: 1, fontSize: 13 }} numberOfLines={1}>
                        {r.username ? `@${r.username}` : r.nombreCompleto}
                      </Text>
                      <Text style={{ color: colors.text, fontFamily: fonts.bodySemi, fontSize: 13 }}>
                        {r.puntos}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={{ color: colors.textMuted, fontSize: 12, marginVertical: 10 }}>
                  {t('hueplay.diario.nadieJugo')}
                </Text>
              )
            ) : null}
          </View>
        );
      })}

      <Text style={[styles.pie, { color: colors.textMuted }]}>{t('hueplay.diario.pie')}</Text>
    </ScrollView>

    <Modal
      visible={rankingGlobalVisible}
      animationType="none"
      onRequestClose={() => setRankingGlobalVisible(false)}
    >
      <View style={[styles.modalCuerpo, { backgroundColor: colors.background, paddingTop: insets.top + 16 }]}>
        <View style={styles.modalHeader}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.titulo, { color: colors.text, fontSize: 20 }]}>
              {t('hueplay.diario.rankingTitulo')}
            </Text>
            <Text style={{ color: colors.textMuted, fontSize: 12 }}>
              {t('hueplay.diario.rankingBajada')}
            </Text>
          </View>
          <Pressable onPress={() => setRankingGlobalVisible(false)} hitSlop={10}>
            <Ionicons name="close" size={24} color={colors.textMuted} />
          </Pressable>
        </View>

        <ChipRow
          style={styles.modalTabs}
          opciones={[
            { valor: 'dia', label: t('hueplay.diario.periodoDia') },
            { valor: 'semana', label: t('hueplay.diario.periodoSemana') },
            { valor: 'mes', label: t('hueplay.diario.periodoMes') },
            { valor: 'anio', label: t('hueplay.diario.periodoAnio') },
          ]}
          seleccionado={periodo}
          onSelect={cambiarPeriodo}
          scrollable={false}
        />

        <ScrollView contentContainerStyle={styles.modalLista}>
          {cargandoRankingPeriodo ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} />
          ) : rankingPeriodo && rankingPeriodo.ranking.length > 0 ? (
            rankingPeriodo.ranking.map((r) => (
              <View
                key={r.userId}
                style={[
                  styles.puesto,
                  { borderBottomColor: colors.border },
                  r.soyYo && { backgroundColor: colors.primarySoft, borderRadius: radii.md },
                ]}
              >
                <Text style={[styles.puestoNum, { color: colors.textMuted }]}>{r.puesto}</Text>
                {r.avatarPath ? (
                  <Image source={{ uri: rhAvatarUrl(r.avatarPath) }} style={styles.avatar} />
                ) : (
                  <View style={[styles.avatar, { backgroundColor: colors.border }]} />
                )}
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text, fontSize: 13 }} numberOfLines={1}>
                    {r.username ? `@${r.username}` : r.nombreCompleto}
                  </Text>
                  <Text style={{ color: colors.textMuted, fontSize: 11 }}>
                    {t('hueplay.diario.diasJugados', { dias: r.dias })}
                  </Text>
                </View>
                <Text style={{ color: colors.text, fontFamily: fonts.bodySemi, fontSize: 13 }}>
                  {r.puntos}
                </Text>
              </View>
            ))
          ) : (
            <Text style={{ color: colors.textMuted, fontSize: 12, marginVertical: 10 }}>
              {t('hueplay.diario.rankingVacio')}
            </Text>
          )}
        </ScrollView>

        {rankingPeriodo && rankingPeriodo.miPuesto !== null && rankingPeriodo.miPuntaje !== null ? (
          <View style={[styles.modalPie, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={{ color: colors.text, fontSize: 13, fontFamily: fonts.bodySemi }}>
              {t('hueplay.diario.tuPuesto', {
                puesto: rankingPeriodo.miPuesto,
                puntos: rankingPeriodo.miPuntaje,
              })}
            </Text>
          </View>
        ) : null}
      </View>
    </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  cuerpo: { padding: 16, paddingBottom: 40 },
  encabezado: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 4 },
  botonRanking: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: radii.pill,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  titulo: { fontSize: 26, fontFamily: fonts.display, marginBottom: 4 },
  bajada: { fontSize: 13, marginBottom: 14 },
  racha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: radii.pill,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginBottom: 14,
  },
  tarjeta: { borderWidth: 1, borderRadius: radii.lg, padding: 14, marginBottom: 12 },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  icono: { width: 44, height: 44, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center' },
  juegoTitulo: { fontSize: 16, fontFamily: fonts.bodySemi },
  boton: {
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botonTexto: { color: '#fff', fontFamily: fonts.bodySemi, fontSize: 13 },
  listo: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verTabla: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 12 },
  puesto: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  puestoNum: { width: 22, fontSize: 12, fontFamily: fonts.bodySemi },
  avatar: { width: 28, height: 28, borderRadius: 14 },
  pie: { fontSize: 11, textAlign: 'center', marginTop: 8 },
  modalCuerpo: { flex: 1, paddingHorizontal: 16 },
  modalHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 14 },
  modalTabs: { marginBottom: 8 },
  modalLista: { paddingBottom: 16 },
  modalPie: {
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
});
