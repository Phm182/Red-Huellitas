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
import Svg, { Circle, Ellipse, G } from 'react-native-svg';
import { hueplayApi } from '../../../src/api/hueplayApi';
import { CeldaTablero, HuePlayDesafio } from '../../../src/types/hueplay';
import { radii } from '../../../src/theme/elevation';
import { centeredContent } from '../../../src/theme/layout';
import { fonts } from '../../../src/theme/typography';
import { useTheme } from '../../../src/theme/ThemeProvider';
import { hapticCelebracion, hapticError, hapticMedio } from '../../../src/utils/haptics';

const FILAS = 6;
const COLUMNAS = 7;

/** Cada cuánto se le pregunta al servidor si el rival movió. */
const POLL_MS = 4000;

const COLOR_FICHA: Record<string, string> = {
  '1': '#E8577E',
  '2': '#5B9AD6',
};

/**
 * Una huella como ficha. Las dos son iguales salvo el color, pero se les cambia
 * la orientación: así se distinguen también en una captura en blanco y negro y
 * para alguien que no separa bien el rosa del azul.
 */
function Huella({ jugador, size }: { jugador: string; size: number }) {
  const c = COLOR_FICHA[jugador] ?? '#999';
  const flip = jugador === '2';
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <G transform={flip ? 'rotate(180 50 50)' : undefined}>
        <Ellipse cx="50" cy="62" rx="26" ry="21" fill={c} />
        <Ellipse cx="26" cy="34" rx="9" ry="12" fill={c} />
        <Ellipse cx="44" cy="25" rx="9" ry="13" fill={c} />
        <Ellipse cx="62" cy="26" rx="9" ry="12" fill={c} />
        <Ellipse cx="78" cy="41" rx="8" ry="11" fill={c} />
      </G>
    </Svg>
  );
}

function Hueco({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Circle cx="50" cy="50" r="38" fill="rgba(0,0,0,0.18)" />
    </Svg>
  );
}

/**
 * HueConecta: el Conecta 4 de HuePlay.
 *
 * A diferencia de HueMatch, acá el cliente **no calcula nada**: manda la columna
 * que tocaste y el servidor devuelve el tablero nuevo, si ganaste y cuánto
 * sumaste. Por eso esta pantalla es casi toda dibujo y espera.
 */
export default function HueConectaScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const params = useLocalSearchParams<{ desafioId?: string }>();
  const desafioId = params.desafioId ? Number(params.desafioId) : 0;

  const [desafio, setDesafio] = useState<HuePlayDesafio | null>(null);
  const [libres, setLibres] = useState<number[]>([]);
  const [linea, setLinea] = useState<CeldaTablero[]>([]);
  const [ultima, setUltima] = useState<{ fila: number; columna: number } | null>(null);
  const [cargando, setCargando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<{ gane: boolean; empate: boolean; puntos: number } | null>(null);

  const vivoRef = useRef(true);
  useEffect(() => {
    vivoRef.current = true;
    return () => {
      vivoRef.current = false;
    };
  }, []);

  const cargar = useCallback(async () => {
    if (!desafioId) return;
    const res = await hueplayApi.verDesafio(desafioId);
    if (!vivoRef.current) return;
    if (res.success && res.data) {
      setDesafio(res.data.desafio);
      setLibres(res.data.columnasLibres);
      setError(null);
    } else {
      setError(res.message ?? t('common.error'));
    }
    setCargando(false);
  }, [desafioId, t]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  // Mientras es turno del rival se pregunta cada tanto. Sin websockets no hay
  // forma de que el servidor avise solo; el intervalo se corta apenas te toca a
  // vos o el duelo termina, así que no queda pidiendo para siempre.
  useEffect(() => {
    if (!desafio) return;
    const terminado = desafio.estado === 'terminado' || desafio.estado === 'expirado';
    if (terminado || desafio.esMiTurno) return;

    const id = setInterval(cargar, POLL_MS);
    return () => clearInterval(id);
  }, [desafio, cargar]);

  const jugar = async (columna: number) => {
    if (!desafio || !desafio.esMiTurno || enviando) return;
    if (!libres.includes(columna)) {
      hapticError();
      return;
    }

    hapticMedio();
    setEnviando(true);
    const res = await hueplayApi.jugarTurno(desafioId, columna);
    setEnviando(false);
    if (!vivoRef.current) return;

    if (res.success && res.data) {
      setDesafio(res.data.desafio);
      setLibres(res.data.columnasLibres);
      setLinea(res.data.lineaGanadora);
      setUltima(res.data.ultimaJugada);

      if (res.data.gane || res.data.empate) {
        hapticCelebracion();
        setResultado({
          gane: res.data.gane,
          empate: res.data.empate,
          puntos: res.data.progreso?.puntosGanados ?? 0,
        });
      }
    } else {
      // Si el servidor dice que no es tu turno, el estado local quedó viejo:
      // se recarga en vez de dejar la pantalla mintiendo.
      setError(res.message ?? t('common.error'));
      cargar();
    }
  };

  if (cargando) {
    return (
      <View style={[styles.centro, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!desafio || !desafio.tablero) {
    return (
      <View style={[styles.centro, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.danger }}>{error ?? t('common.error')}</Text>
      </View>
    );
  }

  const tablero = desafio.tablero;
  const terminado = desafio.estado === 'terminado' || desafio.estado === 'expirado';
  const lado = Math.min(width - 24, 400);
  const celda = lado / COLUMNAS;

  const esLineaGanadora = (f: number, c: number) => linea.some((x) => x.fila === f && x.col === c);

  const rival = desafio.otro.username ? `@${desafio.otro.username}` : desafio.otro.nombreCompleto;

  // Quién ganó se deduce del ganador contra mi ficha, sin necesitar mi userId:
  // `esMiTurno` ya no sirve una vez terminado.
  const gane = resultado?.gane ?? null;

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[styles.contenido, centeredContent]}
    >
      <View style={[styles.marcador, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.jugador}>
          <Huella jugador={desafio.miFicha} size={26} />
          <Text style={{ color: colors.text, fontFamily: fonts.bodySemi }}>{t('hueplay.conecta.vos')}</Text>
        </View>
        <Text style={{ color: colors.textMuted, fontSize: 12 }}>
          {t('hueplay.conecta.jugadas', { n: desafio.movimientos })}
        </Text>
        <View style={styles.jugador}>
          <Text style={{ color: colors.text, fontFamily: fonts.bodySemi }} numberOfLines={1}>
            {rival}
          </Text>
          <Huella jugador={desafio.miFicha === '1' ? '2' : '1'} size={26} />
        </View>
      </View>

      <View
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
            ? resultado
              ? resultado.empate
                ? t('hueplay.conecta.empateFin', { puntos: resultado.puntos })
                : gane
                  ? t('hueplay.conecta.ganasteFin', { puntos: resultado.puntos })
                  : t('hueplay.conecta.perdisteFin')
              : t('hueplay.conecta.terminado')
            : desafio.esMiTurno
              ? t('hueplay.conecta.tuTurno')
              : t('hueplay.conecta.turnoDe', { rival })}
        </Text>
      </View>

      {/* Botones para soltar. Van arriba del tablero porque la ficha cae desde
          ahí: tocar la columna donde entra es más natural que tocar el hueco. */}
      <View style={[styles.soltar, { width: lado }]}>
        {Array.from({ length: COLUMNAS }, (_, c) => {
          const puede = desafio.esMiTurno && !terminado && libres.includes(c) && !enviando;
          return (
            <Pressable
              key={c}
              disabled={!puede}
              onPress={() => jugar(c)}
              style={[styles.flecha, { width: celda }]}
              accessibilityLabel={t('hueplay.conecta.soltarEn', { n: c + 1 })}
            >
              <Ionicons
                name="caret-down"
                size={26}
                color={puede ? colors.primary : 'transparent'}
              />
            </Pressable>
          );
        })}
      </View>

      <View
        style={[
          styles.tablero,
          { width: lado, height: celda * FILAS, backgroundColor: colors.primarySoft },
        ]}
      >
        {Array.from({ length: FILAS }, (_, f) =>
          Array.from({ length: COLUMNAS }, (_, c) => {
            const v = tablero[f * COLUMNAS + c] ?? '0';
            const ganadora = esLineaGanadora(f, c);
            const reciente = ultima?.fila === f && ultima?.columna === c;
            return (
              <View
                key={`${f}-${c}`}
                style={[
                  styles.celda,
                  {
                    width: celda,
                    height: celda,
                    left: c * celda,
                    top: f * celda,
                  },
                ]}
              >
                <View
                  style={[
                    styles.celdaFondo,
                    ganadora && { backgroundColor: 'rgba(255,255,255,0.55)', borderRadius: 999 },
                    reciente && !ganadora && { borderWidth: 2, borderColor: colors.text, borderRadius: 999 },
                  ]}
                >
                  {v === '0' ? <Hueco size={celda * 0.86} /> : <Huella jugador={v} size={celda * 0.8} />}
                </View>
              </View>
            );
          })
        )}
      </View>

      {error ? (
        <Text style={{ color: colors.danger, marginTop: 14, textAlign: 'center' }}>{error}</Text>
      ) : null}

      <Pressable
        onPress={() => router.replace('/(app)/hueplay/desafios')}
        style={[styles.boton, { borderColor: colors.border }]}
      >
        <Text style={{ color: colors.text, fontFamily: fonts.bodySemi }}>
          {terminado ? t('hueplay.volver') : t('hueplay.conecta.seguirDespues')}
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
    marginBottom: 6,
    alignSelf: 'stretch',
    maxWidth: 400,
  },
  soltar: { flexDirection: 'row' },
  flecha: { alignItems: 'center', justifyContent: 'center', height: 30 },
  tablero: { position: 'relative', borderRadius: radii.lg, overflow: 'hidden' },
  celda: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  celdaFondo: { width: '94%', height: '94%', alignItems: 'center', justifyContent: 'center' },
  boton: {
    borderWidth: 1,
    borderRadius: radii.pill,
    paddingVertical: 13,
    paddingHorizontal: 30,
    marginTop: 22,
  },
});
