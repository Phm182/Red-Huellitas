import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { hueplayApi } from '../../../src/api/hueplayApi';
import { TableroDoku } from '../../../src/juego/huedoku/TableroDoku';
import { TecladoDoku } from '../../../src/juego/huedoku/TecladoDoku';
import {
  Grilla,
  Puzzle,
  VarianteDoku,
  celdaTieneConflicto,
  estaResuelto,
  generarPuzzle,
  grillaCompleta,
  juegoCodigoPorVariante,
  puntaje,
} from '../../../src/juego/huedoku/motor';
import { DiarioResultado, HuePlayProgreso } from '../../../src/types/hueplay';
import { radii } from '../../../src/theme/elevation';
import { centeredContent } from '../../../src/theme/layout';
import { fonts } from '../../../src/theme/typography';
import { useTheme } from '../../../src/theme/ThemeProvider';
import { hapticCelebracion, hapticError, hapticExito, hapticLeve } from '../../../src/utils/haptics';

type Fase = 'listo' | 'generando' | 'jugando' | 'enviando' | 'fin';

function esVarianteDoku(v: string | undefined): v is VarianteDoku {
  return v === '6' || v === '9facil' || v === '9dificil';
}

/**
 * HueDoku: sudoku de 6x6 (rápido) o 9x9 (fácil/difícil).
 *
 * Sin arrastre, a diferencia de HueZip/HueMatch: se toca una celda y después
 * un dígito del teclado de abajo. Cronómetro ASCENDENTE, sin límite duro —
 * el puntaje premia la velocidad (`motor.ts::puntaje`), pero nunca hay un
 * timeout que corte la partida a la fuerza (una 9x9 difícil real puede
 * tardar minutos).
 */
export default function HueDokuScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const params = useLocalSearchParams<{ desafioId?: string; semilla?: string; diario?: string; variante?: string }>();

  const desafioId = params.desafioId ? Number(params.desafioId) : null;
  const esDiario = params.diario === '1';
  const varianteFija = esVarianteDoku(params.variante) ? params.variante : null;
  const [semilla] = useState(() =>
    params.semilla ? Number(params.semilla) : Math.floor(Math.random() * 2147483646) + 1
  );

  const [fase, setFase] = useState<Fase>('listo');
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [grilla, setGrilla] = useState<Grilla>([]);
  const [seleccionada, setSeleccionada] = useState<{ fila: number; col: number } | null>(null);
  const [errores, setErrores] = useState(0);
  const [segundos, setSegundos] = useState(0);
  const [resultado, setResultado] = useState<{
    puntos: number;
    esRecord?: boolean;
    progreso?: HuePlayProgreso;
    duelo?: { misPuntos: number; susPuntos: number | null; gane: boolean | null; rival: string };
    diario?: DiarioResultado;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const vivoRef = useRef(true);
  const puzzleRef = useRef<Puzzle | null>(null);
  const erroresRef = useRef(0);
  const segundosRef = useRef(0);
  const terminadoRef = useRef(false);

  useEffect(() => {
    vivoRef.current = true;
    return () => {
      vivoRef.current = false;
    };
  }, []);

  const lado = Math.min(width - 24, 380);

  const terminar = useCallback(async () => {
    const p = puzzleRef.current;
    if (!p || terminadoRef.current) return;
    terminadoRef.current = true;
    setFase('enviando');

    const JUEGO = juegoCodigoPorVariante(p.variante);
    const segundosUsados = segundosRef.current;
    const puntos = puntaje(true, erroresRef.current, segundosUsados, p.n * p.n, p.n * p.n);

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
            puntos,
            progreso: res.data.progreso,
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
          setResultado({ puntos, diario: res.data });
        } else {
          setError(res.message ?? t('common.error'));
        }
      } else {
        const res = await hueplayApi.guardarPartida(JUEGO, puntos, segundosUsados);
        if (!vivoRef.current) return;
        if (res.success && res.data) {
          setResultado({ puntos, esRecord: res.data.esRecord, progreso: res.data });
        } else {
          setError(res.message ?? t('common.error'));
        }
      }
    } catch {
      if (vivoRef.current) setError(t('common.error'));
    }

    if (vivoRef.current) setFase('fin');
  }, [desafioId, esDiario, t]);

  const arrancar = useCallback(
    (variante: VarianteDoku) => {
      hapticLeve();
      setFase('generando');
      // Se difiere un frame: la generación es sincrónica (backtracking puro,
      // ver huedoku/motor.ts) y podría demorar hasta ~150ms en un celular de
      // gama baja en el 9x9 difícil — sin este `setTimeout` el spinner ni
      // llega a pintarse antes de que el hilo se bloquee.
      setTimeout(() => {
        if (!vivoRef.current) return;
        const p = generarPuzzle(semilla, variante);
        const g: Grilla = p.pistas.map((fila) => [...fila]);
        puzzleRef.current = p;
        setPuzzle(p);
        setGrilla(g);
        setSeleccionada(null);
        erroresRef.current = 0;
        setErrores(0);
        segundosRef.current = 0;
        setSegundos(0);
        terminadoRef.current = false;
        setResultado(null);
        setError(null);
        setFase('jugando');
      }, 30);
    },
    [semilla]
  );

  useEffect(() => {
    if (fase !== 'jugando') return;
    const id = setInterval(() => {
      segundosRef.current += 1;
      setSegundos(segundosRef.current);
    }, 1000);
    return () => clearInterval(id);
  }, [fase]);

  const onSeleccionar = useCallback((fila: number, col: number) => {
    setSeleccionada({ fila, col });
  }, []);

  const onDigito = useCallback(
    (d: number) => {
      const p = puzzleRef.current;
      if (!p || !seleccionada) return;
      const { fila, col } = seleccionada;
      if (p.pistas[fila]![col] !== 0) return;

      const copia = grilla.map((f) => [...f]);
      copia[fila]![col] = d;
      setGrilla(copia);

      // El chequeo de conflicto lo hace `TableroDoku` visualmente en cada
      // render; acá sólo se cuenta como error si ESTE toque introdujo uno.
      const rompe = celdaTieneConflicto(p, copia, fila, col);
      if (rompe) {
        erroresRef.current += 1;
        setErrores(erroresRef.current);
        hapticError();
      } else {
        hapticLeve();
      }

      if (grillaCompleta(copia) && estaResuelto(p, copia)) {
        hapticCelebracion();
        terminar();
      }
    },
    [seleccionada, grilla, terminar]
  );

  const onBorrar = useCallback(() => {
    const p = puzzleRef.current;
    if (!p || !seleccionada) return;
    const { fila, col } = seleccionada;
    if (p.pistas[fila]![col] !== 0) return;
    const copia = grilla.map((f) => [...f]);
    copia[fila]![col] = 0;
    setGrilla(copia);
  }, [seleccionada, grilla]);

  if (fase === 'listo') {
    return (
      <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={[styles.intro, centeredContent]}>
        <View style={[styles.iconoIntro, { backgroundColor: colors.primarySoft }]}>
          <Ionicons name="grid-outline" size={40} color={colors.primary} />
        </View>
        <Text style={[styles.titulo, { color: colors.text }]}>HueDoku</Text>
        <Text style={[styles.bajada, { color: colors.textMuted }]}>{t('hueplay.doku.comoSeJuega')}</Text>

        {desafioId || esDiario ? (
          <View style={[styles.aviso, { backgroundColor: colors.primarySoft, borderColor: colors.primary }]}>
            <Ionicons name="flash" size={16} color={colors.primary} />
            <Text style={{ color: colors.text, fontSize: 12, flex: 1 }}>{t('hueplay.doku.avisoDuelo')}</Text>
          </View>
        ) : null}

        {varianteFija ? (
          <Pressable
            onPress={() => arrancar(varianteFija)}
            style={[styles.boton, { backgroundColor: colors.primary }]}
          >
            <Text style={[styles.botonTexto, { color: colors.primaryText }]}>{t('hueplay.match.empezar')}</Text>
          </Pressable>
        ) : (
          <>
            <Text style={[styles.label, { color: colors.text }]}>{t('hueplay.doku.elegirDificultad')}</Text>
            <View style={styles.dificultades}>
              {(['6', '9facil', '9dificil'] as VarianteDoku[]).map((v) => (
                <Pressable
                  key={v}
                  onPress={() => arrancar(v)}
                  style={[styles.chip, { borderColor: colors.primary }]}
                >
                  <Text style={{ color: colors.primary, fontFamily: fonts.bodySemi, fontSize: 14 }}>
                    {t(`hueplay.doku.variante${v}`)}
                  </Text>
                </Pressable>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    );
  }

  if (fase === 'generando' || fase === 'enviando') {
    return (
      <View style={[styles.centro, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        {fase === 'enviando' ? (
          <Text style={{ color: colors.textMuted, marginTop: 12 }}>{t('hueplay.match.guardando')}</Text>
        ) : null}
      </View>
    );
  }

  if (fase === 'fin') {
    const duelo = resultado?.duelo;
    return (
      <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={[styles.intro, centeredContent]}>
        <Text style={[styles.puntajeFinal, { color: colors.primary }]}>{resultado?.puntos ?? 0}</Text>
        <Text style={[styles.bajada, { color: colors.textMuted }]}>{t('hueplay.match.puntos')}</Text>

        <Text style={{ color: colors.textMuted, marginTop: 6, fontSize: 13 }}>
          {t('hueplay.doku.completo', { segundos, errores })}
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
              onPress={() => router.replace('/(app)/hueplay/huedoku')}
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

  return (
    <View style={[styles.juego, { backgroundColor: colors.background }]}>
      <View style={[styles.hud, centeredContent]}>
        <View>
          <Text style={[styles.hudLabel, { color: colors.textMuted }]}>{t('hueplay.match.tiempo')}</Text>
          <Text style={[styles.hudValor, { color: colors.text }]}>{segundos}s</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={[styles.hudLabel, { color: colors.textMuted }]}>{t('hueplay.doku.errores')}</Text>
          <Text style={[styles.hudValor, { color: errores > 0 ? colors.danger : colors.text }]}>{errores}</Text>
        </View>
      </View>

      <View style={styles.tableroWrap}>
        {puzzle ? (
          <TableroDoku puzzle={puzzle} grilla={grilla} seleccionada={seleccionada} onSeleccionar={onSeleccionar} lado={lado} />
        ) : null}
      </View>

      {puzzle ? (
        <TecladoDoku n={puzzle.n} onDigito={onDigito} onBorrar={onBorrar} deshabilitado={!seleccionada} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  intro: { padding: 20, alignItems: 'center', paddingTop: 40, paddingBottom: 40 },
  iconoIntro: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  titulo: { fontSize: 30, fontFamily: fonts.displaySemi },
  bajada: { fontSize: 13, marginTop: 6, textAlign: 'center', lineHeight: 19 },
  label: { fontSize: 13, fontFamily: fonts.bodySemi, marginTop: 20, marginBottom: 10 },
  dificultades: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' },
  chip: { borderWidth: 1.5, borderRadius: radii.pill, paddingVertical: 10, paddingHorizontal: 16 },
  puntajeFinal: { fontSize: 56, fontFamily: fonts.displaySemi },
  veredicto: { fontSize: 20, fontFamily: fonts.displaySemi, textAlign: 'center', marginBottom: 4 },
  aviso: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: radii.md, padding: 12, marginTop: 18, maxWidth: 420 },
  tarjeta: { borderWidth: 1, borderRadius: radii.lg, padding: 16, marginTop: 18, gap: 8, alignSelf: 'stretch', maxWidth: 420 },
  boton: { borderRadius: radii.pill, paddingVertical: 14, paddingHorizontal: 34, marginTop: 24, alignItems: 'center', justifyContent: 'center' },
  botonSec: { borderWidth: 1, backgroundColor: 'transparent' },
  botonTexto: { fontFamily: fonts.bodySemi, fontSize: 15, textAlign: 'center' },
  botonera: { flexDirection: 'row', gap: 10, alignSelf: 'stretch', maxWidth: 420 },
  juego: { flex: 1, paddingTop: 8, justifyContent: 'space-between', paddingBottom: 20 },
  hud: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 18, paddingBottom: 8 },
  hudLabel: { fontSize: 11, textTransform: 'uppercase' },
  hudValor: { fontSize: 24, fontFamily: fonts.displaySemi },
  tableroWrap: { alignItems: 'center', justifyContent: 'center' },
});
