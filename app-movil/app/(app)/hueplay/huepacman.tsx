import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { RecordMini } from '../../../src/juego/comun/RecordMini';
import { RecordBadge } from '../../../src/juego/comun/RecordBadge';
import { useRecordJuego } from '../../../src/juego/comun/useRecordJuego';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useGestoDireccion } from '../../../src/juego/comun/useGestoDireccion';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { hueplayApi } from '../../../src/api/hueplayApi';
import { APP_HEADER_HEIGHT, APP_TAB_BAR_HEIGHT } from '../../../src/navigation/chrome';
import { DPad } from '../../../src/juego/huepacman/DPad';
import { JoystickPacman } from '../../../src/juego/huepacman/JoystickPacman';
import { calcularDireccionFantasma } from '../../../src/juego/huepacman/fantasmas';
import { LABERINTOS, LaberintoId, obtenerLaberinto } from '../../../src/juego/huepacman/laberintos';
import {
  ANCHO,
  ALTO,
  Direccion,
  EstadoFantasma,
  EstadoJuego,
  EstadoJuegoSerializado,
  PerfilFantasma,
  crearEstadoInicial,
  actualizar,
  deserializarEstado,
  serializarEstado,
} from '../../../src/juego/huepacman/motor';
import { borrarPausa, cargarPausa, guardarPausa } from '../../../src/juego/comun/pausaJuego';
import { preguntarContinuar, usePausaAlSalir } from '../../../src/juego/comun/usePausaAlSalir';
import { TableroPacman } from '../../../src/juego/huepacman/TableroPacman';
import { DiarioResultado, HuePlayProgreso } from '../../../src/types/hueplay';
import { radii } from '../../../src/theme/elevation';
import { centeredContent } from '../../../src/theme/layout';
import { fonts } from '../../../src/theme/typography';
import { useTheme } from '../../../src/theme/ThemeProvider';
import { hapticCelebracion, hapticError, hapticExito, hapticLeve } from '../../../src/utils/haptics';

type Fase = 'listo' | 'jugando' | 'pausado' | 'enviando' | 'fin';

const JUEGO = 'huepacman';
/** Umbral de arrastre (px) antes de considerar que hubo una intención de
 * dirección — bajo y evaluado en CADA `onUpdate` (no sólo al soltar), a
 * propósito: el pedido explícito fue "el eje dominante gana, sin exigir
 * precisión" (queja previa de esta sesión sobre el carrusel de juegos). */
const UMBRAL_SWIPE = 14;

type PosicionesRender = {
  pacman: { x: number; y: number; dir: Direccion | null };
  fantasmas: { id: PerfilFantasma; color: string; estado: EstadoFantasma; x: number; y: number }[];
};

function snapshotPosiciones(estado: EstadoJuego): PosicionesRender {
  return {
    pacman: { x: estado.pacman.tileX + (estado.pacman.dir ? dxDir(estado.pacman.dir) * estado.pacman.progreso : 0), y: estado.pacman.tileY + (estado.pacman.dir ? dyDir(estado.pacman.dir) * estado.pacman.progreso : 0), dir: estado.pacman.dir },
    fantasmas: estado.fantasmas.map((f) => ({
      id: f.id,
      color: f.color,
      estado: f.estado,
      x: f.tileX + (f.dir ? dxDir(f.dir) * f.progreso : 0),
      y: f.tileY + (f.dir ? dyDir(f.dir) * f.progreso : 0),
    })),
  };
}
// Chiquitos helpers locales en vez de importar `DIRS`/`posicionVisual` de
// `motor.ts` para este único uso — evita tener que exportar el tipo interno
// `Entidad` sólo para esto.
function dxDir(d: Direccion): number {
  return d === 'derecha' ? 1 : d === 'izquierda' ? -1 : 0;
}
function dyDir(d: Direccion): number {
  return d === 'abajo' ? 1 : d === 'arriba' ? -1 : 0;
}

/**
 * HuePacMan: el primer juego de HuePlay en tiempo real (todos los demás son
 * por turnos, o cliente-con-semilla pero sin loop en vivo).
 *
 * El estado del juego vive en un `useRef` MUTABLE (`estadoRef`), no en
 * `useState` — lo actualiza `motor.ts::actualizar()` a mano en cada cuadro
 * de `requestAnimationFrame`. Sólo se reflejan a `useState` (y por lo tanto
 * disparan un re-render) dos cosas separadas, a propósito:
 *
 * 1. `posiciones` — Pac-Man y los 4 fantasmas, cada cuadro (~60/seg): son
 *    apenas 4 objetos chicos, y sólo mueven un puñado de `View`/`Svg`
 *    (`TableroPacman`), así que redibujarlos todo el tiempo es barato.
 * 2. `puntosVisibles`/`pelletsVisibles` — recién cuando de verdad se comió
 *    algo (se compara el tamaño del `Set` antes/después de `actualizar()`).
 *    Los ~145 puntos del laberinto viven en un componente memoizado
 *    (`CapaPuntos`) que como NO cambia de referencia en la mayoría de los
 *    cuadros, React ni se molesta en re-renderizarlo.
 *
 * Si todo (incluidos los 145 puntos) se manejara con `setState` a 60/seg,
 * cada cuadro forzaría reconciliar un árbol mucho más grande sin necesidad.
 */
export default function HuePacManScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  // Desde un duelo 1v1 o el reto del día hay que jugar el laberinto CLÁSICO
  // sí o sí — es el único fijo (el "aleatorio" arma uno distinto cada vez),
  // así que es el único donde el puntaje de dos personas se puede comparar.
  const params = useLocalSearchParams<{ desafioId?: string; diario?: string }>();
  const desafioId = params.desafioId ? Number(params.desafioId) : null;
  const esDiario = params.diario === '1';
  const esRetoAjeno = desafioId !== null || esDiario;

  const [fase, setFase] = useState<Fase>('listo');
  const record = useRecordJuego(JUEGO);
  const [laberintoId, setLaberintoId] = useState<LaberintoId>('clasico');
  // Dimensiones del laberinto de la partida en curso — el clásico y el
  // aleatorio no miden lo mismo, y el tamaño de tile / del tablero se calcula
  // con esto. Arranca en las del clásico y se actualiza en `arrancar()`.
  const [mazeDims, setMazeDims] = useState({ ancho: ANCHO, alto: ALTO });
  const [posiciones, setPosiciones] = useState<PosicionesRender | null>(null);
  const [puntosVisibles, setPuntosVisibles] = useState<Set<string>>(new Set());
  const [pelletsVisibles, setPelletsVisibles] = useState<Set<string>>(new Set());
  const [hud, setHud] = useState({ puntaje: 0, vidas: 3, asustado: false });
  const [resultado, setResultado] = useState<{
    puntos: number;
    esRecord?: boolean;
    progreso?: HuePlayProgreso;
    duelo?: { misPuntos: number; susPuntos: number | null; gane: boolean | null; rival: string };
    diario?: DiarioResultado;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const estadoRef = useRef<EstadoJuego | null>(null);
  const vivoRef = useRef(true);
  const rafRef = useRef<number | null>(null);
  const ultimoTsRef = useRef<number>(0);
  const ganoRef = useRef(false);
  const terminadoLlamadoRef = useRef(false);

  useEffect(() => {
    vivoRef.current = true;
    return () => {
      vivoRef.current = false;
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // La barra de tabs de abajo (con el "dock" flotante de chat/mascotas/+) es
  // un overlay ABSOLUTO por encima de esta pantalla, no algo que empuje el
  // layout — sin descontarla acá, el D-pad terminaba con su botón "abajo"
  // tapado por ella (confirmado en el celular: el botón quedaba imposible
  // de tocar). Mismo criterio que ya usa `huepool.tsx` (`alturaBarraInferior`).
  const alturaBarraInferior = APP_TAB_BAR_HEIGHT + Math.max(insets.bottom - 8, 0);
  // Alto explícito, no flex:1 — ver la nota larga en huetetris.tsx sobre por
  // qué `juego` se quedaba del tamaño de su contenido y el gesto de deslizar
  // no respondía en la parte "vacía" de la pantalla.
  const alturaPantallaJugable = Math.max(0, height - insets.top - APP_HEADER_HEIGHT - alturaBarraInferior);
  const ALTURA_HUD = 64;
  const ALTURA_CONTROLES = 150;
  const altoParaMaze = height - alturaBarraInferior - ALTURA_HUD - ALTURA_CONTROLES - 16;
  // El tile lo limita el ancho O el alto disponible, el que apriete más —
  // los laberintos no son todos del mismo tamaño (clásico 28x31, aleatorio
  // 21x27), así que no alcanza con dividir por el ancho.
  const tilePorAncho = Math.floor((width - 16) / mazeDims.ancho);
  const tilePorAlto = Math.floor(altoParaMaze / mazeDims.alto);
  const tileSize = Math.max(4, Math.min(tilePorAncho, tilePorAlto));

  const terminar = useCallback(async () => {
    if (terminadoLlamadoRef.current) return;
    terminadoLlamadoRef.current = true;
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    setFase('enviando');
    borrarPausa(JUEGO);

    const estado = estadoRef.current;
    const puntos = estado?.puntaje ?? 0;
    const segundos = Math.round(estado?.duracionSegundos ?? 0);
    if (ganoRef.current) hapticCelebracion();
    else hapticError();

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
      const dt = ultimoTsRef.current ? (ts - ultimoTsRef.current) / 1000 : 0;
      ultimoTsRef.current = ts;

      const tamAntes = estado.puntos.size + estado.pellets.size;
      const vidasAntes = estado.vidas;
      const puntajeAntes = estado.puntaje;

      actualizar(estado, dt, calcularDireccionFantasma);

      if (estado.vidas < vidasAntes) hapticError();
      else if (estado.puntaje > puntajeAntes) hapticLeve();

      setPosiciones(snapshotPosiciones(estado));
      setHud({ puntaje: estado.puntaje, vidas: estado.vidas, asustado: estado.asustadoRestante > 0 });

      const tamDespues = estado.puntos.size + estado.pellets.size;
      if (tamDespues !== tamAntes) {
        setPuntosVisibles(new Set(estado.puntos));
        setPelletsVisibles(new Set(estado.pellets));
      }

      if (estado.terminado) {
        ganoRef.current = estado.gano;
        if (estado.gano) hapticExito();
        terminar();
        return;
      }

      rafRef.current = requestAnimationFrame(loop);
    },
    [terminar]
  );

  const arrancar = useCallback(() => {
    hapticLeve();
    // 'aleatorio' arma un laberinto nuevo cada vez que se llama — en un
    // duelo o el reto del día eso no compara nada, así que se fuerza el
    // clásico pase lo que pase con el picker (que además queda oculto).
    const estado = crearEstadoInicial(obtenerLaberinto(esRetoAjeno ? 'clasico' : laberintoId));
    estadoRef.current = estado;
    setMazeDims({ ancho: estado.ancho, alto: estado.alto });
    terminadoLlamadoRef.current = false;
    ganoRef.current = false;
    ultimoTsRef.current = 0;
    setPuntosVisibles(new Set(estado.puntos));
    setPelletsVisibles(new Set(estado.pellets));
    setPosiciones(snapshotPosiciones(estado));
    setHud({ puntaje: 0, vidas: estado.vidas, asustado: false });
    setResultado(null);
    setError(null);
    setFase('jugando');
    rafRef.current = requestAnimationFrame(loop);
  }, [loop, laberintoId, esRetoAjeno]);

  const continuarDesdeGuardado = useCallback(
    (guardado: EstadoJuegoSerializado) => {
      const estado = deserializarEstado(guardado);
      estadoRef.current = estado;
      setMazeDims({ ancho: estado.ancho, alto: estado.alto });
      terminadoLlamadoRef.current = false;
      ganoRef.current = false;
      ultimoTsRef.current = 0;
      setPuntosVisibles(new Set(estado.puntos));
      setPelletsVisibles(new Set(estado.pellets));
      setPosiciones(snapshotPosiciones(estado));
      setHud({ puntaje: estado.puntaje, vidas: estado.vidas, asustado: estado.asustadoRestante > 0 });
      setResultado(null);
      setError(null);
      setFase('jugando');
      rafRef.current = requestAnimationFrame(loop);
    },
    [loop]
  );

  useEffect(() => {
    if (esRetoAjeno) return;
    (async () => {
      const guardado = await cargarPausa<EstadoJuegoSerializado>(JUEGO);
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
    guardarPausa(JUEGO, serializarEstado(estadoRef.current));
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
      if (estadoRef.current) guardarPausa(JUEGO, serializarEstado(estadoRef.current));
    }, [])
  );

  const pedirDireccion = useCallback((dir: Direccion) => {
    if (estadoRef.current) estadoRef.current.pacman.dirDeseada = dir;
  }, []);

  // Swipe TOLERANTE en cualquier parte de la pantalla que no sea un botón
  // (`useGestoDireccion.ts`, PanResponder): se reevalúa en CADA movimiento
  // (no sólo al soltar), así un giro a mitad de gesto cambia de intención
  // sin soltar el dedo — el eje dominante gana apenas supera `UMBRAL_SWIPE`,
  // sin pedir precisión (queja de esta sesión sobre el carrusel de juegos:
  // "no se siente natural" por exigir demasiada exactitud al deslizar).
  const gestoSwipe = useGestoDireccion({
    umbral: UMBRAL_SWIPE,
    onDireccion: pedirDireccion,
    activo: fase === 'jugando',
  });

  if (fase === 'listo') {
    return (
      <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={[styles.intro, centeredContent]}>
        <RecordBadge record={record} />
        <View style={[styles.iconoIntro, { backgroundColor: colors.primarySoft }]}>
          <MaterialCommunityIcons name="pac-man" size={40} color={colors.primary} />
        </View>
        <Text style={[styles.titulo, { color: colors.text }]}>{t('hueplay.pacman.titulo')}</Text>
        <Text style={[styles.bajada, { color: colors.textMuted }]}>{t('hueplay.pacman.comoSeJuega')}</Text>

        {esRetoAjeno ? (
          // Duelo 1v1 o reto del día: siempre el clásico (es el único fijo,
          // el único donde dos puntajes se pueden comparar) — sin picker.
          <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 14, textAlign: 'center' }}>
            {t('hueplay.pacman.mapaClasico')}
          </Text>
        ) : (
          <>
            <Text style={[styles.pickerLabel, { color: colors.textMuted }]}>{t('hueplay.pacman.mapa')}</Text>
            <View style={styles.pickerFila}>
              {LABERINTOS.map((l) => {
                const activo = l.id === laberintoId;
                return (
                  <Pressable
                    key={l.id}
                    onPress={() => {
                      hapticLeve();
                      setLaberintoId(l.id);
                    }}
                    style={[
                      styles.chip,
                      { borderColor: activo ? colors.primary : colors.border, backgroundColor: activo ? colors.primarySoft : 'transparent' },
                    ]}
                  >
                    <Text style={{ color: activo ? colors.primary : colors.textMuted, fontFamily: fonts.bodySemi, fontSize: 13 }}>
                      {l.id === 'clasico' ? t('hueplay.pacman.mapaClasico') : t('hueplay.pacman.mapaAleatorio')}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </>
        )}

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
        <Text style={{ color: colors.textMuted, marginTop: 6, fontSize: 13 }}>
          {ganoRef.current ? t('hueplay.pacman.laberintoLimpio') : t('hueplay.pacman.seAcabaron')}
        </Text>

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
  return (
    <View style={[styles.juego, { backgroundColor: colors.background, height: alturaPantallaJugable, paddingBottom: 16 }]}>
      <View style={[styles.hud, centeredContent]}>
        <View>
          <Text style={[styles.hudLabel, { color: colors.textMuted }]}>{t('hueplay.match.puntos')}</Text>
          <Text style={[styles.hudValor, { color: colors.text }]}>{hud.puntaje}</Text>
          <RecordMini record={record} color={colors.textMuted} />
        </View>
        <View style={styles.vidas}>
          {Array.from({ length: 3 }, (_, i) => (
            <MaterialCommunityIcons key={i} name="pac-man" size={18} color={i < hud.vidas ? '#F5D300' : colors.border} />
          ))}
        </View>
        {!esRetoAjeno ? (
          <Pressable onPress={pausar} style={[styles.botonPausa, { borderColor: colors.border }]} accessibilityLabel={t('hueplay.pausa.boton')}>
            <Ionicons name="pause" size={18} color={colors.text} />
          </Pressable>
        ) : null}
      </View>

      {hud.asustado ? (
        <View style={[styles.pillAsustado, { backgroundColor: colors.primarySoft }]}>
          <Text style={{ color: colors.primary, fontSize: 11, fontFamily: fonts.bodySemi }}>{t('hueplay.pacman.modoAsustado')}</Text>
        </View>
      ) : null}

      {/* Toda esta zona responde al arrastre (jugar deslizando el dedo desde
          cualquier lado que no sea un botón) — antes sólo el tablero
          respondía y el dedo lo tapaba; ahora el espacio libre alrededor
          también sirve para jugar. */}
      <View style={styles.zonaJuego} {...gestoSwipe.panHandlers}>
        <View style={styles.tableroWrap}>
          {estado && posiciones ? (
            <TableroPacman
              paredes={estado.paredes}
              ancho={estado.ancho}
              alto={estado.alto}
              puntos={puntosVisibles}
              pellets={pelletsVisibles}
              pacman={posiciones.pacman}
              fantasmas={posiciones.fantasmas}
              tileSize={tileSize}
            />
          ) : null}
        </View>
      </View>

      {/* Joystick a la izquierda (arrastre continuo, sin levantar el dedo) +
          D-pad chico a la derecha (fallback accesible / toques puntuales).
          Los dos alimentan el mismo `pedirDireccion`. Corrido del centro
          para no quedar debajo del "dock" flotante de la app (botón de Map
          etc.), bug ya visto en el celular. Quedan bien abajo de todo, fuera
          de la zona de arrastre, para no tocarlos sin querer al jugar
          deslizando. */}
      <View style={styles.controles}>
        <JoystickPacman
          onDireccion={pedirDireccion}
          color={colors.primary}
          colorFondo={colors.primarySoft}
          colorPomo={colors.primary}
        />
        <DPad onDireccion={pedirDireccion} color={colors.primary} colorFondo={colors.primarySoft} />
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
  aviso: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: radii.md, padding: 12, marginTop: 18, maxWidth: 420 },
  tarjeta: { borderWidth: 1, borderRadius: radii.lg, padding: 16, marginTop: 18, gap: 8, alignSelf: 'stretch', maxWidth: 420 },
  veredicto: { fontSize: 20, fontFamily: fonts.displaySemi, textAlign: 'center', marginBottom: 4 },
  boton: { borderRadius: radii.pill, paddingVertical: 14, paddingHorizontal: 34, marginTop: 24, alignItems: 'center', justifyContent: 'center' },
  botonSec: { borderWidth: 1, backgroundColor: 'transparent' },
  botonTexto: { fontFamily: fonts.bodySemi, fontSize: 15, textAlign: 'center' },
  botonera: { flexDirection: 'row', gap: 10, alignSelf: 'stretch', maxWidth: 420 },
  juego: { paddingTop: 8, alignItems: 'center' },
  zonaJuego: { flex: 1, alignItems: 'center', justifyContent: 'center', alignSelf: 'stretch' },
  hud: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 18, paddingBottom: 4, width: '100%' },
  hudLabel: { fontSize: 11, textTransform: 'uppercase' },
  hudValor: { fontSize: 24, fontFamily: fonts.displaySemi },
  vidas: { flexDirection: 'row', gap: 4, alignItems: 'center', paddingTop: 6 },
  botonPausa: { borderWidth: 1.5, borderRadius: radii.sm, padding: 8, alignItems: 'center', justifyContent: 'center' },
  pillAsustado: { borderRadius: radii.pill, paddingVertical: 4, paddingHorizontal: 12, marginBottom: 4 },
  tableroWrap: { alignItems: 'center', justifyContent: 'center' },
  controles: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginTop: 4,
    alignSelf: 'flex-start',
    paddingLeft: 12,
  },
  pickerLabel: { fontSize: 11, textTransform: 'uppercase', marginTop: 22, marginBottom: 8, fontFamily: fonts.bodySemi },
  pickerFila: { flexDirection: 'row', gap: 10 },
  chip: { borderWidth: 1.5, borderRadius: radii.pill, paddingVertical: 9, paddingHorizontal: 18 },
});
