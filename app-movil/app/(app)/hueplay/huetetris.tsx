import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { hueplayApi } from '../../../src/api/hueplayApi';
import { APP_HEADER_HEIGHT, APP_TAB_BAR_HEIGHT } from '../../../src/navigation/chrome';
import { useGestoCaida } from '../../../src/juego/comun/useGestoCaida';
import { ControlesCaida } from '../../../src/juego/comun/ControlesCaida';
import { AppMessageModal } from '../../../src/components/AppMessageModal';
import { borrarPausa, cargarPausa, guardarPausa } from '../../../src/juego/comun/pausaJuego';
import { preguntarContinuar, usePausaAlSalir } from '../../../src/juego/comun/usePausaAlSalir';
import {
  ALTO_OCULTO,
  ALTO_VISIBLE,
  ANCHO,
  COLOR_PIEZA,
  EstadoTetris,
  FORMAS,
  PiezaActiva,
  TipoPieza,
  actualizar,
  caidaDura,
  calcularSombra,
  crearEstadoInicial,
  moverPieza,
  restaurarEstado,
  rotarPieza,
} from '../../../src/juego/huetetris/motor';
import { TableroTetris } from '../../../src/juego/huetetris/TableroTetris';
import { Cuadro, PasoAnim, SecuenciaAnim } from '../../../src/juego/comun/secuenciaAnim';
import { DiarioResultado, HuePlayProgreso } from '../../../src/types/hueplay';
import { radii } from '../../../src/theme/elevation';
import { centeredContent } from '../../../src/theme/layout';
import { fonts } from '../../../src/theme/typography';
import { useTheme } from '../../../src/theme/ThemeProvider';
import { hapticError, hapticExito, hapticLeve } from '../../../src/utils/haptics';
import { LIMITE_DIARIO_SEGUNDOS, formatoTiempo } from '../../../src/juego/comun/diario';

type Fase = 'listo' | 'jugando' | 'pausado' | 'enviando' | 'fin';

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
  const [ayudaVisible, setAyudaVisible] = useState(false);
  const [, setTick] = useState(0);
  // Animación de caída rápida y de limpieza de líneas (ver `secuenciaAnim.ts`):
  // mientras corre, el juego está congelado y no se aceptan controles.
  const animRef = useRef(new SecuenciaAnim<TipoPieza, PiezaActiva>());
  // Caída acelerada mientras se mantiene apretado (gesto u botón) — ver `useGestoCaida.ts`.
  const accelRef = useRef(false);
  const [cuadro, setCuadro] = useState<Cuadro<TipoPieza, PiezaActiva> | null>(null);
  const [etiqueta, setEtiqueta] = useState<string | null>(null);
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

  // Dos formas de jugar a la vez, ninguna en reemplazo de la otra: el gesto
  // sobre el propio tablero (`useGestoCaida.ts`) Y la fila de botones de
  // abajo (`ControlesCaida.tsx`) — pedido explícito de mantener las dos.
  const alturaBarraInferior = APP_TAB_BAR_HEIGHT + Math.max(insets.bottom - 8, 0);
  /**
   * Alto real de la zona jugable (entre el header y el menú inferior).
   *
   * `juego` NO puede confiar en `flex: 1` acá: medido en el celular, ese
   * `View` se quedaba del tamaño de su CONTENIDO en vez de estirarse a la
   * pantalla (el tablero quedaba pegado arriba, sin el espacio de sobra que
   * debía repartir `zonaJuego`) — y con eso, el gesto de deslizar sólo
   * respondía sobre el tablero mismo, nunca en el resto de la pantalla que
   * quedaba "vacía" por debajo. Con un alto EXPLÍCITO (mismas cuentas que usa
   * `AppChrome` para su padding) el problema desaparece.
   */
  const alturaPantallaJugable = Math.max(0, height - insets.top - APP_HEADER_HEIGHT - alturaBarraInferior);
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

  /** Arma la animación de limpieza con lo que dejó el motor y lo consume. */
  const reproducirCierre = useCallback(
    (estado: EstadoTetris, ahora: number) => {
      const pasos: PasoAnim<TipoPieza>[] | null | undefined = estado.cierre;
      estado.cierre = null;
      if (!pasos || pasos.length === 0) return;
      hapticLeve();
      lineasVistasRef.current = estado.lineas;
      const n = pasos[0]!.limpiar.length / ANCHO;
      setEtiqueta(
        n >= 4 ? t('hueplay.tetris.tetris') : n === 3 ? t('hueplay.tetris.triple') : n === 2 ? t('hueplay.tetris.doble') : null
      );
      animRef.current.iniciarPasos(pasos, ahora);
    },
    [t]
  );

  const loop = useCallback(
    (ts: number) => {
      if (!vivoRef.current || !estadoRef.current) return;
      const estado = estadoRef.current;
      const dt = ultimoTsRef.current ? Math.min(0.1, (ts - ultimoTsRef.current) / 1000) : 0;
      ultimoTsRef.current = ts;

      const anim = animRef.current;
      const ahora = performance.now();
      if (anim.activa()) {
        // Congelado mientras se anima: sólo se dibuja el cuadro que toca.
        setCuadro(anim.cuadro(ahora));
        setTick((n) => n + 1);
        rafRef.current = requestAnimationFrame(loop);
        return;
      }
      setCuadro((c) => (c ? null : c));

      actualizar(estado, dt, accelRef.current);
      if (estado.cierre) {
        reproducirCierre(estado, ahora);
      }
      // Reto del día: la partida se corta a los 3 minutos con lo sumado hasta ahí.
      if (esDiario && !estado.terminado && estado.duracionSegundos >= LIMITE_DIARIO_SEGUNDOS) {
        estado.duracionSegundos = LIMITE_DIARIO_SEGUNDOS;
        estado.terminado = true;
      }

      setTick((n) => n + 1);

      if (estado.terminado) {
        terminar();
        return;
      }
      rafRef.current = requestAnimationFrame(loop);
    },
    [terminar, esDiario, reproducirCierre]
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
    animRef.current.reiniciar();
    accelRef.current = false;
    setCuadro(null);
    setFase('jugando');
    rafRef.current = requestAnimationFrame(loop);
  }, [loop, esRetoAjeno, params.semilla]);

  const continuarDesdeGuardado = useCallback(
    (guardado: EstadoTetris) => {
      const estado = restaurarEstado(guardado);
      estadoRef.current = estado;
      terminadoLlamadoRef.current = false;
      lineasVistasRef.current = estado.lineas;
      ultimoTsRef.current = 0;
      setResultado(null);
      setError(null);
      animRef.current.reiniciar();
      accelRef.current = false;
      setCuadro(null);
      setFase('jugando');
      rafRef.current = requestAnimationFrame(loop);
    },
    [loop]
  );

  // Al entrar a la pantalla (sólo en modo solo, nunca en duelo/reto del día):
  // si hay una partida pausada guardada, preguntar si seguir desde ahí.
  useEffect(() => {
    if (esRetoAjeno) return;
    (async () => {
      const guardado = await cargarPausa<EstadoTetris>(JUEGO);
      if (!guardado || !vivoRef.current) return;
      const continuar = await preguntarContinuar(t);
      if (!vivoRef.current) return;
      if (continuar) continuarDesdeGuardado(guardado);
      else borrarPausa(JUEGO);
    })();
    // Sólo al montar: `continuarDesdeGuardado`/`t` cambian de identidad en
    // cada render pero acá sólo importa la versión de la primera pasada.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pausar = useCallback(() => {
    if (!estadoRef.current) return;
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    hapticLeve();
    accelRef.current = false;
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

  // Botón atrás / gesto de swipe-back / flecha del header: preguntar si
  // pausar antes de salir, sólo mientras se está jugando de verdad una
  // partida solo (no tiene sentido en duelo/reto del día ni en las otras fases).
  usePausaAlSalir(
    fase === 'jugando' && !esRetoAjeno,
    useCallback(() => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      if (estadoRef.current) guardarPausa(JUEGO, estadoRef.current);
    }, [])
  );

  const acelerarInicio = useCallback(() => {
    // Sin este reseteo, el tiempo que ya se había acumulado a la velocidad
    // NORMAL (todavía sin llegar a bajar un casillero) se comparaba de
    // golpe contra el intervalo acelerado, mucho más chico, y el `while` de
    // `actualizar()` lo consumía todo en el mismo cuadro — un salto de
    // varios casilleros apenas arrancaba a acelerar. Empieza limpio, desde
    // donde está.
    if (!animRef.current.activa() && estadoRef.current) {
      estadoRef.current.tiempoCaidaAcumulado = 0;
      accelRef.current = true;
    }
  }, []);
  const acelerarFin = useCallback(() => {
    accelRef.current = false;
  }, []);

  const izquierda = useCallback(() => {
    if (estadoRef.current && !animRef.current.activa()) moverPieza(estadoRef.current, -1, 0);
  }, []);
  const derecha = useCallback(() => {
    if (estadoRef.current && !animRef.current.activa()) moverPieza(estadoRef.current, 1, 0);
  }, []);
  const rotar = useCallback(() => {
    if (estadoRef.current && !animRef.current.activa()) rotarPieza(estadoRef.current);
    hapticLeve();
  }, []);
  const caidaInstantanea = useCallback(() => {
    const estado = estadoRef.current;
    if (!estado || estado.terminado || animRef.current.activa()) return;
    // La pieza baja rápido hasta apoyarse y recién ahí se fija (y limpia, si
    // corresponde) — así se ve qué pasó en vez de aparecer todo cambiado.
    const sombraFinal = calcularSombra(estado);
    const pieza = { ...estado.actual };
    animRef.current.iniciarCaida(pieza, pieza.y, sombraFinal.y, performance.now(), () => {
      const e = estadoRef.current;
      if (!e) return;
      caidaDura(e);
      hapticExito();
      reproducirCierre(e, performance.now());
    });
  }, [reproducirCierre]);

  // Es un hook (usa `useSharedValue` por dentro) -- tiene que llamarse acá,
  // ANTES de cualquier `return` condicional de abajo, no después.
  const gesto = useGestoCaida({
    tileSize,
    onIzquierda: izquierda,
    onDerecha: derecha,
    onRotar: rotar,
    onCaidaDura: caidaInstantanea,
    onAcelerarInicio: acelerarInicio,
    onAcelerarFin: acelerarFin,
    activo: fase === 'jugando',
  });

  if (fase === 'listo') {
    return (
      <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={[styles.intro, centeredContent]}>
        <View style={[styles.iconoIntro, { backgroundColor: colors.primarySoft }]}>
          <MaterialCommunityIcons name="view-grid" size={40} color={colors.primary} />
        </View>
        <Text style={[styles.titulo, { color: colors.text }]}>{t('hueplay.tetris.titulo')}</Text>
        <Text style={[styles.bajada, { color: colors.textMuted }]}>{t('hueplay.tetris.comoSeJuega')}</Text>
        {esDiario ? (
          <Text style={[styles.bajada, { color: colors.primary, fontWeight: '600' }]}>{t('hueplay.diario.reglaTiempo')}</Text>
        ) : null}
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
  const siguienteForma = FORMAS[estado.siguiente][0]!;

  return (
    <View style={[styles.juego, { backgroundColor: colors.background, height: alturaPantallaJugable, paddingBottom: 40 }]}>
      {/* Toda esta zona responde al arrastre (jugar deslizando el dedo desde
          cualquier lado que no sea un botón); los botones son `Pressable`
          propios y reclaman el toque antes que este `PanResponder`, así que
          conviven sin pisarse. */}
      <View
        style={styles.zonaJuego}
        {...gesto.panHandlers}
      >
      <View style={styles.filaPrincipal}>
        <TableroTetris
          tablero={estado.tablero}
          actual={estado.actual}
          sombra={sombra}
          siguiente={estado.siguiente}
          tileSize={tileSize}
          cuadro={cuadro}
          etiqueta={etiqueta}
        />

        <View style={styles.panelLateral}>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {!esRetoAjeno ? (
              <Pressable
                onPress={pausar}
                style={[styles.botonPausa, { borderColor: colors.border, backgroundColor: colors.surface, flex: 1 }]}
                accessibilityLabel={t('hueplay.pausa.boton')}
              >
                <Ionicons name="pause" size={18} color={colors.text} />
              </Pressable>
            ) : null}
            <Pressable
              onPress={() => setAyudaVisible(true)}
              style={[styles.botonPausa, { borderColor: colors.border, backgroundColor: colors.surface, flex: 1 }]}
              accessibilityLabel={t('hueplay.comoSeJuegaTitulo')}
            >
              <Ionicons name="help-circle-outline" size={18} color={colors.text} />
            </Pressable>
          </View>
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
          {esDiario ? (
            <View style={[styles.caja, { borderColor: colors.primary, backgroundColor: colors.surface }]}>
              <Text style={[styles.cajaLabel, { color: colors.textMuted }]}>{t('hueplay.diario.tiempo')}</Text>
              <Text style={[styles.cajaValor, { color: colors.text }]}>
                {formatoTiempo(LIMITE_DIARIO_SEGUNDOS - estado.duracionSegundos)}
              </Text>
            </View>
          ) : null}
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
      </View>

      {error ? <Text style={{ color: colors.danger, textAlign: 'center', marginTop: 4 }}>{error}</Text> : null}

      <ControlesCaida
        onIzquierda={izquierda}
        onDerecha={derecha}
        onRotar={rotar}
        onCaidaDura={caidaInstantanea}
        onAcelerarInicio={acelerarInicio}
        onAcelerarFin={acelerarFin}
        color={colors.primary}
        colorFondo={colors.primarySoft}
      />

      <AppMessageModal
        visible={ayudaVisible}
        title={t('hueplay.comoSeJuegaTitulo')}
        message={t('hueplay.tetris.ayudaControles')}
        onClose={() => setAyudaVisible(false)}
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
  juego: { paddingTop: 10, alignItems: 'center' },
  zonaJuego: { flex: 1, alignItems: 'center', justifyContent: 'center', alignSelf: 'stretch' },
  filaPrincipal: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', justifyContent: 'center' },
  panelLateral: { gap: 8, width: 96 },
  botonPausa: { borderWidth: 1.5, borderRadius: radii.sm, padding: 8, alignItems: 'center', justifyContent: 'center' },
  caja: { borderWidth: 1.5, borderRadius: radii.sm, padding: 8, alignItems: 'center' },
  cajaLabel: { fontSize: 9, textTransform: 'uppercase', fontFamily: fonts.bodySemi },
  cajaValor: { fontSize: 18, fontFamily: fonts.displaySemi, marginTop: 2 },
  previewGrilla: { marginTop: 4 },
  ayudaControles: { fontSize: 11, textAlign: 'center', marginTop: 8 },
});
