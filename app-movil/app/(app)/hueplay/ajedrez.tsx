import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import { hueplayApi } from '../../../src/api/hueplayApi';
import { CelebracionPatitas } from '../../../src/juego/comun/CelebracionPatitas';
import { PiezaActivaAjedrez, PiezaComiendoseAjedrez, TableroAjedrez } from '../../../src/juego/hueajedrez/TableroAjedrez';
import { TipoPieza } from '../../../src/juego/hueajedrez/PiezaAjedrez';
import { Casilla, HuePlayDesafio, JugadaAjedrez, MovimientoLegalAjedrez } from '../../../src/types/hueplay';
import { radii } from '../../../src/theme/elevation';
import { centeredContent } from '../../../src/theme/layout';
import { fonts } from '../../../src/theme/typography';
import { useTheme } from '../../../src/theme/ThemeProvider';
import { hapticCelebracion, hapticError, hapticLeve, hapticMedio } from '../../../src/utils/haptics';

/** Cada cuánto se le pregunta al servidor si el rival humano movió. */
const POLL_MS = 4000;

/** Cuánto dura, en pantalla, el deslizamiento de una jugada. */
const MS_ANIMACION = 320;

function esperar(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Arma la lista de piezas a partir del string de 64 casillas (los primeros
 *  64 caracteres del tablero — el resto es el estado extra de enroque/al
 *  paso, que esta pantalla nunca necesita leer directo). Sólo se usa para el
 *  primer render y para reconciliar un tablero que cambió sin detalle de la
 *  jugada (el rival humano movió mientras hacíamos polling). */
function piezasDesdeTablero(tablero: string): PiezaActivaAjedrez[] {
  const piezas: PiezaActivaAjedrez[] = [];
  for (let i = 0; i < 64; i++) {
    const c = tablero[i];
    if (c === '.') continue;
    piezas.push({
      id: `p${i}`,
      fila: Math.floor(i / 8),
      col: i % 8,
      lado: c === c.toUpperCase() ? 1 : 2,
      tipo: c.toUpperCase() as TipoPieza,
    });
  }
  return piezas;
}

/**
 * HueAjedrez: el ajedrez de HuePlay, por turnos contra otra persona o contra
 * la IA de la app. Reglas completas (jaque, jaque mate, ahogado, enroque, al
 * paso, promoción automática a dama) — el servidor decide todo.
 */
export default function AjedrezScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const params = useLocalSearchParams<{ desafioId?: string }>();
  const desafioId = params.desafioId ? Number(params.desafioId) : 0;

  const [desafio, setDesafio] = useState<HuePlayDesafio | null>(null);
  const [piezas, setPiezas] = useState<PiezaActivaAjedrez[]>([]);
  const [piezasComiendose, setPiezasComiendose] = useState<PiezaComiendoseAjedrez[]>([]);
  const [movimientosLegales, setMovimientosLegales] = useState<MovimientoLegalAjedrez[]>([]);
  const [enJaque, setEnJaque] = useState(false);
  const [seleccion, setSeleccion] = useState<Casilla | null>(null);
  const [destinosLegales, setDestinosLegales] = useState<Casilla[]>([]);
  const [cargando, setCargando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [puntosGanados, setPuntosGanados] = useState<number | null>(null);
  const [celebrar, setCelebrar] = useState(false);
  const [avisoJaque, setAvisoJaque] = useState(false);

  const vivoRef = useRef(true);
  const animandoRef = useRef(false);
  const tableroRef = useRef<string>('');
  const celebradoRef = useRef(false);
  const sacudida = useSharedValue(0);

  useEffect(() => {
    vivoRef.current = true;
    return () => {
      vivoRef.current = false;
    };
  }, []);

  const cargar = useCallback(async () => {
    if (!desafioId) return;
    const res = await hueplayApi.verDesafioAjedrez(desafioId);
    if (!vivoRef.current) return;

    if (res.success && res.data) {
      setError(null);
      const nuevoTablero = res.data.desafio.tablero ?? '';
      if (!animandoRef.current && nuevoTablero !== tableroRef.current) {
        setPiezas(piezasDesdeTablero(nuevoTablero));
        setPiezasComiendose([]);
        tableroRef.current = nuevoTablero;
      }
      setDesafio(res.data.desafio);
      setMovimientosLegales(res.data.movimientosLegales);
      setEnJaque(res.data.enJaque);
    } else {
      setError(res.message ?? t('common.error'));
    }
    setCargando(false);
  }, [desafioId, t]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  // Mientras es turno del rival humano se pregunta cada tanto — nunca hace
  // falta contra la IA, que ya respondió en el mismo pedido que la jugó.
  useEffect(() => {
    if (!desafio) return;
    const terminado = desafio.estado === 'terminado' || desafio.estado === 'expirado';
    if (terminado || desafio.esMiTurno || desafio.esRivalIA) return;

    const id = setInterval(cargar, POLL_MS);
    return () => clearInterval(id);
  }, [desafio, cargar]);

  // El resultado se calcula solo, sin importar cómo se enteró la pantalla:
  // sólo hay dos jugadores, así que si el ganador no es "el otro", gané yo.
  // `ganadorUserId === null` con el duelo terminado es tablas (ahogado).
  useEffect(() => {
    if (!desafio || celebradoRef.current) return;
    if (desafio.estado !== 'terminado') return;
    celebradoRef.current = true;
    if (desafio.ganadorUserId === null) {
      hapticLeve();
      return;
    }
    const gane = desafio.ganadorUserId !== desafio.otro.userId;
    if (gane) {
      hapticCelebracion();
      setCelebrar(true);
    } else {
      hapticError();
      sacudida.value = withSequence(
        withTiming(-8, { duration: 60 }),
        withTiming(8, { duration: 100 }),
        withTiming(-6, { duration: 100 }),
        withTiming(0, { duration: 80 })
      );
    }
  }, [desafio, sacudida]);

  /** Aplica una jugada (mover, comer, enroque, promoción) sobre las piezas en pantalla. */
  const aplicarJugada = useCallback((jugada: JugadaAjedrez) => {
    if (jugada.captura) {
      const { fila: cf, col: cc } = jugada.captura;
      setPiezas((prev) => {
        const comida = prev.find((p) => p.fila === cf && p.col === cc);
        if (comida) {
          setPiezasComiendose((antes) => [
            ...antes,
            { ...comida, onTerminada: () => setPiezasComiendose((a) => a.filter((x) => x.id !== comida.id)) },
          ]);
        }
        return prev.filter((p) => !(p.fila === cf && p.col === cc));
      });
    }

    setPiezas((prev) =>
      prev.map((p) =>
        p.fila === jugada.desde.fila && p.col === jugada.desde.col
          ? { ...p, fila: jugada.hasta.fila, col: jugada.hasta.col, tipo: jugada.corono ? 'Q' : p.tipo }
          : p
      )
    );

    if (jugada.enroque) {
      const { torreDesde, torreHasta } = jugada.enroque;
      setPiezas((prev) =>
        prev.map((p) =>
          p.fila === torreDesde.fila && p.col === torreDesde.col
            ? { ...p, fila: torreHasta.fila, col: torreHasta.col }
            : p
        )
      );
    }

    if (jugada.jaque) {
      setAvisoJaque(true);
      setTimeout(() => {
        if (vivoRef.current) setAvisoJaque(false);
      }, 1400);
    }
  }, []);

  const onTocarCasilla = useCallback(
    async (fila: number, col: number) => {
      if (!desafio?.esMiTurno || enviando) return;

      if (seleccion && seleccion.fila === fila && seleccion.col === col) {
        setSeleccion(null);
        setDestinosLegales([]);
        return;
      }

      const pieza = piezas.find((p) => p.fila === fila && p.col === col);
      const miLado: 1 | 2 = desafio.soyRetador ? 1 : 2;

      if (pieza && pieza.lado === miLado) {
        const legalesDeEsta = movimientosLegales.filter((m) => m.desde.fila === fila && m.desde.col === col);
        if (legalesDeEsta.length === 0) {
          hapticError();
          return;
        }
        hapticLeve();
        setSeleccion({ fila, col });
        setDestinosLegales(legalesDeEsta.map((m) => m.hasta));
        return;
      }

      if (!seleccion) return;

      const movimiento = movimientosLegales.find(
        (m) =>
          m.desde.fila === seleccion.fila &&
          m.desde.col === seleccion.col &&
          m.hasta.fila === fila &&
          m.hasta.col === col
      );
      if (!movimiento) {
        hapticError();
        return;
      }

      const desde = seleccion;
      setSeleccion(null);
      setDestinosLegales([]);
      setEnviando(true);
      setPuntosGanados(null);
      hapticMedio();
      animandoRef.current = true;

      const res = await hueplayApi.jugarAjedrez(desafioId, desde, { fila, col });
      if (!vivoRef.current) return;

      if (!res.success || !res.data) {
        animandoRef.current = false;
        setEnviando(false);
        setError(res.message ?? t('common.error'));
        cargar();
        return;
      }

      aplicarJugada(res.data.jugada);
      await esperar(MS_ANIMACION);
      if (res.data.jugadaIA) {
        await esperar(200);
        aplicarJugada(res.data.jugadaIA);
        await esperar(MS_ANIMACION);
      }
      if (!vivoRef.current) return;

      tableroRef.current = res.data.desafio.tablero ?? '';
      setDesafio(res.data.desafio);
      if (res.data.progreso) {
        setPuntosGanados(res.data.progreso.puntosGanados ?? null);
      }

      animandoRef.current = false;
      setEnviando(false);

      // Sólo pasa contra la IA: le vuelve a tocar al humano en el mismo
      // intercambio, y `ajedrez_mover.php` no manda los movimientos legales
      // de ese turno nuevo (sólo `ajedrez_ver.php` los calcula).
      if (res.data.desafio.esMiTurno && !res.data.gane && !res.data.perdiste && !res.data.tablas) {
        const vista = await hueplayApi.verDesafioAjedrez(desafioId);
        if (vivoRef.current && vista.success && vista.data) {
          setMovimientosLegales(vista.data.movimientosLegales);
          setEnJaque(vista.data.enJaque);
        }
      } else {
        setMovimientosLegales([]);
      }
    },
    [desafio, desafioId, enviando, piezas, seleccion, movimientosLegales, aplicarJugada, cargar, t]
  );

  const estiloSacudida = useAnimatedStyle(() => ({
    transform: [{ translateX: sacudida.value }],
  }));

  if (cargando) {
    return (
      <View style={[styles.centro, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!desafio) {
    return (
      <View style={[styles.centro, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.danger }}>{error ?? t('common.error')}</Text>
      </View>
    );
  }

  const miLado: 1 | 2 = desafio.soyRetador ? 1 : 2;
  const terminado = desafio.estado === 'terminado' || desafio.estado === 'expirado';
  const tablas = terminado && desafio.ganadorUserId === null;
  const gane = terminado && !tablas && desafio.ganadorUserId !== desafio.otro.userId;
  const tamanoTablero = Math.min(width - 24, 400);
  const rival = desafio.otro.username ? `@${desafio.otro.username}` : desafio.otro.nombreCompleto;
  const miRey = piezas.find((p) => p.lado === miLado && p.tipo === 'K');
  const casillaJaque = enJaque && miRey ? { fila: miRey.fila, col: miRey.col } : null;

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[styles.contenido, centeredContent]}
    >
      <View style={[styles.marcador, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.jugador}>
          <Text style={{ fontSize: 20 }}>{miLado === 1 ? '♔' : '♚'}</Text>
          <Text style={{ color: colors.text, fontFamily: fonts.bodySemi }}>{t('hueplay.ajedrez.vos')}</Text>
        </View>
        <Text style={{ color: colors.textMuted, fontSize: 12 }}>
          {t('hueplay.ajedrez.jugadas', { n: desafio.movimientos })}
        </Text>
        <View style={styles.jugador}>
          <Text style={{ color: colors.text, fontFamily: fonts.bodySemi }} numberOfLines={1}>
            {desafio.esRivalIA ? t('hueplay.jugandoContraIA') : rival}
          </Text>
          <Text style={{ fontSize: 20 }}>{miLado === 1 ? '♚' : '♔'}</Text>
        </View>
      </View>

      <Animated.View
        style={[
          styles.aviso,
          {
            backgroundColor: terminado
              ? colors.surface
              : desafio.esMiTurno
                ? colors.primarySoft
                : colors.surface,
            borderColor: desafio.esMiTurno && !terminado ? colors.primary : colors.border,
          },
          estiloSacudida,
        ]}
      >
        {!terminado && !desafio.esMiTurno ? (
          <ActivityIndicator size="small" color={colors.textMuted} />
        ) : (
          <Ionicons
            name={terminado ? 'flag' : enJaque ? 'warning' : 'hand-left'}
            size={16}
            color={terminado ? colors.textMuted : enJaque ? colors.danger : colors.primary}
          />
        )}
        <Text style={{ color: colors.text, fontSize: 13, flex: 1 }}>
          {terminado
            ? tablas
              ? t('hueplay.ajedrez.empateFin')
              : gane
                ? puntosGanados !== null
                  ? t('hueplay.ajedrez.ganasteFinPuntos', { puntos: puntosGanados })
                  : t('hueplay.ajedrez.ganasteFin')
                : t('hueplay.ajedrez.perdisteFin')
            : desafio.esMiTurno
              ? enJaque
                ? t('hueplay.ajedrez.jaque')
                : seleccion
                  ? t('hueplay.damas.elegiDestino')
                  : t('hueplay.ajedrez.elegiUnaFicha')
              : t('hueplay.ajedrez.turnoDe', { rival: desafio.esRivalIA ? t('hueplay.jugandoContraIA') : rival })}
        </Text>
      </Animated.View>

      <View style={{ width: tamanoTablero, height: tamanoTablero }}>
        <View
          style={[
            styles.tableroFondo,
            { width: tamanoTablero, height: tamanoTablero, backgroundColor: '#7B9463' },
          ]}
        >
          <TableroAjedrez
            piezas={piezas}
            piezasComiendose={piezasComiendose}
            seleccion={seleccion}
            destinosLegales={destinosLegales}
            enJaque={casillaJaque}
            onTocarCasilla={onTocarCasilla}
            tamano={tamanoTablero}
          />
        </View>

        {celebrar ? <CelebracionPatitas /> : null}

        {avisoJaque ? (
          <View style={[styles.avisoJaque, { backgroundColor: colors.danger }]}>
            <Ionicons name="warning" size={14} color="#fff" />
            <Text style={{ color: '#fff', fontFamily: fonts.bodySemi, fontSize: 12 }}>
              {t('hueplay.ajedrez.jaque')}
            </Text>
          </View>
        ) : null}
      </View>

      {error ? (
        <Text style={{ color: colors.danger, marginTop: 14, textAlign: 'center' }}>{error}</Text>
      ) : null}

      <Pressable
        onPress={() => router.replace('/(app)/hueplay/desafios')}
        style={[styles.boton, { borderColor: colors.border }]}
      >
        <Text style={{ color: colors.text, fontFamily: fonts.bodySemi }}>
          {terminado ? t('hueplay.volver') : t('hueplay.ajedrez.seguirDespues')}
        </Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  contenido: { padding: 12, alignItems: 'center', paddingBottom: 32 },
  marcador: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: 12,
    alignSelf: 'stretch',
    maxWidth: 400,
  },
  jugador: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 },
  aviso: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: 12,
    marginTop: 10,
    marginBottom: 12,
    alignSelf: 'stretch',
    maxWidth: 400,
  },
  tableroFondo: { position: 'relative', borderRadius: radii.lg, overflow: 'hidden' },
  avisoJaque: {
    position: 'absolute',
    top: 10,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: radii.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  boton: {
    borderWidth: 1,
    borderRadius: radii.pill,
    paddingVertical: 13,
    paddingHorizontal: 30,
    marginTop: 22,
  },
});
