import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { hueplayApi } from '../../../src/api/hueplayApi';
import { CelebracionPatitas } from '../../../src/juego/comun/CelebracionPatitas';
import { COLOR_JUGADOR, TableroLudo } from '../../../src/juego/hueludo/TableroLudo';
import { Ficha } from '../../../src/juego/hueludo/Ficha';
import { Dado } from '../../../src/juego/hueludo/Dado';
import { FichaLudo, HuePlaySala, JugadaLudo, MovimientoLegalLudo, TableroLudo as TableroLudoEstado } from '../../../src/types/hueplay';
import { radii } from '../../../src/theme/elevation';
import { centeredContent } from '../../../src/theme/layout';
import { fonts } from '../../../src/theme/typography';
import { useTheme } from '../../../src/theme/ThemeProvider';
import { hapticCelebracion, hapticError, hapticLeve, hapticMedio } from '../../../src/utils/haptics';

/** Cada cuánto se pregunta al servidor si algún otro humano ya jugó su turno. */
const POLL_MS = 4000;
/** Cuánto tarda una ficha en cruzar una sola casilla al animarse. */
const MS_POR_PASO = 220;

function esperar(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * HueLudo: hasta 4 jugadores en la misma sala, con IA opcional en los
 * asientos que sobran. El servidor manda siempre el tablero completo (JSON)
 * más, cuando corresponde, la jugada a reproducir en pantalla — acá sólo se
 * anima lo que el servidor ya validó y aplicó.
 */
export default function LudoScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const params = useLocalSearchParams<{ salaId?: string }>();
  const salaId = params.salaId ? Number(params.salaId) : 0;

  const [sala, setSala] = useState<HuePlaySala | null>(null);
  const [piezas, setPiezas] = useState<FichaLudo[]>([]);
  const [dado, setDado] = useState<number | null>(null);
  const [tirando, setTirando] = useState(false);
  const [movimientosLegales, setMovimientosLegales] = useState<MovimientoLegalLudo[]>([]);
  const [cargando, setCargando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [celebrar, setCelebrar] = useState(false);

  const vivoRef = useRef(true);
  const animandoRef = useRef(false);
  const tableroRef = useRef<string>('');
  const celebradoRef = useRef(false);

  useEffect(() => {
    vivoRef.current = true;
    return () => {
      vivoRef.current = false;
    };
  }, []);

  const aplicarSala = useCallback((nuevaSala: HuePlaySala) => {
    setSala(nuevaSala);
    if (!animandoRef.current && nuevaSala.tablero !== tableroRef.current) {
      tableroRef.current = nuevaSala.tablero ?? '';
      if (nuevaSala.tablero) {
        const t: TableroLudoEstado = JSON.parse(nuevaSala.tablero);
        setPiezas(t.fichas);
      }
    }
  }, []);

  const cargar = useCallback(async () => {
    if (!salaId) return;
    const res = await hueplayApi.verSala(salaId);
    if (!vivoRef.current) return;
    if (res.success && res.data) {
      setError(null);
      aplicarSala(res.data.sala);
    } else {
      setError(res.message ?? t('common.error'));
    }
    setCargando(false);
  }, [salaId, aplicarSala, t]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  useEffect(() => {
    if (!sala) return;
    if (sala.estado !== 'jugando' || sala.esMiTurno) return;
    const id = setInterval(cargar, POLL_MS);
    return () => clearInterval(id);
  }, [sala, cargar]);

  useEffect(() => {
    if (!sala || celebradoRef.current) return;
    if (sala.estado !== 'terminada' || sala.ganadorSalaJugadorId === null) return;
    celebradoRef.current = true;
    const gane = sala.miAsientoId === sala.ganadorSalaJugadorId;
    if (gane) {
      hapticCelebracion();
      setCelebrar(true);
    } else {
      hapticError();
    }
  }, [sala]);

  /** Mueve una ficha, paso a paso, de `desde` a `hasta` — así se ve "caminar" en vez de teletransportarse. */
  const reproducirJugada = useCallback(async (jugada: JugadaLudo) => {
    if (!jugada.ficha || jugada.desde === null || jugada.hasta === null) {
      return; // dado tirado sin ninguna jugada posible
    }
    const { jugador, num } = jugada.ficha;
    for (let p = jugada.desde + 1; p <= jugada.hasta; p++) {
      if (!vivoRef.current) return;
      setPiezas((prev) => prev.map((f) => (f.jugador === jugador && f.num === num ? { ...f, pos: p } : f)));
      await esperar(MS_POR_PASO);
    }
    if (jugada.capturadas.length > 0) {
      setPiezas((prev) =>
        prev.map((f) =>
          jugada.capturadas.some((c) => c.jugador === f.jugador && c.num === f.num) ? { ...f, pos: -1 } : f
        )
      );
      await esperar(200);
    }
  }, []);

  const reproducirCadenaIA = useCallback(
    async (jugadasIA: { salaJugadorId: number; jugadas: JugadaLudo[] }[]) => {
      for (const bloque of jugadasIA) {
        for (const jugada of bloque.jugadas) {
          if (!vivoRef.current) return;
          await reproducirJugada(jugada);
        }
      }
    },
    [reproducirJugada]
  );

  const tirar = async () => {
    if (!sala || !sala.esMiTurno || enviando) return;
    hapticMedio();
    setEnviando(true);
    setError(null);
    setAviso(null);
    setTirando(true);
    await esperar(550);

    const res = await hueplayApi.ludoTirar(sala.salaId);
    if (!vivoRef.current) return;
    setTirando(false);

    if (!res.success || !res.data) {
      setEnviando(false);
      setError(res.message ?? t('common.error'));
      return;
    }

    setDado(res.data.dado);

    if (res.data.pasoElTurno) {
      setAviso(t('hueplay.ludo.sinJugada', { dado: res.data.dado }));
      animandoRef.current = true;
      await esperar(700);
      await reproducirCadenaIA(res.data.jugadasIA);
      animandoRef.current = false;
      if (!vivoRef.current) return;
      tableroRef.current = res.data.sala.tablero ?? '';
      setSala(res.data.sala);
      setMovimientosLegales([]);
      setEnviando(false);
    } else {
      setMovimientosLegales(res.data.movimientosLegales);
      setSala(res.data.sala);
      setEnviando(false);
    }
  };

  const moverFicha = async (fichaNum: number) => {
    if (!sala || enviando) return;
    const movimiento = movimientosLegales.find((m) => m.ficha.num === fichaNum);
    if (!movimiento) return;

    hapticLeve();
    setEnviando(true);
    setMovimientosLegales([]);
    animandoRef.current = true;

    const res = await hueplayApi.ludoMover(sala.salaId, fichaNum);
    if (!vivoRef.current) return;

    if (!res.success || !res.data) {
      animandoRef.current = false;
      setEnviando(false);
      setError(res.message ?? t('common.error'));
      cargar();
      return;
    }

    await reproducirJugada(res.data.jugada.jugadas[0]);
    if (res.data.jugadasIA.length > 0) {
      await esperar(200);
      await reproducirCadenaIA(res.data.jugadasIA);
    }
    if (!vivoRef.current) return;

    animandoRef.current = false;
    tableroRef.current = res.data.sala.tablero ?? '';
    setSala(res.data.sala);
    setDado(null);
    setEnviando(false);

    // Con un 6 el turno sigue siendo mío: hay que volver a tirar. El backend
    // ya dejó el tablero listo, sólo falta que el cliente lo pida.
    if (res.data.sala.esMiTurno && !res.data.gane) {
      setAviso(null);
    }
  };

  if (cargando) {
    return (
      <View style={[styles.centro, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!sala) {
    return (
      <View style={[styles.centro, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.danger }}>{error ?? t('common.error')}</Text>
      </View>
    );
  }

  const terminado = sala.estado === 'terminada';
  const gane = terminado && sala.miAsientoId === sala.ganadorSalaJugadorId;
  const tamanoTablero = Math.min(width - 24, 400);
  const cell = tamanoTablero / 15;

  const jugadorPorAsiento = new Map(sala.jugadores.map((j) => [j.salaJugadorId, j]));
  const asientoDelTurno = sala.turnoDeSalaJugadorId !== null ? jugadorPorAsiento.get(sala.turnoDeSalaJugadorId) : null;
  const miAsiento = sala.jugadores.find((j) => j.esYo);
  const nombreDe = (j: (typeof sala.jugadores)[number]) => (j.username ? `@${j.username}` : j.nombreCompleto);
  const colorDelTurno = asientoDelTurno ? COLOR_JUGADOR[asientoDelTurno.posicion] : colors.textMuted;

  const fichasResaltadasNum = new Set(
    !terminado && sala.esMiTurno ? movimientosLegales.map((m) => m.ficha.num) : []
  );

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[styles.contenido, centeredContent]}
    >
      <View style={[styles.jugadoresFila]}>
        {sala.jugadores.map((j) => (
          <View
            key={j.salaJugadorId}
            style={[
              styles.jugadorChip,
              {
                backgroundColor: sala.turnoDeSalaJugadorId === j.salaJugadorId ? colors.primarySoft : colors.surface,
                borderColor:
                  sala.turnoDeSalaJugadorId === j.salaJugadorId ? COLOR_JUGADOR[j.posicion] : colors.border,
              },
            ]}
          >
            <View style={[styles.puntito, { backgroundColor: COLOR_JUGADOR[j.posicion] }]} />
            <Text style={{ color: colors.text, fontSize: 11, maxWidth: 70 }} numberOfLines={1}>
              {j.esBot ? t('hueplay.jugandoContraIA') : j.esYo ? t('hueplay.ludo.vos') : nombreDe(j)}
            </Text>
            {j.estado === 'expulsado' ? <Ionicons name="close-circle" size={12} color={colors.danger} /> : null}
            {j.tomadoPorIA ? <Ionicons name="hardware-chip-outline" size={12} color={colors.textMuted} /> : null}
          </View>
        ))}
      </View>

      <View
        style={[
          styles.aviso,
          {
            backgroundColor: terminado ? colors.surface : sala.esMiTurno ? colors.primarySoft : colors.surface,
            borderColor: sala.esMiTurno && !terminado ? colors.primary : colors.border,
          },
        ]}
      >
        {!terminado && !sala.esMiTurno ? <ActivityIndicator size="small" color={colors.textMuted} /> : null}
        <Text style={{ color: colors.text, fontSize: 13, flex: 1 }}>
          {terminado
            ? gane
              ? t('hueplay.ludo.ganasteFin')
              : t('hueplay.ludo.perdisteFin')
            : aviso
              ? aviso
              : sala.esMiTurno
                ? movimientosLegales.length > 0
                  ? t('hueplay.ludo.elegiFicha')
                  : t('hueplay.ludo.tocaTirar')
                : t('hueplay.ludo.turnoDe', {
                    rival: asientoDelTurno
                      ? asientoDelTurno.esBot
                        ? t('hueplay.jugandoContraIA')
                        : nombreDe(asientoDelTurno)
                      : '',
                  })}
        </Text>
      </View>

      <View style={{ width: tamanoTablero, height: tamanoTablero, position: 'relative' }}>
        <TableroLudo tamano={tamanoTablero} />
        {piezas.map((f) => (
          <Ficha
            key={`${f.jugador}-${f.num}`}
            jugador={f.jugador}
            num={f.num}
            pos={f.pos}
            tamano={tamanoTablero}
            resaltada={f.jugador === miAsiento?.posicion && fichasResaltadasNum.has(f.num)}
            onPress={
              f.jugador === miAsiento?.posicion && fichasResaltadasNum.has(f.num)
                ? () => moverFicha(f.num)
                : undefined
            }
          />
        ))}
        {celebrar ? <CelebracionPatitas /> : null}
      </View>

      <View style={styles.dadoFila}>
        <Dado valor={dado} tirando={tirando} color={colorDelTurno} tamano={cell * 1.6} />
        {!terminado && sala.esMiTurno && movimientosLegales.length === 0 ? (
          <Pressable
            disabled={enviando}
            onPress={tirar}
            style={[styles.botonTirar, { backgroundColor: colors.primary, opacity: enviando ? 0.6 : 1 }]}
          >
            {enviando ? (
              <ActivityIndicator size="small" color={colors.primaryText} />
            ) : (
              <Text style={{ color: colors.primaryText, fontFamily: fonts.bodySemi, fontSize: 14 }}>
                {t('hueplay.ludo.tirarDado')}
              </Text>
            )}
          </Pressable>
        ) : null}
      </View>

      {error ? <Text style={{ color: colors.danger, marginTop: 10, textAlign: 'center' }}>{error}</Text> : null}

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
  jugadoresFila: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center', marginBottom: 10 },
  jugadorChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderRadius: radii.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  puntito: { width: 10, height: 10, borderRadius: 5 },
  aviso: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: 12,
    marginBottom: 12,
    alignSelf: 'stretch',
    maxWidth: 400,
  },
  dadoFila: { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 16 },
  botonTirar: { borderRadius: radii.pill, paddingHorizontal: 22, paddingVertical: 12 },
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
