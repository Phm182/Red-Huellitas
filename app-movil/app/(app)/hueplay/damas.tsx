import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import { hueplayApi } from '../../../src/api/hueplayApi';
import { CelebracionPatitas } from '../../../src/juego/comun/CelebracionPatitas';
import { PiezaActivaDamas, PiezaComiendoseDamas, TableroDamas } from '../../../src/juego/huedamas/TableroDamas';
import { CasillaDamas, HuePlayDesafio, JugadaDamas, MovimientoLegalDamas } from '../../../src/types/hueplay';
import { radii } from '../../../src/theme/elevation';
import { centeredContent } from '../../../src/theme/layout';
import { fonts } from '../../../src/theme/typography';
import { useTheme } from '../../../src/theme/ThemeProvider';
import { hapticCelebracion, hapticError, hapticLeve, hapticMedio } from '../../../src/utils/haptics';

/** Cada cuánto se le pregunta al servidor si el rival humano movió. */
const POLL_MS = 4000;

/** Cuánto dura, en pantalla, cada salto de una cadena de captura. */
const MS_POR_SALTO = 380;

function esperar(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Arma la lista de piezas a partir del string de 64 posiciones. Sólo se usa
 *  para el primer render y para reconciliar un tablero que cambió sin que
 *  tengamos el detalle de los saltos (el rival movió mientras hacíamos
 *  polling): ahí la pieza "salta" directo a su lugar, sin deslizarse. */
function piezasDesdeTablero(tablero: string): PiezaActivaDamas[] {
  const piezas: PiezaActivaDamas[] = [];
  for (let i = 0; i < tablero.length; i++) {
    const c = tablero[i];
    if (c === '0') continue;
    piezas.push({
      id: `p${i}`,
      fila: Math.floor(i / 8),
      col: i % 8,
      lado: c === '1' || c === '3' ? 1 : 2,
      esDama: c === '3' || c === '4',
    });
  }
  return piezas;
}

/**
 * HueDamas: las damas de HuePlay, por turnos contra otra persona o contra la
 * IA de la app.
 *
 * El servidor manda "desde -> hasta" ya validado y la cadena completa de
 * saltos de esa jugada; acá sólo hay que reproducirla salto por salto para
 * que se vea la ficha comer en cadena, no aplicar el tablero final de golpe.
 */
export default function DamasScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const params = useLocalSearchParams<{ desafioId?: string }>();
  const desafioId = params.desafioId ? Number(params.desafioId) : 0;

  const [desafio, setDesafio] = useState<HuePlayDesafio | null>(null);
  const [piezas, setPiezas] = useState<PiezaActivaDamas[]>([]);
  const [piezasComiendose, setPiezasComiendose] = useState<PiezaComiendoseDamas[]>([]);
  const [movimientosLegales, setMovimientosLegales] = useState<MovimientoLegalDamas[]>([]);
  const [seleccion, setSeleccion] = useState<CasillaDamas | null>(null);
  const [destinosLegales, setDestinosLegales] = useState<CasillaDamas[]>([]);
  const [cargando, setCargando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [puntosGanados, setPuntosGanados] = useState<number | null>(null);
  const [celebrar, setCelebrar] = useState(false);
  const [avisoCorona, setAvisoCorona] = useState(false);

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
    const res = await hueplayApi.verDesafioDamas(desafioId);
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

  // El resultado se calcula solo, sin importar cómo se enteró la pantalla
  // (mi propia jugada, la del rival por polling, o un cierre por vencimiento
  // de turno): sólo hay dos jugadores, así que si el ganador no es "el otro",
  // gané yo.
  useEffect(() => {
    if (!desafio || celebradoRef.current) return;
    if (desafio.estado !== 'terminado') return;
    celebradoRef.current = true;
    const gane = desafio.ganadorUserId !== null && desafio.ganadorUserId !== desafio.otro.userId;
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

  /** Reproduce una cadena de saltos, moviendo y comiendo de a uno. */
  const reproducirJugada = useCallback(async (jugada: JugadaDamas, esMia: boolean) => {
    for (const salto of jugada.saltos) {
      if (!vivoRef.current) return;
      setPiezas((prev) =>
        prev.map((p) =>
          p.fila === salto.desde.fila && p.col === salto.desde.col
            ? { ...p, fila: salto.hasta.fila, col: salto.hasta.col }
            : p
        )
      );
      if (salto.comida) {
        const { fila: cf, col: cc } = salto.comida;
        setPiezas((prev) => {
          const comida = prev.find((p) => p.fila === cf && p.col === cc);
          if (comida) {
            setPiezasComiendose((antes) => [
              ...antes,
              {
                ...comida,
                onTerminada: () => setPiezasComiendose((a) => a.filter((x) => x.id !== comida.id)),
              },
            ]);
          }
          return prev.filter((p) => !(p.fila === cf && p.col === cc));
        });
      }
      await esperar(MS_POR_SALTO);
    }

    if (jugada.corono) {
      const { fila: cf, col: cc } = jugada.corono;
      setPiezas((prev) => prev.map((p) => (p.fila === cf && p.col === cc ? { ...p, esDama: true } : p)));
      if (esMia) {
        setAvisoCorona(true);
        setTimeout(() => {
          if (vivoRef.current) setAvisoCorona(false);
        }, 1400);
      }
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

      const res = await hueplayApi.jugarDamas(desafioId, desde, { fila, col });
      if (!vivoRef.current) return;

      if (!res.success || !res.data) {
        animandoRef.current = false;
        setEnviando(false);
        setError(res.message ?? t('common.error'));
        cargar();
        return;
      }

      await reproducirJugada(res.data.jugada, true);
      if (res.data.jugadaIA) {
        await esperar(250);
        await reproducirJugada(res.data.jugadaIA, false);
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
      // intercambio, y `damas_mover.php` no manda los movimientos legales de
      // ese turno nuevo (sólo `damas_ver.php` los calcula).
      if (res.data.desafio.esMiTurno && !res.data.gane && !res.data.perdiste) {
        const vista = await hueplayApi.verDesafioDamas(desafioId);
        if (vivoRef.current && vista.success && vista.data) {
          setMovimientosLegales(vista.data.movimientosLegales);
        }
      } else {
        setMovimientosLegales([]);
      }
    },
    [desafio, desafioId, enviando, piezas, seleccion, movimientosLegales, reproducirJugada, cargar, t]
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
  const gane = desafio.ganadorUserId !== null && desafio.ganadorUserId !== desafio.otro.userId;
  const tamanoTablero = Math.min(width - 24, 400);
  const rival = desafio.otro.username ? `@${desafio.otro.username}` : desafio.otro.nombreCompleto;
  const hayCapturaObligatoria =
    !terminado && desafio.esMiTurno && movimientosLegales.some((m) => m.saltos.some((s) => s.comida !== null));

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[styles.contenido, centeredContent]}
    >
      <View style={[styles.marcador, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.jugador}>
          <View style={[styles.puntito, { backgroundColor: miLado === 1 ? '#6B4226' : '#F1D9A0' }]} />
          <Text style={{ color: colors.text, fontFamily: fonts.bodySemi }}>{t('hueplay.damas.vos')}</Text>
        </View>
        <Text style={{ color: colors.textMuted, fontSize: 12 }}>
          {t('hueplay.damas.jugadas', { n: desafio.movimientos })}
        </Text>
        <View style={styles.jugador}>
          <Text style={{ color: colors.text, fontFamily: fonts.bodySemi }} numberOfLines={1}>
            {desafio.esRivalIA ? t('hueplay.jugandoContraIA') : rival}
          </Text>
          <View style={[styles.puntito, { backgroundColor: miLado === 1 ? '#F1D9A0' : '#6B4226' }]} />
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
            ? gane
              ? puntosGanados !== null
                ? t('hueplay.damas.ganasteFinPuntos', { puntos: puntosGanados })
                : t('hueplay.damas.ganasteFin')
              : t('hueplay.damas.perdisteFin')
            : desafio.esMiTurno
              ? hayCapturaObligatoria
                ? t('hueplay.damas.capturaObligatoria')
                : seleccion
                  ? t('hueplay.damas.elegiDestino')
                  : t('hueplay.damas.elegiUnaFicha')
              : t('hueplay.damas.turnoDe', { rival: desafio.esRivalIA ? t('hueplay.jugandoContraIA') : rival })}
        </Text>
      </Animated.View>

      <View style={{ width: tamanoTablero, height: tamanoTablero }}>
        <View
          style={[
            styles.tableroFondo,
            { width: tamanoTablero, height: tamanoTablero, backgroundColor: '#8C5A3C' },
          ]}
        >
          <TableroDamas
            piezas={piezas}
            piezasComiendose={piezasComiendose}
            seleccion={seleccion}
            destinosLegales={destinosLegales}
            onTocarCasilla={onTocarCasilla}
            tamano={tamanoTablero}
          />
        </View>

        {celebrar ? <CelebracionPatitas /> : null}

        {avisoCorona ? (
          <View style={[styles.avisoCorona, { backgroundColor: colors.primary }]}>
            <Ionicons name="star" size={14} color={colors.primaryText} />
            <Text style={{ color: colors.primaryText, fontFamily: fonts.bodySemi, fontSize: 12 }}>
              {t('hueplay.damas.coronaste')}
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
          {terminado ? t('hueplay.volver') : t('hueplay.damas.seguirDespues')}
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
  avisoCorona: {
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
    alignItems: 'center',
    justifyContent: 'center',
  },
});
