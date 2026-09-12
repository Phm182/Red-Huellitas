import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { hueplayApi } from '../../../src/api/hueplayApi';
import { APP_HEADER_HEIGHT, APP_TAB_BAR_HEIGHT } from '../../../src/navigation/chrome';
import { MesaPool, Posiciones, reproducir } from '../../../src/juego/huepool/MesaPool';
import {
  PuntoTrayectoria,
  SEGUNDOS_POR_TURNO,
  TOPE_SEGUNDOS_NETOS,
  TableroPool,
  Vector,
  grupoDe,
  simularTiro,
} from '../../../src/juego/huepool/motor';
import { HuePlayDesafio } from '../../../src/types/hueplay';
import { radii } from '../../../src/theme/elevation';
import { centeredContent } from '../../../src/theme/layout';
import { fonts } from '../../../src/theme/typography';
import { useTheme } from '../../../src/theme/ThemeProvider';
import { hapticCelebracion, hapticError, hapticLeve, hapticMedio } from '../../../src/utils/haptics';

const POLL_MS = 4000;
const DURACION_ANIM_MS = 900;
const MS_POR_CUADRO_FISICA = 9;
const DURACION_MIN_MS = 450;
const DURACION_MAX_MS = 2400;

function duracionDeMiTiro(trayectorias: Record<number, PuntoTrayectoria[]>): number {
  let cuadros = 0;
  for (const arr of Object.values(trayectorias)) cuadros = Math.max(cuadros, arr.length);
  return Math.max(DURACION_MIN_MS, Math.min(DURACION_MAX_MS, cuadros * MS_POR_CUADRO_FISICA));
}

function posicionesDeTablero(t: TableroPool): Posiciones {
  const p: Posiciones = {};
  for (const b of t.bolas) if (b.enMesa) p[b.n] = { x: b.x, y: b.y, rod: 0, dirX: 0, dirY: 0 };
  return p;
}

/**
 * HuePool: Bola 8 de HuePlay, por turnos. Mismo criterio que HueSoccer (ver
 * su comentario de cabecera): el que tira simula la física localmente
 * (`src/juego/huepool/motor.ts`) y manda el resultado final; el servidor
 * decide qué se embocó por su cuenta, mirando la posición final de cada
 * bola — nunca confía en un flag que mande el cliente.
 */
export default function HuePoolScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ desafioId?: string }>();
  const desafioId = params.desafioId ? Number(params.desafioId) : 0;

  const [desafio, setDesafio] = useState<HuePlayDesafio | null>(null);
  const [tablero, setTablero] = useState<TableroPool | null>(null);
  const [posiciones, setPosiciones] = useState<Posiciones>({});
  const [cargando, setCargando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [animando, setAnimando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<'gane' | 'perdiste' | 'empate' | null>(null);
  const [restanteTurno, setRestanteTurno] = useState(SEGUNDOS_POR_TURNO);

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
    const res = await hueplayApi.verDesafioPool(desafioId);
    if (!vivoRef.current) return;
    if (res.success && res.data) {
      const d = res.data.desafio;
      const nuevoTablero: TableroPool | null = d.tablero ? JSON.parse(d.tablero) : null;
      setError(null);

      if (nuevoTablero) {
        const vistoAntes = movimientosVistosRef.current;
        const esCambioDelRival = vistoAntes !== null && d.movimientos > vistoAntes && !animando;
        movimientosVistosRef.current = d.movimientos;

        if (esCambioDelRival) {
          const nuevaPos = posicionesDeTablero(nuevoTablero);
          // Interpolación "de alcance" directa (vieja posición → nueva), no
          // el replay real del tiro del rival — no hay trayectoria física
          // que reproducir acá, así que sin giro real: ángulo fijo en 0 en
          // las dos puntas (no se nota, es una animación de ~1s).
          const trayectorias: Record<number, PuntoTrayectoria[]> = {};
          for (const nStr of Object.keys(nuevaPos)) {
            const n = Number(nStr);
            const desde = posiciones[n] ?? nuevaPos[n]!;
            // Rodadura acumulada proporcional a la distancia recorrida, así
            // la bola "rueda" hacia su lugar nuevo en vez de deslizar.
            const rodLlegada = Math.hypot(nuevaPos[n]!.x - desde.x, nuevaPos[n]!.y - desde.y) / 9;
            trayectorias[n] = [
              { pos: desde, rod: 0 },
              { pos: nuevaPos[n]!, rod: rodLlegada },
            ];
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

  useEffect(() => {
    const terminado = desafio?.estado === 'terminado' || desafio?.estado === 'expirado';
    if (!desafio || terminado || !desafio.esMiTurno || enviando || animando) return;

    setRestanteTurno(SEGUNDOS_POR_TURNO);
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
    hueplayApi.poolTurnoVencido(desafioId).then((res) => {
      if (!vivoRef.current) return;
      if (res.success && res.data) {
        const d = res.data.desafio;
        movimientosVistosRef.current = d.movimientos;
        setDesafio(d);
        const t2: TableroPool | null = d.tablero ? JSON.parse(d.tablero) : null;
        setTablero(t2);
        if (t2) setPosiciones(posicionesDeTablero(t2));
        if (res.data.resultado) setResultado(res.data.resultado);
      } else {
        cargar();
      }
    });
  }, [restanteTurno, desafio?.esMiTurno, desafioId, enviando, animando, cargar]);

  const enviarTablero = useCallback(
    async (estadoFinal: TableroPool) => {
      setEnviando(true);
      // Se manda el estado de las 16 bolas tal cual quedó la simulación — el
      // servidor sólo usa las que él mismo sabía que seguían en mesa ANTES
      // de este tiro (`rh_pool_normalizar_bolas`), así que mandar de más
      // (bolas ya embocadas de antes) es inofensivo.
      const res = await hueplayApi.poolMover(desafioId, JSON.stringify(estadoFinal.bolas));
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
      const tableroServidor: TableroPool | null = d.tablero ? JSON.parse(d.tablero) : null;
      movimientosVistosRef.current = d.movimientos;
      setDesafio(d);
      setTablero(tableroServidor);
      if (tableroServidor) setPosiciones(posicionesDeTablero(tableroServidor));
      if (res.data.falta) hapticError();
      if (res.data.resultado) {
        if (res.data.resultado === 'gane') hapticCelebracion();
        setResultado(res.data.resultado);
      }
    },
    [desafioId, cargar, t]
  );

  const onTiro = useCallback(
    (impulso: Vector) => {
      if (!desafio || !tablero || !desafio.esMiTurno || enviando || animando || restanteTurno <= 0) return;
      hapticMedio();

      const r = simularTiro(tablero, impulso);
      setAnimando(true);
      cancelarAnimRef.current = reproducir(r.trayectorias, duracionDeMiTiro(r.trayectorias), setPosiciones, () => {
        if (!vivoRef.current) return;
        void enviarTablero(r.estadoFinal);
      });
    },
    [desafio, tablero, enviando, animando, restanteTurno, enviarTablero]
  );

  const onColocarBlanca = useCallback(
    (x: number, y: number) => {
      if (!tablero) return;
      setTablero((prev) => {
        if (!prev) return prev;
        const bolas = prev.bolas.map((b) => (b.n === 0 ? { ...b, x, y } : b));
        // Sin esto `bolaEnMano` (derivado de `tablero.bolaEnMano`) seguía en
        // true después de tocar para dejar la blanca: el gesto de tiro sigue
        // deshabilitado (`.enabled(activo && !bolaEnMano)` en MesaPool) y
        // cada toque vuelve a "colocar" en vez de disparar — quedaba
        // trabado, sin forma de tirar. Colocarla se resuelve del todo acá
        // mismo, en el cliente; el servidor recién se entera cuando se
        // manda el tiro.
        return { ...prev, bolas, bolaEnMano: false };
      });
      setPosiciones((prev) => ({ ...prev, 0: { x, y, rod: 0, dirX: 0, dirY: 0 } }));
      hapticLeve();
    },
    [tablero]
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
  const miLado: 1 | 2 = desafio.soyRetador ? 1 : 2;
  const miGrupo = miLado === 1 ? tablero.grupoJ1 : tablero.grupoJ2;
  const susGrupo = miLado === 1 ? tablero.grupoJ2 : tablero.grupoJ1;
  const bolasEnMesa = tablero.bolas.filter((b) => b.enMesa && b.n !== 0 && b.n !== 8);
  const misRestantes = miGrupo ? bolasEnMesa.filter((b) => grupoDe(b.n) === miGrupo).length : null;
  const susRestantes = susGrupo ? bolasEnMesa.filter((b) => grupoDe(b.n) === susGrupo).length : null;

  const alturaHudFijo = 170;
  const alturaBarraInferior = APP_TAB_BAR_HEIGHT + Math.max(insets.bottom - 8, 0);
  // `useWindowDimensions` da el alto de TODA la pantalla — el header de la
  // app (flecha de volver + "HuePlay", ver `AppChrome.tsx`) se lleva su
  // propio espacio arriba y esto no lo descontaba, así que el `lado`
  // calculado quedaba más grande de lo que en verdad entraba: la mesa
  // (bien más alta que ancha, 300x600) terminaba con la parte de abajo
  // recortada. Bug real, reportado probando en el celular.
  const alturaBarraSuperior = APP_HEADER_HEIGHT + insets.top;
  const altoDisponible = height - alturaHudFijo - alturaBarraInferior - alturaBarraSuperior;
  const relacionAltoAncho = tablero.mesa.alto / tablero.mesa.ancho;
  const ladoPorAlto = altoDisponible / relacionAltoAncho;
  const lado = Math.max(180, Math.min(width - 32, 300, ladoPorAlto));

  if (terminado || resultado) {
    const r = resultado ?? (desafio.ganadorUserId === null ? 'empate' : 'perdiste');
    return (
      <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={[styles.intro, centeredContent]}>
        <Ionicons name="radio-button-on" size={56} color={colors.primary} />
        <Text
          style={[
            styles.veredicto,
            { color: r === 'gane' ? colors.success : r === 'perdiste' ? colors.danger : colors.text },
          ]}
        >
          {r === 'gane' ? t('hueplay.match.ganaste') : r === 'perdiste' ? t('hueplay.match.perdiste') : t('hueplay.match.empate')}
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
  const bolaEnMano = !!tablero.bolaEnMano && desafio.esMiTurno;

  return (
    <View style={[styles.juego, { backgroundColor: colors.background }]}>
      <View style={[styles.marcador, centeredContent]}>
        <View style={styles.marcadorLado}>
          {/* "Vos" pegado a MI etiqueta, no como separador flotando en el
              medio — así apuntaba a los dos lados por igual y con el grupo
              recién asignado (arranca en "Sin grupo" hasta la primera bola
              legal) el marcador entero quedaba en "Sin grupo · Vos · Sin
              grupo", sin ninguna pista de cuál lado era el propio. */}
          <View style={styles.marcadorFilaLabel}>
            <Text style={[styles.marcadorLabel, { color: colors.textMuted }]}>
              {miGrupo ? t(`hueplay.pool.${miGrupo}`) : t('hueplay.pool.sinGrupo')}
            </Text>
            <View style={[styles.pillVos, { backgroundColor: colors.primarySoft }]}>
              <Text style={{ color: colors.primary, fontSize: 10, fontFamily: fonts.bodySemi }}>
                {t('hueplay.pool.vos')}
              </Text>
            </View>
          </View>
          <Text style={[styles.marcadorValor, { color: colors.text }]}>{misRestantes ?? '—'}</Text>
        </View>
        <Text style={{ color: colors.textMuted, fontSize: 12 }}>{t('hueplay.torneo.vs')}</Text>
        <View style={styles.marcadorLado}>
          <Text style={[styles.marcadorLabel, { color: colors.textMuted }]}>
            {susGrupo ? t(`hueplay.pool.${susGrupo}`) : t('hueplay.pool.sinGrupo')}
          </Text>
          <Text style={[styles.marcadorValor, { color: colors.text }]}>{susRestantes ?? '—'}</Text>
        </View>
      </View>

      {desafio.esMiTurno ? (
        <Text style={[styles.turno, { color: tiempoUrgente ? colors.danger : colors.primary }]}>
          {bolaEnMano ? t('hueplay.pool.bolaEnMano') : t('hueplay.pool.tuTurno')} · {restanteTurno}s
        </Text>
      ) : (
        <Text style={[styles.turno, { color: colors.textMuted }]}>
          {t('hueplay.pool.turnoRival', { rival: desafio.otro.username || desafio.otro.nombreCompleto })}
        </Text>
      )}

      {error ? <Text style={{ color: colors.danger, textAlign: 'center', marginTop: 6 }}>{error}</Text> : null}

      <View style={styles.mesaWrap}>
        <MesaPool
          mesa={tablero.mesa}
          bolas={tablero.bolas.filter((b) => b.enMesa)}
          posiciones={posiciones}
          bolaEnMano={bolaEnMano}
          activo={desafio.esMiTurno && !enviando && !animando && restanteTurno > 0}
          lado={lado}
          onTiro={onTiro}
          onColocarBlanca={onColocarBlanca}
        />
      </View>

      <Text style={{ color: colors.textMuted, fontSize: 10, textAlign: 'center', marginTop: 6 }}>
        {t('hueplay.pool.tiempoNeto', { usados: tablero.segundosNetosUsados, tope: TOPE_SEGUNDOS_NETOS })}
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
  juego: { flex: 1, paddingTop: 8, position: 'relative' },
  marcador: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 24, marginBottom: 4 },
  marcadorLado: { alignItems: 'center' },
  marcadorFilaLabel: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  marcadorLabel: { fontSize: 11, textTransform: 'uppercase' },
  pillVos: { borderRadius: 8, paddingHorizontal: 6, paddingVertical: 1 },
  marcadorValor: { fontSize: 26, fontFamily: fonts.displaySemi },
  turno: { textAlign: 'center', fontFamily: fonts.bodySemi, fontSize: 13, marginTop: 4 },
  mesaWrap: { flex: 1, alignItems: 'center', justifyContent: 'flex-start', marginTop: 8 },
});
