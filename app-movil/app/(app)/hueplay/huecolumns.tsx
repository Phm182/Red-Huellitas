import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { hueplayApi } from '../../../src/api/hueplayApi';
import { APP_TAB_BAR_HEIGHT } from '../../../src/navigation/chrome';
import { crearGestoCaida } from '../../../src/juego/comun/useGestoCaida';
import { borrarPausa, cargarPausa, guardarPausa } from '../../../src/juego/comun/pausaJuego';
import { preguntarContinuar, usePausaAlSalir } from '../../../src/juego/comun/usePausaAlSalir';
import {
  ALTO_OCULTO,
  ALTO_VISIBLE,
  ANCHO,
  EstadoColumns,
  actualizar,
  caidaDura,
  calcularSombra,
  crearEstadoInicial,
  moverTrio,
  restaurarEstado,
  rotarTrio,
} from '../../../src/juego/huecolumns/motor';
import { TableroColumns } from '../../../src/juego/huecolumns/TableroColumns';
import { DiarioResultado, HuePlayProgreso } from '../../../src/types/hueplay';
import { radii } from '../../../src/theme/elevation';
import { centeredContent } from '../../../src/theme/layout';
import { fonts } from '../../../src/theme/typography';
import { useTheme } from '../../../src/theme/ThemeProvider';
import { hapticError, hapticExito, hapticLeve } from '../../../src/utils/haptics';

type Fase = 'listo' | 'jugando' | 'pausado' | 'enviando' | 'fin';

const JUEGO = 'huecolumns';

/**
 * HueColumns: réplica del Columns de Sega Genesis pedida explícitamente,
 * mismo criterio de diseño y misma arquitectura que `huetetris.tsx` (ver su
 * comentario de cabecera) — nivel por TIEMPO en vez de por combos, no por
 * lo que se limpia.
 */
export default function HueColumnsScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const params = useLocalSearchParams<{ desafioId?: string; diario?: string; semilla?: string }>();
  const desafioId = params.desafioId ? Number(params.desafioId) : null;
  const esDiario = params.diario === '1';
  const esRetoAjeno = desafioId !== null || esDiario;

  const [fase, setFase] = useState<Fase>('listo');
  const [, setTick] = useState(0);
  const [celdasFlash, setCeldasFlash] = useState<string[]>([]);
  const [resultado, setResultado] = useState<{
    puntos: number;
    esRecord?: boolean;
    progreso?: HuePlayProgreso;
    duelo?: { misPuntos: number; susPuntos: number | null; gane: boolean | null; rival: string };
    diario?: DiarioResultado;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const estadoRef = useRef<EstadoColumns | null>(null);
  const vivoRef = useRef(true);
  const rafRef = useRef<number | null>(null);
  const ultimoTsRef = useRef<number>(0);
  const terminadoLlamadoRef = useRef(false);
  const gemasVistasRef = useRef(0);

  useEffect(() => {
    vivoRef.current = true;
    return () => {
      vivoRef.current = false;
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // El control es gestual sobre el propio tablero (ver `useGestoCaida.ts`) —
  // no hay fila de botones, sólo el renglón de ayuda de una línea.
  const alturaBarraInferior = APP_TAB_BAR_HEIGHT + Math.max(insets.bottom - 8, 0);
  const ALTURA_HUD = 90;
  const ALTURA_CONTROLES = 40;
  const altoParaTablero = height - alturaBarraInferior - ALTURA_HUD - ALTURA_CONTROLES - 24;
  const anchoDisponible = width - 32 - 150;
  const tileSize = Math.max(10, Math.min(Math.floor(anchoDisponible / ANCHO), Math.floor(altoParaTablero / ALTO_VISIBLE), 34));

  const terminar = useCallback(async () => {
    if (terminadoLlamadoRef.current) return;
    terminadoLlamadoRef.current = true;
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    setFase('enviando');
    hapticError();
    borrarPausa(JUEGO);

    const estado = estadoRef.current;
    const puntos = Math.round(estado?.puntaje ?? 0);
    const segundos = Math.round(estado?.duracionSegundos ?? 0);

    try {
      if (desafioId) {
        const res = await hueplayApi.jugarDesafio(desafioId, puntos, segundos);
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
            duelo: { misPuntos: d.misPuntos ?? puntos, susPuntos: d.susPuntos, gane, rival: d.otro.username || d.otro.nombreCompleto },
          });
        } else {
          setError(res.message ?? t('common.error'));
        }
      } else if (esDiario) {
        const res = await hueplayApi.diarioJugar(JUEGO, puntos, segundos);
        if (!vivoRef.current) return;
        if (res.success && res.data) {
          setResultado({ puntos, progreso: res.data.progreso, diario: res.data });
        } else {
          setError(res.message ?? t('common.error'));
        }
      } else {
        const res = await hueplayApi.guardarPartida(JUEGO, puntos, segundos);
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

  const loop = useCallback(
    (ts: number) => {
      if (!vivoRef.current || !estadoRef.current) return;
      const estado = estadoRef.current;
      const dt = ultimoTsRef.current ? Math.min(0.1, (ts - ultimoTsRef.current) / 1000) : 0;
      ultimoTsRef.current = ts;

      actualizar(estado, dt);

      if (estado.gemasLimpiadas > gemasVistasRef.current) {
        hapticLeve();
        gemasVistasRef.current = estado.gemasLimpiadas;
        const celdas = estado.limpiadasAhora
          .map((clave) => {
            const [f, c] = clave.split(',').map(Number);
            return `${f! - ALTO_OCULTO},${c}`;
          })
          .filter((clave) => Number(clave.split(',')[0]) >= 0);
        setCeldasFlash(celdas);
        setTimeout(() => {
          if (vivoRef.current) setCeldasFlash([]);
        }, 180);
      }
      setTick((n) => n + 1);

      if (estado.terminado) {
        terminar();
        return;
      }
      rafRef.current = requestAnimationFrame(loop);
    },
    [terminar]
  );

  const arrancar = useCallback(() => {
    hapticLeve();
    const semilla = esRetoAjeno && params.semilla ? Number(params.semilla) : Date.now();
    const estado = crearEstadoInicial(semilla);
    estadoRef.current = estado;
    terminadoLlamadoRef.current = false;
    gemasVistasRef.current = 0;
    ultimoTsRef.current = 0;
    setResultado(null);
    setError(null);
    setCeldasFlash([]);
    setFase('jugando');
    rafRef.current = requestAnimationFrame(loop);
  }, [loop, esRetoAjeno, params.semilla]);

  const continuarDesdeGuardado = useCallback(
    (guardado: EstadoColumns) => {
      const estado = restaurarEstado(guardado);
      estadoRef.current = estado;
      terminadoLlamadoRef.current = false;
      gemasVistasRef.current = estado.gemasLimpiadas;
      ultimoTsRef.current = 0;
      setResultado(null);
      setError(null);
      setCeldasFlash([]);
      setFase('jugando');
      rafRef.current = requestAnimationFrame(loop);
    },
    [loop]
  );

  useEffect(() => {
    if (esRetoAjeno) return;
    (async () => {
      const guardado = await cargarPausa<EstadoColumns>(JUEGO);
      if (!guardado || !vivoRef.current) return;
      const continuar = await preguntarContinuar(t);
      if (!vivoRef.current) return;
      if (continuar) continuarDesdeGuardado(guardado);
      else borrarPausa(JUEGO);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pausar = useCallback(() => {
    if (!estadoRef.current) return;
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    hapticLeve();
    guardarPausa(JUEGO, estadoRef.current);
    setFase('pausado');
  }, []);

  const reanudar = useCallback(() => {
    if (!estadoRef.current) return;
    hapticLeve();
    ultimoTsRef.current = 0;
    setFase('jugando');
    rafRef.current = requestAnimationFrame(loop);
  }, [loop]);

  const salirDesdePausa = useCallback(() => {
    router.replace('/(app)/hueplay');
  }, []);

  usePausaAlSalir(
    fase === 'jugando' && !esRetoAjeno,
    useCallback(() => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      if (estadoRef.current) guardarPausa(JUEGO, estadoRef.current);
    }, [])
  );

  const izquierda = useCallback(() => {
    if (estadoRef.current) moverTrio(estadoRef.current, -1, 0);
  }, []);
  const derecha = useCallback(() => {
    if (estadoRef.current) moverTrio(estadoRef.current, 1, 0);
  }, []);
  const rotar = useCallback(() => {
    if (estadoRef.current) rotarTrio(estadoRef.current);
    hapticLeve();
  }, []);
  const caidaInstantanea = useCallback(() => {
    if (estadoRef.current) {
      caidaDura(estadoRef.current);
      hapticExito();
    }
  }, []);

  if (fase === 'listo') {
    return (
      <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={[styles.intro, centeredContent]}>
        <View style={[styles.iconoIntro, { backgroundColor: colors.primarySoft }]}>
          <MaterialCommunityIcons name="diamond-stone" size={40} color={colors.primary} />
        </View>
        <Text style={[styles.titulo, { color: colors.text }]}>{t('hueplay.columns.titulo')}</Text>
        <Text style={[styles.bajada, { color: colors.textMuted }]}>{t('hueplay.columns.comoSeJuega')}</Text>
        <Pressable onPress={arrancar} style={[styles.boton, { backgroundColor: colors.primary }]}>
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
    return (
      <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={[styles.intro, centeredContent]}>
        <Text style={[styles.puntajeFinal, { color: colors.primary }]}>{resultado?.puntos ?? 0}</Text>
        <Text style={[styles.bajada, { color: colors.textMuted }]}>{t('hueplay.match.puntos')}</Text>

        {error ? <Text style={{ color: colors.danger, marginTop: 12, textAlign: 'center' }}>{error}</Text> : null}

        {resultado?.esRecord ? (
          <View style={[styles.aviso, { backgroundColor: colors.primarySoft, borderColor: colors.primary }]}>
            <Ionicons name="trophy" size={16} color={colors.primary} />
            <Text style={{ color: colors.text, fontSize: 13, fontFamily: fonts.bodySemi }}>{t('hueplay.match.nuevoRecord')}</Text>
          </View>
        ) : null}

        {resultado?.duelo ? (
          <View style={[styles.tarjeta, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {resultado.duelo.susPuntos === null ? (
              <Text style={{ color: colors.textMuted, textAlign: 'center' }}>
                {t('hueplay.match.esperandoRival', { rival: resultado.duelo.rival })}
              </Text>
            ) : (
              <>
                <Text
                  style={[
                    styles.veredicto,
                    { color: resultado.duelo.gane === null ? colors.text : resultado.duelo.gane ? colors.success : colors.danger },
                  ]}
                >
                  {resultado.duelo.gane === null
                    ? t('hueplay.match.empate')
                    : resultado.duelo.gane
                      ? t('hueplay.match.ganaste')
                      : t('hueplay.match.perdiste')}
                </Text>
                <Text style={{ color: colors.textMuted, textAlign: 'center' }}>
                  {resultado.duelo.misPuntos} · {resultado.duelo.rival} {resultado.duelo.susPuntos}
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
          {!esRetoAjeno ? (
            <Pressable onPress={arrancar} style={[styles.boton, { backgroundColor: colors.primary, flex: 1 }]}>
              <Text style={[styles.botonTexto, { color: colors.primaryText }]}>{t('hueplay.match.otraVez')}</Text>
            </Pressable>
          ) : null}
          <Pressable onPress={() => router.replace('/(app)/hueplay')} style={[styles.boton, styles.botonSec, { borderColor: colors.border, flex: 1 }]}>
            <Text style={[styles.botonTexto, { color: colors.text }]}>{t('hueplay.volver')}</Text>
          </Pressable>
        </View>
      </ScrollView>
    );
  }

  if (fase === 'pausado') {
    return (
      <View style={[styles.centro, { backgroundColor: colors.background }]}>
        <MaterialCommunityIcons name="pause-circle" size={56} color={colors.primary} />
        <Text style={[styles.titulo, { color: colors.text, marginTop: 12 }]}>{t('hueplay.pausa.titulo')}</Text>
        <View style={styles.botonera}>
          <Pressable onPress={reanudar} style={[styles.boton, { backgroundColor: colors.primary, flex: 1 }]}>
            <Text style={[styles.botonTexto, { color: colors.primaryText }]}>{t('hueplay.pausa.continuar')}</Text>
          </Pressable>
          <Pressable onPress={salirDesdePausa} style={[styles.boton, styles.botonSec, { borderColor: colors.border, flex: 1 }]}>
            <Text style={[styles.botonTexto, { color: colors.text }]}>{t('hueplay.pausa.salir')}</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const estado = estadoRef.current;
  if (!estado) return null;
  const sombra = calcularSombra(estado);

  const gesto = crearGestoCaida({
    tileSize,
    onIzquierda: izquierda,
    onDerecha: derecha,
    onRotar: rotar,
    onCaidaDura: caidaInstantanea,
    activo: fase === 'jugando',
  });

  return (
    <View style={[styles.juego, { backgroundColor: colors.background, paddingBottom: alturaBarraInferior }]}>
      <View style={styles.filaPrincipal}>
        <GestureDetector gesture={gesto}>
          <TableroColumns tablero={estado.tablero} actual={estado.actual} sombra={sombra} tileSize={tileSize} celdasFlash={celdasFlash} />
        </GestureDetector>

        <View style={styles.panelLateral}>
          {!esRetoAjeno ? (
            <Pressable
              onPress={pausar}
              style={[styles.botonPausa, { borderColor: colors.border, backgroundColor: colors.surface }]}
              accessibilityLabel={t('hueplay.pausa.boton')}
            >
              <Ionicons name="pause" size={18} color={colors.text} />
            </Pressable>
          ) : null}
          <View style={[styles.caja, { borderColor: colors.border, backgroundColor: colors.surface }]}>
            <Text style={[styles.cajaLabel, { color: colors.textMuted }]}>{t('hueplay.columns.next')}</Text>
            <View style={styles.previewFila}>
              {estado.siguiente.map((color, i) => (
                <View key={i} style={{ width: 14, height: 14, borderRadius: 4, backgroundColor: color, marginVertical: 1 }} />
              ))}
            </View>
          </View>
          <View style={[styles.caja, { borderColor: colors.border, backgroundColor: colors.surface }]}>
            <Text style={[styles.cajaLabel, { color: colors.textMuted }]}>{t('hueplay.tetris.puntos')}</Text>
            <Text style={[styles.cajaValor, { color: colors.text }]}>{Math.round(estado.puntaje)}</Text>
          </View>
          <View style={[styles.caja, { borderColor: colors.border, backgroundColor: colors.surface }]}>
            <Text style={[styles.cajaLabel, { color: colors.textMuted }]}>{t('hueplay.columns.combo')}</Text>
            <Text style={[styles.cajaValor, { color: colors.text }]}>{estado.combo || '—'}</Text>
          </View>
          <View style={[styles.caja, { borderColor: colors.border, backgroundColor: colors.surface }]}>
            <Text style={[styles.cajaLabel, { color: colors.textMuted }]}>{t('hueplay.tetris.nivel')}</Text>
            <Text style={[styles.cajaValor, { color: colors.text }]}>{estado.nivel}</Text>
          </View>
        </View>
      </View>

      {error ? <Text style={{ color: colors.danger, textAlign: 'center', marginTop: 4 }}>{error}</Text> : null}

      <Text style={[styles.ayudaControles, { color: colors.textMuted }]}>{t('hueplay.columns.ayudaControles')}</Text>
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
  aviso: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: radii.md, padding: 12, marginTop: 18, maxWidth: 420 },
  tarjeta: { borderWidth: 1, borderRadius: radii.lg, padding: 16, marginTop: 18, gap: 8, alignSelf: 'stretch', maxWidth: 420 },
  veredicto: { fontSize: 20, fontFamily: fonts.displaySemi, textAlign: 'center', marginBottom: 4 },
  boton: { borderRadius: radii.pill, paddingVertical: 14, paddingHorizontal: 34, marginTop: 24, alignItems: 'center', justifyContent: 'center' },
  botonSec: { borderWidth: 1, backgroundColor: 'transparent' },
  botonTexto: { fontFamily: fonts.bodySemi, fontSize: 15, textAlign: 'center' },
  botonera: { flexDirection: 'row', gap: 10, alignSelf: 'stretch', maxWidth: 420 },
  juego: { flex: 1, paddingTop: 10, justifyContent: 'space-between', alignItems: 'center' },
  filaPrincipal: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', justifyContent: 'center' },
  panelLateral: { gap: 8, width: 96 },
  botonPausa: { borderWidth: 1.5, borderRadius: radii.sm, padding: 8, alignItems: 'center', justifyContent: 'center' },
  caja: { borderWidth: 1.5, borderRadius: radii.sm, padding: 8, alignItems: 'center' },
  cajaLabel: { fontSize: 9, textTransform: 'uppercase', fontFamily: fonts.bodySemi },
  cajaValor: { fontSize: 18, fontFamily: fonts.displaySemi, marginTop: 2 },
  previewFila: { marginTop: 4, alignItems: 'center' },
  ayudaControles: { fontSize: 11, textAlign: 'center', marginTop: 8 },
});
