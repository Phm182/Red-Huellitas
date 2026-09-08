import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import { hueplayApi } from '../../../src/api/hueplayApi';
import { CelebracionPatitas } from '../../../src/juego/comun/CelebracionPatitas';
import { COLOR_FICHA_REVERSI } from '../../../src/juego/huereversi/PiezaReversi';
import { PiezaActivaReversi, TableroReversi } from '../../../src/juego/huereversi/TableroReversi';
import { HuePlayDesafio, JugadaReversi, MovimientoLegalReversi } from '../../../src/types/hueplay';
import { radii } from '../../../src/theme/elevation';
import { centeredContent } from '../../../src/theme/layout';
import { fonts } from '../../../src/theme/typography';
import { useTheme } from '../../../src/theme/ThemeProvider';
import { hapticCelebracion, hapticError, hapticLeve, hapticMedio } from '../../../src/utils/haptics';

/** Cada cuánto se le pregunta al servidor si el rival humano movió. */
const POLL_MS = 4000;

/** Cuánto tarda, en pantalla, cada ficha en voltearse tras una jugada. */
const MS_POR_VOLTEO = 90;

function esperar(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Arma la lista de piezas a partir del string de 64 posiciones. */
function piezasDesdeTablero(tablero: string): PiezaActivaReversi[] {
  const piezas: PiezaActivaReversi[] = [];
  for (let i = 0; i < tablero.length; i++) {
    const c = tablero[i];
    if (c === '0') continue;
    piezas.push({ fila: Math.floor(i / 8), col: i % 8, lado: c === '1' ? 1 : 2 });
  }
  return piezas;
}

/**
 * HueReversi: Othello de HuePlay, por turnos contra otra persona o contra la
 * IA de la app.
 *
 * A diferencia de Damas, acá una jugada es "colocar" (no "mover"): el
 * servidor manda dónde se coloca la ficha nueva y qué casillas se voltean, y
 * acá sólo hay que reproducir ese volteo una por una.
 */
export default function ReversiScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const params = useLocalSearchParams<{ desafioId?: string }>();
  const desafioId = params.desafioId ? Number(params.desafioId) : 0;

  const [desafio, setDesafio] = useState<HuePlayDesafio | null>(null);
  const [piezas, setPiezas] = useState<PiezaActivaReversi[]>([]);
  const [movimientosLegales, setMovimientosLegales] = useState<MovimientoLegalReversi[]>([]);
  const [cargando, setCargando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [puntosGanados, setPuntosGanados] = useState<number | null>(null);
  const [celebrar, setCelebrar] = useState(false);

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
    const res = await hueplayApi.verDesafioReversi(desafioId);
    if (!vivoRef.current) return;

    if (res.success && res.data) {
      setError(null);
      const nuevoTablero = res.data.desafio.tablero ?? '';
      if (!animandoRef.current && nuevoTablero !== tableroRef.current) {
        setPiezas(piezasDesdeTablero(nuevoTablero));
        tableroRef.current = nuevoTablero;
      }
      setDesafio(res.data.desafio);
      setMovimientosLegales(res.data.movimientosLegales);
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

  useEffect(() => {
    if (!desafio || celebradoRef.current) return;
    if (desafio.estado !== 'terminado') return;
    celebradoRef.current = true;
    const empate = desafio.ganadorUserId === null;
    const gane = !empate && desafio.ganadorUserId !== desafio.otro.userId;
    if (gane) {
      hapticCelebracion();
      setCelebrar(true);
    } else if (!empate) {
      hapticError();
      sacudida.value = withSequence(
        withTiming(-8, { duration: 60 }),
        withTiming(8, { duration: 100 }),
        withTiming(-6, { duration: 100 }),
        withTiming(0, { duration: 80 })
      );
    }
  }, [desafio, sacudida]);

  /** Coloca la ficha nueva y voltea, una por una, las casillas capturadas. */
  const reproducirJugada = useCallback(async (jugada: JugadaReversi, lado: 1 | 2) => {
    setPiezas((prev) => [...prev.filter((p) => !(p.fila === jugada.fila && p.col === jugada.col)), { fila: jugada.fila, col: jugada.col, lado }]);
    await esperar(180);
    for (const [f, c] of jugada.volteadas) {
      if (!vivoRef.current) return;
      setPiezas((prev) => prev.map((p) => (p.fila === f && p.col === c ? { ...p, lado } : p)));
      await esperar(MS_POR_VOLTEO);
    }
  }, []);

  const onTocarCasilla = useCallback(
    async (fila: number, col: number) => {
      if (!desafio?.esMiTurno || enviando) return;

      const movimiento = movimientosLegales.find((m) => m.fila === fila && m.col === col);
      if (!movimiento) {
        hapticError();
        return;
      }

      setEnviando(true);
      setPuntosGanados(null);
      setMovimientosLegales([]);
      hapticMedio();
      animandoRef.current = true;

      const miLado: 1 | 2 = desafio.soyRetador ? 1 : 2;
      const rivalLado: 1 | 2 = miLado === 1 ? 2 : 1;

      const res = await hueplayApi.jugarReversi(desafioId, { fila, col });
      if (!vivoRef.current) return;

      if (!res.success || !res.data) {
        animandoRef.current = false;
        setEnviando(false);
        setError(res.message ?? t('common.error'));
        cargar();
        return;
      }

      await reproducirJugada(res.data.jugada, miLado);
      for (const jugadaIA of res.data.jugadasIA) {
        await esperar(250);
        await reproducirJugada(jugadaIA, rivalLado);
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
      // intercambio, y `reversi_mover.php` no manda los movimientos legales
      // de ese turno nuevo (sólo `reversi_ver.php` los calcula).
      if (res.data.desafio.esMiTurno && !res.data.gane && !res.data.perdiste) {
        const vista = await hueplayApi.verDesafioReversi(desafioId);
        if (vivoRef.current && vista.success && vista.data) {
          setMovimientosLegales(vista.data.movimientosLegales);
        }
      }
    },
    [desafio, desafioId, enviando, movimientosLegales, reproducirJugada, cargar, t]
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
  const empate = terminado && desafio.ganadorUserId === null;
  const gane = !empate && desafio.ganadorUserId !== null && desafio.ganadorUserId !== desafio.otro.userId;
  const tamanoTablero = Math.min(width - 24, 400);
  const rival = desafio.otro.username ? `@${desafio.otro.username}` : desafio.otro.nombreCompleto;
  const misFichas = piezas.filter((p) => p.lado === miLado).length;
  const susFichas = piezas.filter((p) => p.lado !== miLado).length;
  const sinMovimientoPropio = !terminado && desafio.esMiTurno && movimientosLegales.length === 0;

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[styles.contenido, centeredContent]}
    >
      <View style={[styles.marcador, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.jugador}>
          <View style={[styles.puntito, { backgroundColor: COLOR_FICHA_REVERSI[miLado] }]} />
          <Text style={{ color: colors.text, fontFamily: fonts.bodySemi }}>
            {t('hueplay.reversi.vos')} · {misFichas}
          </Text>
        </View>
        <Text style={{ color: colors.textMuted, fontSize: 12 }}>
          {t('hueplay.reversi.jugadas', { n: desafio.movimientos })}
        </Text>
        <View style={styles.jugador}>
          <Text style={{ color: colors.text, fontFamily: fonts.bodySemi }} numberOfLines={1}>
            {susFichas} · {desafio.esRivalIA ? t('hueplay.jugandoContraIA') : rival}
          </Text>
          <View style={[styles.puntito, { backgroundColor: COLOR_FICHA_REVERSI[miLado === 1 ? 2 : 1] }]} />
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
            name={terminado ? 'flag' : 'hand-left'}
            size={16}
            color={terminado ? colors.textMuted : colors.primary}
          />
        )}
        <Text style={{ color: colors.text, fontSize: 13, flex: 1 }}>
          {terminado
            ? empate
              ? t('hueplay.reversi.empateFin')
              : gane
                ? puntosGanados !== null
                  ? t('hueplay.reversi.ganasteFinPuntos', { puntos: puntosGanados })
                  : t('hueplay.reversi.ganasteFin')
                : t('hueplay.reversi.perdisteFin')
            : desafio.esMiTurno
              ? sinMovimientoPropio
                ? t('hueplay.reversi.sinMovimiento')
                : t('hueplay.reversi.elegiCasilla')
              : t('hueplay.reversi.turnoDe', { rival: desafio.esRivalIA ? t('hueplay.jugandoContraIA') : rival })}
        </Text>
      </Animated.View>

      <View style={{ width: tamanoTablero, height: tamanoTablero }}>
        <View style={[styles.tableroFondo, { width: tamanoTablero, height: tamanoTablero }]}>
          <TableroReversi
            piezas={piezas}
            destinosLegales={desafio.esMiTurno && !enviando ? movimientosLegales : []}
            onTocarCasilla={onTocarCasilla}
            tamano={tamanoTablero}
          />
        </View>

        {celebrar ? <CelebracionPatitas /> : null}
      </View>

      {error ? (
        <Text style={{ color: colors.danger, marginTop: 14, textAlign: 'center' }}>{error}</Text>
      ) : null}

      <Pressable
        onPress={() => router.replace('/(app)/hueplay/desafios')}
        style={[styles.boton, { borderColor: colors.border }]}
      >
        <Text style={{ color: colors.text, fontFamily: fonts.bodySemi }}>
          {terminado ? t('hueplay.volver') : t('hueplay.reversi.seguirDespues')}
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
  puntito: { width: 16, height: 16, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(0,0,0,0.2)' },
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
  boton: {
    borderWidth: 1,
    borderRadius: radii.pill,
    paddingVertical: 13,
    paddingHorizontal: 30,
    marginTop: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
