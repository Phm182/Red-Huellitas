import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { hueplayApi } from '../../../src/api/hueplayApi';
import { TableroZip } from '../../../src/juego/huezip/TableroZip';
import {
  Celda,
  K,
  N,
  ProgresoZip,
  Puzzle,
  SEGUNDOS,
  celdaInicial,
  estaCompleto,
  generarPuzzle,
  progresoInicial,
  puntaje,
  reiniciar,
  tocarCelda,
} from '../../../src/juego/huezip/motor';
import { DiarioResultado, HuePlayProgreso } from '../../../src/types/hueplay';
import { radii } from '../../../src/theme/elevation';
import { centeredContent } from '../../../src/theme/layout';
import { fonts } from '../../../src/theme/typography';
import { useTheme } from '../../../src/theme/ThemeProvider';
import { hapticCelebracion, hapticError, hapticExito, hapticLeve } from '../../../src/utils/haptics';

const JUEGO = 'huezip';

type Fase = 'listo' | 'jugando' | 'enviando' | 'fin';

/**
 * HueZip: dibujar de un solo trazo un camino que recorra toda la grilla,
 * pasando por los números en orden. Mismo esquema que HueMemo/HueMatch: se
 * juega suelto con semilla al azar, o desde un desafío/diario con la
 * semilla del servidor (así el tablero es igual para los dos lados).
 */
export default function HueZipScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const params = useLocalSearchParams<{ desafioId?: string; semilla?: string; diario?: string }>();

  const desafioId = params.desafioId ? Number(params.desafioId) : null;
  const esDiario = params.diario === '1';
  const [semilla] = useState(() =>
    params.semilla ? Number(params.semilla) : Math.floor(Math.random() * 2147483646) + 1
  );

  const [fase, setFase] = useState<Fase>('listo');
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [progreso, setProgreso] = useState<ProgresoZip>(progresoInicial());
  const [rechazada, setRechazada] = useState<Celda | null>(null);
  const [restante, setRestante] = useState(SEGUNDOS);
  const [resultado, setResultado] = useState<{
    progreso: HuePlayProgreso;
    puntos: number;
    completo: boolean;
    esRecord?: boolean;
    duelo?: { misPuntos: number; susPuntos: number | null; gane: boolean | null; rival: string };
    diario?: DiarioResultado;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const vivoRef = useRef(true);
  // Refs para que el gesto (que llama estos handlers desde un PanResponder,
  // no desde un render de React) siempre lea/escriba el valor más reciente
  // sin esperar a que el estado termine de propagarse entre movimientos
  // consecutivos del mismo arrastre.
  const puzzleRef = useRef<Puzzle | null>(null);
  const progresoRef = useRef<ProgresoZip>(progresoInicial());
  const restanteRef = useRef(SEGUNDOS);
  const reiniciosRef = useRef(0);

  useEffect(() => {
    vivoRef.current = true;
    return () => {
      vivoRef.current = false;
    };
  }, []);

  const lado = Math.min(width - 24, 380);

  const arrancar = useCallback(() => {
    const p = generarPuzzle(semilla, N, K);
    setPuzzle(p);
    puzzleRef.current = p;
    setProgreso(progresoInicial());
    progresoRef.current = progresoInicial();
    setRechazada(null);
    reiniciosRef.current = 0;
    setRestante(SEGUNDOS);
    restanteRef.current = SEGUNDOS;
    setResultado(null);
    setError(null);
    setFase('jugando');
  }, [semilla]);

  useEffect(() => {
    if (fase !== 'jugando') return;
    const id = setInterval(() => {
      setRestante((s) => {
        const next = s <= 1 ? 0 : s - 1;
        restanteRef.current = next;
        if (next === 0) clearInterval(id);
        return next;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [fase]);

  const terminar = useCallback(
    async (segundosUsados: number) => {
      setFase('enviando');
      const p = puzzleRef.current;
      const celdasCompletadas = progresoRef.current.visitadas.length;
      const completo = !!p && estaCompleto(p, progresoRef.current);
      const puntos = puntaje(celdasCompletadas, reiniciosRef.current, segundosUsados, p?.totalCeldas ?? N * N);

      try {
        if (desafioId) {
          const res = await hueplayApi.jugarDesafio(desafioId, puntos, segundosUsados);
          if (!vivoRef.current) return;
          if (res.success && res.data) {
            const d = res.data.desafio;
            const cerrado = d.misPuntos !== null && d.susPuntos !== null;
            const gane = cerrado
              ? d.misPuntos === d.susPuntos
                ? null
                : (d.misPuntos ?? 0) > (d.susPuntos ?? 0)
              : null;
            setResultado({
              progreso: res.data.progreso,
              puntos,
              completo,
              duelo: {
                misPuntos: d.misPuntos ?? puntos,
                susPuntos: d.susPuntos,
                gane,
                rival: d.otro.username || d.otro.nombreCompleto,
              },
            });
          } else {
            setError(res.message ?? t('common.error'));
          }
        } else if (esDiario) {
          const res = await hueplayApi.diarioJugar(JUEGO, puntos, segundosUsados);
          if (!vivoRef.current) return;
          if (res.success && res.data) {
            setResultado({ progreso: res.data.progreso, puntos, completo, diario: res.data });
          } else {
            setError(res.message ?? t('common.error'));
          }
        } else {
          const res = await hueplayApi.guardarPartida(JUEGO, puntos, segundosUsados);
          if (!vivoRef.current) return;
          if (res.success && res.data) {
            setResultado({ progreso: res.data, puntos, completo, esRecord: res.data.esRecord });
          } else {
            setError(res.message ?? t('common.error'));
          }
        }
      } catch {
        if (vivoRef.current) setError(t('common.error'));
      }

      if (vivoRef.current) setFase('fin');
    },
    [desafioId, esDiario, t]
  );

  // Se acabó el tiempo.
  useEffect(() => {
    if (fase === 'jugando' && restante === 0) {
      hapticError();
      terminar(SEGUNDOS);
    }
  }, [fase, restante, terminar]);

  const aplicarToque = useCallback(
    (c: Celda) => {
      const p = puzzleRef.current;
      if (!p) return;
      const r = tocarCelda(p, progresoRef.current, c);
      if (r.evento === 'rechazada') {
        hapticError();
        setRechazada(c);
        setTimeout(() => {
          if (vivoRef.current) setRechazada(null);
        }, 280);
        return;
      }
      if (r.evento === 'sinCambio') return;

      hapticLeve();
      progresoRef.current = r.progreso;
      setProgreso(r.progreso);
      setRechazada(null);

      if (estaCompleto(p, r.progreso)) {
        hapticCelebracion();
        terminar(SEGUNDOS - restanteRef.current);
      }
    },
    [terminar]
  );

  const onInicioToque = useCallback(
    (c: Celda) => {
      if (fase !== 'jugando') return;
      const p = puzzleRef.current;
      if (!p) return;
      const inicio = celdaInicial(p);
      const esInicio = c.fila === inicio.fila && c.col === inicio.col;
      if (esInicio && progresoRef.current.visitadas.length > 0) {
        if (progresoRef.current.visitadas.length > 1) reiniciosRef.current += 1;
        const nuevo = reiniciar(p);
        progresoRef.current = nuevo;
        setProgreso(nuevo);
        setRechazada(null);
        hapticLeve();
        return;
      }
      aplicarToque(c);
    },
    [fase, aplicarToque]
  );

  const onCelda = useCallback(
    (c: Celda) => {
      if (fase !== 'jugando') return;
      aplicarToque(c);
    },
    [fase, aplicarToque]
  );

  if (fase === 'listo') {
    return (
      <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={[styles.intro, centeredContent]}>
        <View style={[styles.iconoIntro, { backgroundColor: colors.primarySoft }]}>
          <Ionicons name="trail-sign" size={40} color={colors.primary} />
        </View>
        <Text style={[styles.titulo, { color: colors.text }]}>HueZip</Text>
        <Text style={[styles.bajada, { color: colors.textMuted }]}>{t('hueplay.zip.comoSeJuega')}</Text>

        {desafioId ? (
          <View style={[styles.aviso, { backgroundColor: colors.primarySoft, borderColor: colors.primary }]}>
            <Ionicons name="flash" size={16} color={colors.primary} />
            <Text style={{ color: colors.text, fontSize: 12, flex: 1 }}>{t('hueplay.zip.avisoDuelo')}</Text>
          </View>
        ) : null}

        <Pressable
          onPress={() => {
            hapticLeve();
            arrancar();
          }}
          style={[styles.boton, { backgroundColor: colors.primary }]}
        >
          <Text style={[styles.botonTexto, { color: colors.primaryText }]}>{t('hueplay.match.empezar')}</Text>
        </Pressable>
      </ScrollView>
    );
  }

  if (fase === 'enviando') {
    return (
      <View style={[styles.centro, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ color: colors.textMuted, marginTop: 12 }}>{t('hueplay.match.guardando')}</Text>
      </View>
    );
  }

  if (fase === 'fin') {
    const duelo = resultado?.duelo;
    const total = puzzle?.totalCeldas ?? N * N;
    return (
      <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={[styles.intro, centeredContent]}>
        <Text style={[styles.puntajeFinal, { color: colors.primary }]}>{resultado?.puntos ?? 0}</Text>
        <Text style={[styles.bajada, { color: colors.textMuted }]}>{t('hueplay.match.puntos')}</Text>

        <Text style={{ color: colors.textMuted, marginTop: 6, fontSize: 13 }}>
          {resultado?.completo
            ? t('hueplay.zip.completo', { reinicios: reiniciosRef.current })
            : t('hueplay.zip.incompleto', { n: progreso.visitadas.length, total })}
        </Text>

        {error ? <Text style={{ color: colors.danger, marginTop: 12, textAlign: 'center' }}>{error}</Text> : null}

        {resultado?.esRecord ? (
          <View style={[styles.aviso, { backgroundColor: colors.primarySoft, borderColor: colors.primary }]}>
            <Ionicons name="trophy" size={16} color={colors.primary} />
            <Text style={{ color: colors.text, fontSize: 13, fontFamily: fonts.bodySemi }}>
              {t('hueplay.match.nuevoRecord')}
            </Text>
          </View>
        ) : null}

        {duelo ? (
          <View style={[styles.tarjeta, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {duelo.susPuntos === null ? (
              <Text style={{ color: colors.textMuted, textAlign: 'center' }}>
                {t('hueplay.match.esperandoRival', { rival: duelo.rival })}
              </Text>
            ) : (
              <>
                <Text
                  style={[
                    styles.veredicto,
                    { color: duelo.gane === null ? colors.text : duelo.gane ? colors.success : colors.danger },
                  ]}
                >
                  {duelo.gane === null ? t('hueplay.match.empate') : duelo.gane ? t('hueplay.match.ganaste') : t('hueplay.match.perdiste')}
                </Text>
                <Text style={{ color: colors.textMuted, textAlign: 'center' }}>
                  {duelo.misPuntos} · {duelo.rival} {duelo.susPuntos}
                </Text>
              </>
            )}
          </View>
        ) : null}

        {resultado?.progreso ? (
          <View style={[styles.tarjeta, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={{ color: colors.text, fontFamily: fonts.bodySemi }}>
              {t('hueplay.nivel', { n: resultado.progreso.nivel })}
              {resultado.progreso.subioDeNivel ? ` · ${t('hueplay.subisteDeNivel')}` : ''}
            </Text>
            <Text style={{ color: colors.textMuted, fontSize: 12 }}>
              {t('hueplay.faltanParaNivel', { n: resultado.progreso.faltan, nivel: resultado.progreso.nivel + 1 })}
            </Text>
          </View>
        ) : null}

        <View style={styles.botonera}>
          {!desafioId && !esDiario ? (
            <Pressable
              onPress={() => router.replace('/(app)/hueplay/huezip')}
              style={[styles.boton, { backgroundColor: colors.primary, flex: 1 }]}
            >
              <Text style={[styles.botonTexto, { color: colors.primaryText }]}>{t('hueplay.match.otraVez')}</Text>
            </Pressable>
          ) : null}
          <Pressable
            onPress={() => router.replace('/(app)/hueplay')}
            style={[styles.boton, styles.botonSec, { borderColor: colors.border, flex: 1 }]}
          >
            <Text style={[styles.botonTexto, { color: colors.text }]}>{t('hueplay.volver')}</Text>
          </Pressable>
        </View>
      </ScrollView>
    );
  }

  const urgente = restante <= 15;

  return (
    <View style={[styles.juego, { backgroundColor: colors.background }]}>
      <View style={[styles.hud, centeredContent]}>
        <View>
          <Text style={[styles.hudLabel, { color: colors.textMuted }]}>{t('hueplay.zip.celdas')}</Text>
          <Text style={[styles.hudValor, { color: colors.text }]}>
            {progreso.visitadas.length}/{puzzle?.totalCeldas ?? N * N}
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={[styles.hudLabel, { color: colors.textMuted }]}>{t('hueplay.match.tiempo')}</Text>
          <Text style={[styles.hudValor, { color: urgente ? colors.danger : colors.text }]}>{restante}s</Text>
        </View>
      </View>

      <View style={[styles.barraTiempo, { backgroundColor: colors.border }]}>
        <View
          style={[
            styles.barraLlena,
            { backgroundColor: urgente ? colors.danger : colors.primary, width: `${(restante / SEGUNDOS) * 100}%` },
          ]}
        />
      </View>

      <View style={styles.tableroWrap}>
        {puzzle ? (
          <TableroZip
            puzzle={puzzle}
            visitadas={progreso.visitadas}
            rechazada={rechazada}
            lado={lado}
            onInicioToque={onInicioToque}
            onCelda={onCelda}
            bloqueado={false}
          />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  intro: { padding: 20, alignItems: 'center', paddingTop: 40, paddingBottom: 40 },
  iconoIntro: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  titulo: { fontSize: 30, fontFamily: fonts.displaySemi },
  bajada: { fontSize: 13, marginTop: 6, textAlign: 'center', lineHeight: 19 },
  puntajeFinal: { fontSize: 56, fontFamily: fonts.displaySemi },
  veredicto: { fontSize: 20, fontFamily: fonts.displaySemi, textAlign: 'center', marginBottom: 4 },
  aviso: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: radii.md, padding: 12, marginTop: 18, maxWidth: 420 },
  tarjeta: { borderWidth: 1, borderRadius: radii.lg, padding: 16, marginTop: 18, gap: 8, alignSelf: 'stretch', maxWidth: 420 },
  boton: { borderRadius: radii.pill, paddingVertical: 14, paddingHorizontal: 34, marginTop: 24, alignItems: 'center', justifyContent: 'center' },
  botonSec: { borderWidth: 1, backgroundColor: 'transparent' },
  botonTexto: { fontFamily: fonts.bodySemi, fontSize: 15, textAlign: 'center' },
  botonera: { flexDirection: 'row', gap: 10, alignSelf: 'stretch', maxWidth: 420 },
  juego: { flex: 1, paddingTop: 8 },
  hud: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 18, paddingBottom: 8 },
  hudLabel: { fontSize: 11, textTransform: 'uppercase' },
  hudValor: { fontSize: 24, fontFamily: fonts.displaySemi },
  barraTiempo: { height: 6, borderRadius: 3, marginHorizontal: 18, overflow: 'hidden' },
  barraLlena: { height: '100%', borderRadius: 4 },
  tableroWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
