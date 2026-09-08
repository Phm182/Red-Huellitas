import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import { hueplayApi } from '../../../src/api/hueplayApi';
import { CelebracionPatitas } from '../../../src/juego/comun/CelebracionPatitas';
import { COLOR_FICHA_TATETI, PiezaActivaTaTeTi, TableroTaTeTi } from '../../../src/juego/huetateti/TableroTaTeTi';
import { CasillaTaTeTi, HuePlayDesafio } from '../../../src/types/hueplay';
import { radii } from '../../../src/theme/elevation';
import { centeredContent } from '../../../src/theme/layout';
import { fonts } from '../../../src/theme/typography';
import { useTheme } from '../../../src/theme/ThemeProvider';
import { hapticCelebracion, hapticError, hapticLeve, hapticMedio } from '../../../src/utils/haptics';

const POLL_MS = 4000;

const LINEAS_GANADORAS: number[][] = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

function piezasDesdeTablero(tablero: string): PiezaActivaTaTeTi[] {
  const piezas: PiezaActivaTaTeTi[] = [];
  for (let i = 0; i < tablero.length; i++) {
    const c = tablero[i];
    if (c === '0') continue;
    piezas.push({ fila: Math.floor(i / 3), col: i % 3, lado: c === '1' ? 1 : 2 });
  }
  return piezas;
}

/** La línea ganadora (si la hay) a partir del tablero final, para resaltarla. */
function lineaGanadoraDesdeTablero(tablero: string): CasillaTaTeTi[] {
  for (const linea of LINEAS_GANADORAS) {
    const [a, b, c] = linea;
    if (tablero[a] !== '0' && tablero[a] === tablero[b] && tablero[b] === tablero[c]) {
      return linea.map((i) => ({ fila: Math.floor(i / 3), col: i % 3 }));
    }
  }
  return [];
}

/**
 * HueTaTeTi: el clásico de 3 en línea de HuePlay, por turnos contra otra
 * persona o contra la IA de la app (que juega perfecto — nunca pierde).
 *
 * Sin animaciones de cadena como Damas/Reversi: acá una jugada es un único
 * toque, así que el tablero se actualiza directo con lo que manda el
 * servidor.
 */
export default function TaTeTiScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const params = useLocalSearchParams<{ desafioId?: string }>();
  const desafioId = params.desafioId ? Number(params.desafioId) : 0;

  const [desafio, setDesafio] = useState<HuePlayDesafio | null>(null);
  const [piezas, setPiezas] = useState<PiezaActivaTaTeTi[]>([]);
  const [movimientosLegales, setMovimientosLegales] = useState<CasillaTaTeTi[]>([]);
  const [lineaGanadora, setLineaGanadora] = useState<CasillaTaTeTi[]>([]);
  const [cargando, setCargando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [puntosGanados, setPuntosGanados] = useState<number | null>(null);
  const [celebrar, setCelebrar] = useState(false);

  const vivoRef = useRef(true);
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
    const res = await hueplayApi.verDesafioTaTeTi(desafioId);
    if (!vivoRef.current) return;

    if (res.success && res.data) {
      setError(null);
      const nuevoTablero = res.data.desafio.tablero ?? '';
      if (nuevoTablero !== tableroRef.current) {
        setPiezas(piezasDesdeTablero(nuevoTablero));
        tableroRef.current = nuevoTablero;
        if (res.data.desafio.estado === 'terminado') {
          setLineaGanadora(lineaGanadoraDesdeTablero(nuevoTablero));
        }
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

  const onTocarCasilla = useCallback(
    async (fila: number, col: number) => {
      if (!desafio?.esMiTurno || enviando) return;
      if (!movimientosLegales.some((m) => m.fila === fila && m.col === col)) {
        hapticError();
        return;
      }

      setEnviando(true);
      setPuntosGanados(null);
      setMovimientosLegales([]);
      hapticMedio();

      const miLado: 1 | 2 = desafio.soyRetador ? 1 : 2;
      const rivalLado: 1 | 2 = miLado === 1 ? 2 : 1;

      const res = await hueplayApi.jugarTaTeTi(desafioId, { fila, col });
      if (!vivoRef.current) return;

      if (!res.success || !res.data) {
        setEnviando(false);
        setError(res.message ?? t('common.error'));
        cargar();
        return;
      }

      const nuevoTablero = res.data.desafio.tablero ?? '';
      setPiezas(piezasDesdeTablero(nuevoTablero));
      tableroRef.current = nuevoTablero;
      setDesafio(res.data.desafio);
      if (res.data.progreso) {
        setPuntosGanados(res.data.progreso.puntosGanados ?? null);
      }
      if (res.data.desafio.estado === 'terminado') {
        setLineaGanadora(lineaGanadoraDesdeTablero(nuevoTablero));
      }

      setEnviando(false);

      // Sólo pasa contra la IA: le vuelve a tocar al humano en el mismo
      // intercambio, y tateti_mover.php no manda los movimientos legales de
      // ese turno nuevo (sólo tateti_ver.php los calcula).
      if (res.data.desafio.esMiTurno && !res.data.gane && !res.data.empate) {
        const vista = await hueplayApi.verDesafioTaTeTi(desafioId);
        if (vivoRef.current && vista.success && vista.data) {
          setMovimientosLegales(vista.data.movimientosLegales);
        }
      }
    },
    [desafio, desafioId, enviando, movimientosLegales, cargar, t]
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
  const tamanoTablero = Math.min(width - 24, 360);
  const rival = desafio.otro.username ? `@${desafio.otro.username}` : desafio.otro.nombreCompleto;

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[styles.contenido, centeredContent]}
    >
      <View style={[styles.marcador, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.jugador}>
          <Text style={[styles.simbolo, { color: COLOR_FICHA_TATETI[miLado] }]}>{miLado === 1 ? '✕' : '○'}</Text>
          <Text style={{ color: colors.text, fontFamily: fonts.bodySemi }}>{t('hueplay.tateti.vos')}</Text>
        </View>
        <Text style={{ color: colors.textMuted, fontSize: 12 }}>
          {t('hueplay.tateti.jugadas', { n: desafio.movimientos })}
        </Text>
        <View style={styles.jugador}>
          <Text style={{ color: colors.text, fontFamily: fonts.bodySemi }} numberOfLines={1}>
            {desafio.esRivalIA ? t('hueplay.jugandoContraIA') : rival}
          </Text>
          <Text style={[styles.simbolo, { color: COLOR_FICHA_TATETI[miLado === 1 ? 2 : 1] }]}>
            {miLado === 1 ? '○' : '✕'}
          </Text>
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
              ? t('hueplay.tateti.empateFin')
              : gane
                ? puntosGanados !== null
                  ? t('hueplay.tateti.ganasteFinPuntos', { puntos: puntosGanados })
                  : t('hueplay.tateti.ganasteFin')
                : t('hueplay.tateti.perdisteFin')
            : desafio.esMiTurno
              ? t('hueplay.tateti.elegiCasilla')
              : t('hueplay.tateti.turnoDe', { rival: desafio.esRivalIA ? t('hueplay.jugandoContraIA') : rival })}
        </Text>
      </Animated.View>

      <View style={{ width: tamanoTablero, height: tamanoTablero, position: 'relative' }}>
        <TableroTaTeTi
          piezas={piezas}
          destinosLegales={desafio.esMiTurno && !enviando ? movimientosLegales : []}
          lineaGanadora={lineaGanadora}
          onTocarCasilla={onTocarCasilla}
          tamano={tamanoTablero}
        />
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
          {terminado ? t('hueplay.volver') : t('hueplay.tateti.seguirDespues')}
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
  simbolo: { fontFamily: fonts.displaySemi, fontSize: 18 },
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
