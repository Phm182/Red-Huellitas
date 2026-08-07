import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { hueplayApi } from '../../../src/api/hueplayApi';
import { CartaMemo } from '../../../src/juego/huememo/Carta';
import { Ficha } from '../../../src/juego/huematch/Ficha';
import { COLUMNAS, PARES, SEGUNDOS, TOTAL, puntaje, repartir } from '../../../src/juego/huememo/motor';
import { DiarioResultado, HuePlayProgreso } from '../../../src/types/hueplay';
import { radii } from '../../../src/theme/elevation';
import { centeredContent } from '../../../src/theme/layout';
import { fonts } from '../../../src/theme/typography';
import { useTheme } from '../../../src/theme/ThemeProvider';
import { hapticCelebracion, hapticError, hapticExito, hapticLeve, hapticMedio } from '../../../src/utils/haptics';

const JUEGO = 'huememo';

/** Cuánto queda visible un par que no coincidió, antes de taparse. */
const T_TAPAR = 750;

type Fase = 'listo' | 'jugando' | 'enviando' | 'fin';

/**
 * HueMemo: dar vuelta las cartas y encontrar los 8 pares.
 *
 * Mismo esquema que HueMatch: se juega suelto con semilla al azar, o desde un
 * desafío con la semilla del servidor, y ahí las cartas están repartidas igual
 * para los dos.
 */
export default function HueMemoScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const params = useLocalSearchParams<{ desafioId?: string; semilla?: string; diario?: string }>();

  const desafioId = params.desafioId ? Number(params.desafioId) : null;
  /** Se entró desde el reto del día: el puntaje va a la tabla global. */
  const esDiario = params.diario === '1';
  const [semilla] = useState(() =>
    params.semilla ? Number(params.semilla) : Math.floor(Math.random() * 2147483646) + 1
  );

  const [fase, setFase] = useState<Fase>('listo');
  const [cartas, setCartas] = useState<number[]>([]);
  const [vueltas, setVueltas] = useState<number[]>([]);
  const [halladas, setHalladas] = useState<Set<number>>(new Set());
  const [fallos, setFallos] = useState(0);
  const [restante, setRestante] = useState(SEGUNDOS);
  const [bloqueado, setBloqueado] = useState(false);
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
  // Los contadores se leen desde refs al cerrar: el reloj corre en un
  // `setInterval` que capturó el estado de su render y mandaría valores viejos.
  const paresRef = useRef(0);
  const fallosRef = useRef(0);

  useEffect(() => {
    vivoRef.current = true;
    return () => {
      vivoRef.current = false;
    };
  }, []);

  const lado = Math.min(width - 24, 380);
  const celda = lado / COLUMNAS;

  const arrancar = useCallback(() => {
    setCartas(repartir(semilla));
    setVueltas([]);
    setHalladas(new Set());
    setFallos(0);
    paresRef.current = 0;
    fallosRef.current = 0;
    setRestante(SEGUNDOS);
    setResultado(null);
    setError(null);
    setBloqueado(false);
    setFase('jugando');
  }, [semilla]);

  useEffect(() => {
    if (fase !== 'jugando') return;
    const id = setInterval(() => {
      setRestante((s) => {
        if (s <= 1) {
          clearInterval(id);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [fase]);

  const terminar = useCallback(
    async (segundosUsados: number) => {
      setFase('enviando');
      const pares = paresRef.current;
      const puntos = puntaje(pares, fallosRef.current, segundosUsados);
      const completo = pares === PARES;

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
            setResultado({
              progreso: res.data.progreso,
              puntos,
              completo,
              diario: res.data,
            });
          } else {
            setError(res.message ?? t('common.error'));
          }
        } else {
          const res = await hueplayApi.guardarPartida(JUEGO, puntos, segundosUsados);
          if (!vivoRef.current) return;
          if (res.success && res.data) {
            setResultado({
              progreso: res.data,
              puntos,
              completo,
              esRecord: res.data.esRecord,
            });
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

  const tocar = (i: number) => {
    if (fase !== 'jugando' || bloqueado) return;
    if (halladas.has(cartas[i]!) || vueltas.includes(i)) return;

    hapticLeve();
    const nuevas = [...vueltas, i];
    setVueltas(nuevas);

    if (nuevas.length < 2) return;

    const [a, b] = nuevas;
    const iguales = cartas[a!] === cartas[b!];

    if (iguales) {
      hapticExito();
      const nuevasHalladas = new Set(halladas);
      nuevasHalladas.add(cartas[a!]!);
      setHalladas(nuevasHalladas);
      setVueltas([]);
      paresRef.current = nuevasHalladas.size;

      if (nuevasHalladas.size === PARES) {
        hapticCelebracion();
        // El tiempo usado sale del reloj, no de un cronómetro aparte: es el
        // mismo número que ve el jugador, así el bono no lo sorprende.
        terminar(SEGUNDOS - restante);
      }
      return;
    }

    // No coinciden: se dejan ver un momento y se tapan.
    setBloqueado(true);
    setFallos((f) => {
      fallosRef.current = f + 1;
      return f + 1;
    });
    setTimeout(() => {
      if (!vivoRef.current) return;
      setVueltas([]);
      setBloqueado(false);
    }, T_TAPAR);
  };

  if (fase === 'listo') {
    return (
      <ScrollView
        style={{ backgroundColor: colors.background }}
        contentContainerStyle={[styles.intro, centeredContent]}
      >
        <View style={styles.introFichas}>
          {[0, 6, 7, 4].map((i) => (
            <Ficha key={i} tipo={i} size={40} />
          ))}
        </View>
        <Text style={[styles.titulo, { color: colors.text }]}>HueMemo</Text>
        <Text style={[styles.bajada, { color: colors.textMuted }]}>{t('hueplay.memo.comoSeJuega')}</Text>

        {desafioId ? (
          <View style={[styles.aviso, { backgroundColor: colors.primarySoft, borderColor: colors.primary }]}>
            <Ionicons name="flash" size={16} color={colors.primary} />
            <Text style={{ color: colors.text, fontSize: 12, flex: 1 }}>
              {t('hueplay.memo.avisoDuelo')}
            </Text>
          </View>
        ) : null}

        <Pressable
          onPress={() => {
            hapticMedio();
            arrancar();
          }}
          style={[styles.boton, { backgroundColor: colors.primary }]}
        >
          <Text style={[styles.botonTexto, { color: colors.primaryText }]}>
            {t('hueplay.match.empezar')}
          </Text>
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
    return (
      <ScrollView
        style={{ backgroundColor: colors.background }}
        contentContainerStyle={[styles.intro, centeredContent]}
      >
        <Text style={[styles.puntajeFinal, { color: colors.primary }]}>{resultado?.puntos ?? 0}</Text>
        <Text style={[styles.bajada, { color: colors.textMuted }]}>{t('hueplay.match.puntos')}</Text>

        <Text style={{ color: colors.textMuted, marginTop: 6, fontSize: 13 }}>
          {resultado?.completo
            ? t('hueplay.memo.completo', { fallos })
            : t('hueplay.memo.incompleto', { n: paresRef.current, total: PARES })}
        </Text>

        {error ? (
          <Text style={{ color: colors.danger, marginTop: 12, textAlign: 'center' }}>{error}</Text>
        ) : null}

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
                  {duelo.gane === null
                    ? t('hueplay.match.empate')
                    : duelo.gane
                      ? t('hueplay.match.ganaste')
                      : t('hueplay.match.perdiste')}
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
              {t('hueplay.faltanParaNivel', {
                n: resultado.progreso.faltan,
                nivel: resultado.progreso.nivel + 1,
              })}
            </Text>
          </View>
        ) : null}

        <View style={styles.botonera}>
          {!desafioId ? (
            <Pressable
              onPress={() => router.replace('/(app)/hueplay/huememo')}
              style={[styles.boton, { backgroundColor: colors.primary, flex: 1 }]}
            >
              <Text style={[styles.botonTexto, { color: colors.primaryText }]}>
                {t('hueplay.match.otraVez')}
              </Text>
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
          <Text style={[styles.hudLabel, { color: colors.textMuted }]}>{t('hueplay.memo.pares')}</Text>
          <Text style={[styles.hudValor, { color: colors.text }]}>
            {halladas.size}/{PARES}
          </Text>
        </View>
        <View style={{ alignItems: 'center' }}>
          <Text style={[styles.hudLabel, { color: colors.textMuted }]}>{t('hueplay.memo.fallos')}</Text>
          <Text style={[styles.hudValor, { color: colors.text }]}>{fallos}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={[styles.hudLabel, { color: colors.textMuted }]}>{t('hueplay.match.tiempo')}</Text>
          <Text style={[styles.hudValor, { color: urgente ? colors.danger : colors.text }]}>
            {restante}s
          </Text>
        </View>
      </View>

      <View style={[styles.barraTiempo, { backgroundColor: colors.border }]}>
        <View
          style={[
            styles.barraLlena,
            {
              backgroundColor: urgente ? colors.danger : colors.primary,
              width: `${(restante / SEGUNDOS) * 100}%`,
            },
          ]}
        />
      </View>

      <View style={styles.tableroWrap}>
        <View style={[styles.grilla, { width: lado, height: celda * (TOTAL / COLUMNAS) }]}>
          {cartas.map((tipo, i) => {
            const abierta = vueltas.includes(i) || halladas.has(tipo);
            const hecha = halladas.has(tipo);
            return (
              <View
                key={i}
                style={[
                  styles.carta,
                  { width: celda, height: celda, left: (i % COLUMNAS) * celda, top: Math.floor(i / COLUMNAS) * celda },
                ]}
              >
                <CartaMemo
                  tipo={tipo}
                  lado={celda}
                  abierta={abierta}
                  hecha={hecha}
                  onPress={() => tocar(i)}
                  accessibilityLabel={t('hueplay.memo.carta', { n: i + 1 })}
                />
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  intro: { padding: 20, alignItems: 'center', paddingTop: 40, paddingBottom: 40 },
  introFichas: { flexDirection: 'row', gap: 6, marginBottom: 14 },
  titulo: { fontSize: 30, fontFamily: fonts.displaySemi },
  bajada: { fontSize: 13, marginTop: 6, textAlign: 'center', lineHeight: 19 },
  puntajeFinal: { fontSize: 56, fontFamily: fonts.displaySemi },
  veredicto: { fontSize: 20, fontFamily: fonts.displaySemi, textAlign: 'center', marginBottom: 4 },
  aviso: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: 12,
    marginTop: 18,
    maxWidth: 420,
  },
  tarjeta: {
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: 16,
    marginTop: 18,
    gap: 8,
    alignSelf: 'stretch',
    maxWidth: 420,
  },
  boton: { borderRadius: radii.pill, paddingVertical: 14, paddingHorizontal: 34, marginTop: 24 },
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
  grilla: { position: 'relative', alignSelf: 'center' },
  carta: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  cartaFondo: {
    width: '92%',
    height: '92%',
    borderRadius: radii.md,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
