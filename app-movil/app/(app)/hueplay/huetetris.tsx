import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { hueplayApi } from '../../../src/api/hueplayApi';
import { APP_TAB_BAR_HEIGHT } from '../../../src/navigation/chrome';
import { ControlesCaida } from '../../../src/juego/comun/ControlesCaida';
import {
  ALTO_OCULTO,
  ALTO_VISIBLE,
  ANCHO,
  COLOR_PIEZA,
  EstadoTetris,
  FORMAS,
  actualizar,
  caidaDura,
  calcularSombra,
  crearEstadoInicial,
  moverPieza,
  rotarPieza,
} from '../../../src/juego/huetetris/motor';
import { TableroTetris } from '../../../src/juego/huetetris/TableroTetris';
import { DiarioResultado, HuePlayProgreso } from '../../../src/types/hueplay';
import { radii } from '../../../src/theme/elevation';
import { centeredContent } from '../../../src/theme/layout';
import { fonts } from '../../../src/theme/typography';
import { useTheme } from '../../../src/theme/ThemeProvider';
import { hapticError, hapticExito, hapticLeve } from '../../../src/utils/haptics';

type Fase = 'listo' | 'jugando' | 'enviando' | 'fin';

const JUEGO = 'huetetris';

/**
 * HueTetris: réplica del Tetris de Sega Genesis pedida explícitamente (marco
 * metálico con remaches, paño oscuro, HUD con NEXT/LINE/LEVEL) — con una
 * decisión de diseño distinta a propósito, pedida por el usuario: el nivel
 * NO sube cada 10 líneas como en el original, sube cada
 * `SEGUNDOS_POR_NIVEL` segundos de partida (ver `motor.ts`), mismo criterio
 * que HueColumns.
 *
 * Mismo patrón que `huepacman.tsx` (primer juego en tiempo real de HuePlay):
 * el estado vive en un `useRef` mutable que actualiza `motor.ts::actualizar()`
 * cuadro a cuadro; un contador (`tick`) fuerza el re-render sin copiar todo
 * el tablero — acá no hace falta la separación fina que sí hace pacman (145
 * puntos vs. un tablero de 10x20), el volumen es mucho menor.
 */
export default function HueTetrisScreen() {
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
  // Filas recién limpiadas, para el flash blanco de festejo (~180ms). El
  // motor sólo deja `lineasLimpiadasAhora` con contenido durante UN cuadro
  // de física (se vacía al arrancar el siguiente `actualizar()`), así que
  // si el flash dependiera directo de eso duraría ~16ms — imperceptible.
  // Acá se lo estira a mano con `setTimeout`, mismo criterio que
  // `MesaPool.tsx::hundiendo` en HuePool.
  const [filasFlash, setFilasFlash] = useState<number[]>([]);
  const [resultado, setResultado] = useState<{
    puntos: number;
    esRecord?: boolean;
    progreso?: HuePlayProgreso;
    duelo?: { misPuntos: number; susPuntos: number | null; gane: boolean | null; rival: string };
    diario?: DiarioResultado;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const estadoRef = useRef<EstadoTetris | null>(null);
  const vivoRef = useRef(true);
  const rafRef = useRef<number | null>(null);
  const ultimoTsRef = useRef<number>(0);
  const terminadoLlamadoRef = useRef(false);
  const lineasVistasRef = useRef(0);

  useEffect(() => {
    vivoRef.current = true;
    return () => {
      vivoRef.current = false;
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const alturaBarraInferior = APP_TAB_BAR_HEIGHT + Math.max(insets.bottom - 8, 0);
  const ALTURA_HUD = 90;
  const ALTURA_CONTROLES = 130;
  const altoParaTablero = height - alturaBarraInferior - ALTURA_HUD - ALTURA_CONTROLES - 24;
  const anchoDisponible = width - 32 - 150; // deja lugar a la columna de NEXT/LINE/LEVEL al costado
  const tileSize = Math.max(8, Math.min(Math.floor(anchoDisponible / ANCHO), Math.floor(altoParaTablero / ALTO_VISIBLE), 26));

  const terminar = useCallback(async () => {
    if (terminadoLlamadoRef.current) return;
    terminadoLlamadoRef.current = true;
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    setFase('enviando');
    hapticError();

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

      if (estado.lineas > lineasVistasRef.current) {
        hapticLeve();
        lineasVistasRef.current = estado.lineas;
        const filas = estado.lineasLimpiadasAhora.map((f) => f - ALTO_OCULTO).filter((f) => f >= 0);
        setFilasFlash(filas);
        setTimeout(() => {
          if (vivoRef.current) setFilasFlash([]);
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
    // En duelo/reto del día, la semilla la manda SIEMPRE el servidor (se
    // ignora cualquier otra cosa) — es lo único que garantiza que los dos
    // jueguen la MISMA secuencia de piezas, mismo criterio que HuePacMan
    // fuerza el laberinto clásico.
    const semilla = esRetoAjeno && params.semilla ? Number(params.semilla) : Date.now();
    const estado = crearEstadoInicial(semilla);
    estadoRef.current = estado;
    terminadoLlamadoRef.current = false;
    lineasVistasRef.current = 0;
    ultimoTsRef.current = 0;
    setResultado(null);
    setError(null);
    setFilasFlash([]);
    setFase('jugando');
    rafRef.current = requestAnimationFrame(loop);
  }, [loop, esRetoAjeno, params.semilla]);

  const izquierda = useCallback(() => {
    if (estadoRef.current) moverPieza(estadoRef.current, -1, 0);
  }, []);
  const derecha = useCallback(() => {
    if (estadoRef.current) moverPieza(estadoRef.current, 1, 0);
  }, []);
  const rotar = useCallback(() => {
    if (estadoRef.current) rotarPieza(estadoRef.current);
    hapticLeve();
  }, []);
  const caidaRapida = useCallback((activa: boolean) => {
    if (estadoRef.current) estadoRef.current.cayendoRapido = activa;
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
          <MaterialCommunityIcons name="view-grid" size={40} color={colors.primary} />
        </View>
        <Text style={[styles.titulo, { color: colors.text }]}>{t('hueplay.tetris.titulo')}</Text>
        <Text style={[styles.bajada, { color: colors.textMuted }]}>{t('hueplay.tetris.comoSeJuega')}</Text>
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

  const estado = estadoRef.current;
  if (!estado) return null;
  const sombra = calcularSombra(estado);
  const siguienteForma = FORMAS[estado.siguiente][0]!;

  return (
    <View style={[styles.juego, { backgroundColor: colors.background, paddingBottom: alturaBarraInferior }]}>
      <View style={styles.filaPrincipal}>
        <TableroTetris
          tablero={estado.tablero}
          actual={estado.actual}
          sombra={sombra}
          siguiente={estado.siguiente}
          tileSize={tileSize}
          filasFlash={filasFlash}
        />

        <View style={styles.panelLateral}>
          <View style={[styles.caja, { borderColor: colors.border, backgroundColor: colors.surface }]}>
            <Text style={[styles.cajaLabel, { color: colors.textMuted }]}>{t('hueplay.tetris.next')}</Text>
            <View style={styles.previewGrilla}>
              {siguienteForma.map((fila, f) => (
                <View key={f} style={{ flexDirection: 'row' }}>
                  {fila.split('').map((c, col) => (
                    <View
                      key={col}
                      style={{
                        width: 12,
                        height: 12,
                        margin: 1,
                        backgroundColor: c === 'X' ? COLOR_PIEZA[estado.siguiente] : 'transparent',
                        borderRadius: 2,
                      }}
                    />
                  ))}
                </View>
              ))}
            </View>
          </View>
          <View style={[styles.caja, { borderColor: colors.border, backgroundColor: colors.surface }]}>
            <Text style={[styles.cajaLabel, { color: colors.textMuted }]}>{t('hueplay.tetris.puntos')}</Text>
            <Text style={[styles.cajaValor, { color: colors.text }]}>{Math.round(estado.puntaje)}</Text>
          </View>
          <View style={[styles.caja, { borderColor: colors.border, backgroundColor: colors.surface }]}>
            <Text style={[styles.cajaLabel, { color: colors.textMuted }]}>{t('hueplay.tetris.lineas')}</Text>
            <Text style={[styles.cajaValor, { color: colors.text }]}>{estado.lineas}</Text>
          </View>
          <View style={[styles.caja, { borderColor: colors.border, backgroundColor: colors.surface }]}>
            <Text style={[styles.cajaLabel, { color: colors.textMuted }]}>{t('hueplay.tetris.nivel')}</Text>
            <Text style={[styles.cajaValor, { color: colors.text }]}>{estado.nivel}</Text>
          </View>
        </View>
      </View>

      {error ? <Text style={{ color: colors.danger, textAlign: 'center', marginTop: 4 }}>{error}</Text> : null}

      <ControlesCaida
        onIzquierda={izquierda}
        onDerecha={derecha}
        onRotar={rotar}
        onCaidaRapida={caidaRapida}
        onCaidaDura={caidaInstantanea}
        color={colors.primary}
        colorFondo={colors.primarySoft}
      />
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
  caja: { borderWidth: 1.5, borderRadius: radii.sm, padding: 8, alignItems: 'center' },
  cajaLabel: { fontSize: 9, textTransform: 'uppercase', fontFamily: fonts.bodySemi },
  cajaValor: { fontSize: 18, fontFamily: fonts.displaySemi, marginTop: 2 },
  previewGrilla: { marginTop: 4 },
});
