import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { hueplayApi } from '../../../src/api/hueplayApi';
import { useAuth } from '../../../src/auth/AuthProvider';
import { CanchaSoccer, Posiciones, SkinDeJugador, posicionesDeTablero, reproducir } from '../../../src/juego/huesoccer/CanchaSoccer';
import { GOLES_PARA_GANAR_DEFAULT, TOPE_SEGUNDOS_NETOS, TableroSoccer, Vector, simularTiro } from '../../../src/juego/huesoccer/motor';
import {
  SKIN_FICHA_DEFAULT,
  SKIN_PELOTA_DEFAULT,
  SkinFichaId,
  SkinPelotaId,
  esSkinFichaValida,
  esSkinPelotaValida,
  resolverSkinsPartido,
  skinPelotaDelPartido,
} from '../../../src/juego/huesoccer/skins';
import { HuePlayDesafio } from '../../../src/types/hueplay';
import { radii } from '../../../src/theme/elevation';
import { centeredContent } from '../../../src/theme/layout';
import { fonts } from '../../../src/theme/typography';
import { useTheme } from '../../../src/theme/ThemeProvider';
import { hapticCelebracion, hapticError, hapticLeve, hapticMedio } from '../../../src/utils/haptics';

/** Cada cuánto se pregunta si el rival ya tiró, mientras es su turno. */
const POLL_MS = 4000;
/** Duración fija de cualquier animación de tiro, mío o del rival. */
const DURACION_ANIM_MS = 900;
/** Segundos reales que tiene el jugador activo para tirar. */
const SEGUNDOS_TURNO = 20;

function skinFichaValida(v: string | undefined): SkinFichaId {
  return v && esSkinFichaValida(v) ? v : SKIN_FICHA_DEFAULT;
}
function skinPelotaValida(v: string | undefined): SkinPelotaId {
  return v && esSkinPelotaValida(v) ? v : SKIN_PELOTA_DEFAULT;
}

/**
 * Punto que titila al lado del marcador de quien tiene el turno.
 *
 * Antes esto lo marcaba un anillo alrededor de CADA ficha propia
 * (`esMia` en `CanchaSoccer.tsx`) — con el color de equipo rosa (que es el
 * mismo `colors.primary` del anillo) quedaba un doble círculo rosa feo
 * encima de las fichas rosas. El color de equipo ya alcanza para saber
 * cuáles son las tuyas; de quién es el turno se indica acá, una sola vez,
 * no ficha por ficha.
 */
function PuntoTurno() {
  const { colors } = useTheme();
  const opacidad = useSharedValue(1);

  useEffect(() => {
    opacidad.value = withRepeat(withTiming(0.25, { duration: 550 }), -1, true);
  }, [opacidad]);

  const estilo = useAnimatedStyle(() => ({ opacity: opacidad.value }));

  return <Animated.View style={[styles.puntoTurno, { backgroundColor: colors.success }, estilo]} />;
}

/**
 * HueSoccer: duelo de física por turnos, tipo "Soccer Star".
 *
 * A diferencia de HueDamas/HueAjedrez (donde el servidor decide la jugada),
 * acá **el que tira simula la física en su propio celular** (no hay
 * librería de física en el proyecto — ver `src/juego/huesoccer/motor.ts`) y
 * manda el resultado final; el servidor sólo recorta límites de cancha y
 * decide el gol por su cuenta. Ver ese archivo y `inc/funciones/soccer.php`
 * para el porqué completo.
 */
export default function HueSoccerScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { user } = useAuth();
  const { width } = useWindowDimensions();
  const params = useLocalSearchParams<{ desafioId?: string }>();
  const desafioId = params.desafioId ? Number(params.desafioId) : 0;

  const [desafio, setDesafio] = useState<HuePlayDesafio | null>(null);
  const [tablero, setTablero] = useState<TableroSoccer | null>(null);
  const [posiciones, setPosiciones] = useState<Posiciones>({});
  const [cargando, setCargando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [animando, setAnimando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<{ resultado: 'gane' | 'perdiste' | 'empate'; gol: 1 | 2 | null } | null>(null);
  const [restanteTurno, setRestanteTurno] = useState(SEGUNDOS_TURNO);

  const vivoRef = useRef(true);
  const cancelarAnimRef = useRef<(() => void) | null>(null);
  const movimientosVistosRef = useRef<number | null>(null);
  const vencidoEnviadoRef = useRef(false);

  useEffect(() => {
    vivoRef.current = true;
    return () => {
      vivoRef.current = false;
      cancelarAnimRef.current?.();
    };
  }, []);

  const cargar = useCallback(async () => {
    if (!desafioId) return;
    const res = await hueplayApi.verDesafioSoccer(desafioId);
    if (!vivoRef.current) return;
    if (res.success && res.data) {
      const d = res.data.desafio;
      const nuevoTablero: TableroSoccer | null = d.tablero ? JSON.parse(d.tablero) : null;
      setError(null);

      if (nuevoTablero) {
        // Si `movimientos` avanzó y no fue por algo que ya animamos acá
        // mismo (mi propio tiro), es que el rival tiró mientras esperábamos
        // por polling: se anima el tween de la posición vieja a la nueva.
        const vistoAntes = movimientosVistosRef.current;
        const esCambioDelRival = vistoAntes !== null && d.movimientos > vistoAntes && !animando;
        movimientosVistosRef.current = d.movimientos;

        if (esCambioDelRival) {
          const nuevaPos = posicionesDeTablero(nuevoTablero);
          const trayectorias: Record<string, Vector[]> = {};
          for (const id of Object.keys(nuevaPos)) {
            const desde = posiciones[id] ?? nuevaPos[id]!;
            trayectorias[id] = [desde, nuevaPos[id]!];
          }
          setAnimando(true);
          cancelarAnimRef.current = reproducir(trayectorias, DURACION_ANIM_MS, setPosiciones, () => {
            if (!vivoRef.current) return;
            setAnimando(false);
          });
        } else if (movimientosVistosRef.current === d.movimientos && Object.keys(posiciones).length === 0) {
          setPosiciones(posicionesDeTablero(nuevoTablero));
        }
      }

      setTablero(nuevoTablero);
      setDesafio(d);
    } else {
      setError(res.message ?? t('common.error'));
    }
    setCargando(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [desafioId, t]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  useEffect(() => {
    if (!desafio) return;
    const terminado = desafio.estado === 'terminado' || desafio.estado === 'expirado';
    if (terminado || desafio.esMiTurno) return;
    const id = setInterval(cargar, POLL_MS);
    return () => clearInterval(id);
  }, [desafio, cargar]);

  // Reloj de 20 segundos: arranca/reinicia cada vez que pasa a ser mi
  // turno, puramente visual/local (el servidor es la autoridad real, ver
  // el guard de `soccerTurnoVencido`).
  useEffect(() => {
    const terminado = desafio?.estado === 'terminado' || desafio?.estado === 'expirado';
    if (!desafio || terminado || !desafio.esMiTurno || enviando || animando) return;

    setRestanteTurno(SEGUNDOS_TURNO);
    vencidoEnviadoRef.current = false;
    const id = setInterval(() => {
      setRestanteTurno((s) => (s <= 1 ? 0 : s - 1));
    }, 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [desafio?.esMiTurno, desafio?.movimientos, enviando, animando]);

  useEffect(() => {
    if (restanteTurno !== 0 || vencidoEnviadoRef.current || !desafio?.esMiTurno) return;
    if (enviando || animando) return;
    vencidoEnviadoRef.current = true;
    hapticError();
    hueplayApi.soccerTurnoVencido(desafioId).then((res) => {
      if (!vivoRef.current) return;
      if (res.success && res.data) {
        const d = res.data.desafio;
        movimientosVistosRef.current = d.movimientos;
        setDesafio(d);
        const t2: TableroSoccer | null = d.tablero ? JSON.parse(d.tablero) : null;
        setTablero(t2);
        if (t2) setPosiciones(posicionesDeTablero(t2));
        if (res.data.resultado) setResultado({ resultado: res.data.resultado, gol: null });
      } else {
        cargar();
      }
    });
  }, [restanteTurno, desafio?.esMiTurno, desafioId, enviando, animando, cargar]);

  const onTiro = useCallback(
    (fichaId: string, impulso: Vector) => {
      if (!desafio || !tablero || !desafio.esMiTurno || enviando || animando || restanteTurno <= 0) return;
      hapticMedio();

      const r = simularTiro(tablero, fichaId, impulso);
      setAnimando(true);
      cancelarAnimRef.current = reproducir(r.trayectorias, DURACION_ANIM_MS, setPosiciones, async () => {
        if (!vivoRef.current) return;
        if (r.gol) hapticCelebracion();

        setEnviando(true);
        const res = await hueplayApi.soccerMover(desafioId, JSON.stringify(r.estadoFinal));
        if (!vivoRef.current) return;
        setEnviando(false);
        setAnimando(false);

        if (!res.success || !res.data) {
          hapticError();
          setError(res.message ?? t('common.error'));
          cargar();
          return;
        }

        const d = res.data.desafio;
        const tableroServidor: TableroSoccer | null = d.tablero ? JSON.parse(d.tablero) : null;
        movimientosVistosRef.current = d.movimientos;
        setDesafio(d);
        setTablero(tableroServidor);
        if (tableroServidor) setPosiciones(posicionesDeTablero(tableroServidor));

        if (res.data.resultado) {
          setResultado({ resultado: res.data.resultado, gol: res.data.gol });
        }
      });
    },
    [desafio, tablero, enviando, animando, restanteTurno, desafioId, cargar, t]
  );

  if (cargando) {
    return (
      <View style={[styles.centro, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!desafio || !tablero) {
    return (
      <View style={[styles.centro, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.danger }}>{error ?? t('common.error')}</Text>
      </View>
    );
  }

  const terminado = desafio.estado === 'terminado' || desafio.estado === 'expirado';
  const misGoles = desafio.miFicha === '1' ? tablero.golesJ1 : tablero.golesJ2;
  const susGoles = desafio.miFicha === '1' ? tablero.golesJ2 : tablero.golesJ1;
  const lado = Math.min(width - 32, 340);

  // Skins: siempre determinístico por soyRetador — los dos clientes
  // calculan lo mismo sin negociar nada por red (ver skins.ts).
  const miSkinFicha = skinFichaValida(user?.huesoccerSkinFicha);
  const susSkinFicha = skinFichaValida(desafio.otro.skinFicha);
  const skinRetador = desafio.soyRetador ? miSkinFicha : susSkinFicha;
  const skinRetado = desafio.soyRetador ? susSkinFicha : miSkinFicha;
  const variantes = resolverSkinsPartido(skinRetador, skinRetado);
  const skinsPorJugador: Record<1 | 2, SkinDeJugador> = {
    1: { skin: skinRetador, variante: variantes.retador },
    2: { skin: skinRetado, variante: variantes.retado },
  };
  const miSkinPelota = skinPelotaValida(user?.huesoccerSkinPelota);
  const susSkinPelota = skinPelotaValida(desafio.otro.skinPelota);
  const skinPelotaRetador = desafio.soyRetador ? miSkinPelota : susSkinPelota;
  const skinPelota = skinPelotaDelPartido(skinPelotaRetador);

  if (terminado || resultado) {
    const r = resultado?.resultado ?? (desafio.ganadorUserId === null ? 'empate' : 'perdiste');
    return (
      <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={[styles.intro, centeredContent]}>
        <Ionicons name="football" size={56} color={colors.primary} />
        <Text
          style={[
            styles.veredicto,
            { color: r === 'gane' ? colors.success : r === 'perdiste' ? colors.danger : colors.text },
          ]}
        >
          {r === 'gane' ? t('hueplay.match.ganaste') : r === 'perdiste' ? t('hueplay.match.perdiste') : t('hueplay.match.empate')}
        </Text>
        <Text style={{ color: colors.textMuted, fontSize: 15, marginTop: 6 }}>
          {misGoles} - {susGoles}
        </Text>
        <Pressable
          onPress={() => router.replace('/(app)/hueplay')}
          style={[styles.boton, { backgroundColor: colors.primary, marginTop: 24 }]}
        >
          <Text style={[styles.botonTexto, { color: colors.primaryText }]}>{t('hueplay.volver')}</Text>
        </Pressable>
      </ScrollView>
    );
  }

  const tiempoUrgente = restanteTurno <= 5;

  return (
    <View style={[styles.juego, { backgroundColor: colors.background }]}>
      <View style={[styles.marcador, centeredContent]}>
        <View style={styles.marcadorLado}>
          <View style={styles.marcadorLabelFila}>
            <Text style={[styles.marcadorLabel, { color: colors.textMuted }]}>{t('hueplay.soccer.golesJ1')}</Text>
            {desafio.esMiTurno ? <PuntoTurno /> : null}
          </View>
          <Text style={[styles.marcadorValor, { color: colors.text }]}>{misGoles}</Text>
        </View>
        <Text style={[styles.marcadorGuion, { color: colors.textMuted }]}>-</Text>
        <View style={styles.marcadorLado}>
          <View style={styles.marcadorLabelFila}>
            <Text style={[styles.marcadorLabel, { color: colors.textMuted }]}>{t('hueplay.soccer.golesJ2')}</Text>
            {!desafio.esMiTurno ? <PuntoTurno /> : null}
          </View>
          <Text style={[styles.marcadorValor, { color: colors.text }]}>{susGoles}</Text>
        </View>
      </View>

      {desafio.esMiTurno ? (
        <Text style={[styles.turno, { color: tiempoUrgente ? colors.danger : colors.primary }]}>
          {t('hueplay.soccer.tuTurno')} · {restanteTurno}s
        </Text>
      ) : (
        <Text style={[styles.turno, { color: colors.textMuted }]}>
          {t('hueplay.soccer.turnoRival', { rival: desafio.otro.username || desafio.otro.nombreCompleto })}
        </Text>
      )}

      {error ? <Text style={{ color: colors.danger, textAlign: 'center', marginTop: 6 }}>{error}</Text> : null}

      <View style={styles.canchaWrap}>
        <CanchaSoccer
          cancha={tablero.cancha}
          fichas={tablero.fichas}
          posiciones={posiciones}
          miFicha={desafio.miFicha === '1' ? 1 : 2}
          activo={desafio.esMiTurno && !enviando && !animando && restanteTurno > 0}
          lado={lado}
          onTiro={onTiro}
          skinsPorJugador={skinsPorJugador}
          skinPelota={skinPelota}
        />
      </View>

      <Text style={{ color: colors.textMuted, fontSize: 11, textAlign: 'center', marginTop: 10 }}>
        {t('hueplay.golesParaGanar', { n: tablero.metaGoles ?? GOLES_PARA_GANAR_DEFAULT })}
      </Text>
      <Text style={{ color: colors.textMuted, fontSize: 10, textAlign: 'center', marginTop: 2 }}>
        {t('hueplay.soccer.tiempoNeto', { usados: tablero.segundosNetosUsados, tope: TOPE_SEGUNDOS_NETOS })}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  intro: { padding: 20, alignItems: 'center', paddingTop: 60, paddingBottom: 40 },
  veredicto: { fontSize: 24, fontFamily: fonts.displaySemi, marginTop: 12 },
  boton: { borderRadius: radii.pill, paddingVertical: 14, paddingHorizontal: 34, alignItems: 'center', justifyContent: 'center' },
  botonTexto: { fontFamily: fonts.bodySemi, fontSize: 15 },
  juego: { flex: 1, paddingTop: 8 },
  marcador: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 18, marginBottom: 4 },
  marcadorLado: { alignItems: 'center' },
  marcadorLabelFila: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  puntoTurno: { width: 8, height: 8, borderRadius: 4 },
  marcadorLabel: { fontSize: 11, textTransform: 'uppercase' },
  marcadorValor: { fontSize: 30, fontFamily: fonts.displaySemi },
  marcadorGuion: { fontSize: 22, fontFamily: fonts.displaySemi, marginTop: 14 },
  turno: { textAlign: 'center', fontFamily: fonts.bodySemi, fontSize: 13, marginTop: 4 },
  canchaWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
