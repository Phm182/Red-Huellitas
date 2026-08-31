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
import { hueplayApi } from '../../../src/api/hueplayApi';
import { Ficha } from '../../../src/juego/huematch/Ficha';
import { T_CAE, T_MOVER, T_ROMPER } from '../../../src/juego/huematch/Celda';
import { TableroHueMatch } from '../../../src/juego/huematch/Tablero';
import {
  Celda,
  Colas,
  hayJugada,
  mezclar,
  resolverIntercambio,
  sonVecinas,
  Tablero,
  tableroInicial,
} from '../../../src/juego/huematch/motor';
import { radii } from '../../../src/theme/elevation';
import { centeredContent } from '../../../src/theme/layout';
import { fonts } from '../../../src/theme/typography';
import { useTheme } from '../../../src/theme/ThemeProvider';
import { hapticCelebracion, hapticError, hapticLeve, hapticMedio } from '../../../src/utils/haptics';
import { DiarioResultado, HuePlayProgreso } from '../../../src/types/hueplay';

const SEGUNDOS = 60;
const JUEGO = 'huematch';

type Fase = 'listo' | 'jugando' | 'enviando' | 'fin';

const esperar = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/**
 * HueMatch: alineá 3 o más y sumá antes de que se acabe el minuto.
 *
 * Se entra de dos formas. Suelto, con semilla al azar; o desde un desafío, con
 * `desafioId` y la semilla que manda el servidor — ahí el tablero es idéntico
 * al del rival, que es lo que hace que el duelo se pueda comparar.
 */
export default function HueMatchScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const params = useLocalSearchParams<{ desafioId?: string; semilla?: string; diario?: string }>();

  const desafioId = params.desafioId ? Number(params.desafioId) : null;
  /** Se entró desde el reto del día: el puntaje va a la tabla global. */
  const esDiario = params.diario === '1';

  // La semilla se fija una sola vez. Si se recalculara en cada render, el
  // tablero se regeneraría al tocar cualquier cosa.
  const [semilla] = useState(() =>
    params.semilla ? Number(params.semilla) : Math.floor(Math.random() * 2147483646) + 1
  );

  const [fase, setFase] = useState<Fase>('listo');
  const [tablero, setTablero] = useState<Tablero>([]);
  const colasRef = useRef<Colas>([]);
  const [seleccionada, setSeleccionada] = useState<Celda | null>(null);
  const [rechazadas, setRechazadas] = useState<Celda[] | null>(null);
  /** Las dos fichas que están viajando una al lugar de la otra. */
  const [movimiento, setMovimiento] = useState<{ a: Celda; b: Celda } | null>(null);
  const [bloqueado, setBloqueado] = useState(false);
  const [puntos, setPuntos] = useState(0);
  const [restante, setRestante] = useState(SEGUNDOS);
  const [combo, setCombo] = useState<{ puntos: number; cascada: number } | null>(null);
  /**
   * `true` mientras `animar()` está reproduciendo los pasos de una jugada
   * (desde el primer match, no sólo si encadena). Se lo pasa a `Celda.tsx`
   * — ahí está el comentario completo de por qué hace falta: sin esto, una
   * ficha superviviente que sólo baja de lugar (sin ser ella la que
   * explota) cambiaba de golpe sin ninguna animación.
   */
  const [cascadaActiva, setCascadaActiva] = useState(false);
  const [resultado, setResultado] = useState<{
    progreso: HuePlayProgreso;
    record?: number;
    esRecord?: boolean;
    duelo?: { misPuntos: number; susPuntos: number | null; gane: boolean | null; rival: string };
    diario?: DiarioResultado;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Se lee el puntaje desde una ref al terminar: el `setTimeout` del reloj
  // captura el valor del render en el que se creó, y con `setInterval` eso
  // significaría mandar siempre el puntaje de los primeros segundos.
  const puntosRef = useRef(0);
  const vivoRef = useRef(true);

  useEffect(() => {
    vivoRef.current = true;
    return () => {
      vivoRef.current = false;
    };
  }, []);

  const lado = Math.min(width - 24, 420);

  const arrancar = useCallback(() => {
    const { tablero: t, colas } = tableroInicial(semilla);
    colasRef.current = colas;
    setTablero(t);
    setPuntos(0);
    puntosRef.current = 0;
    setRestante(SEGUNDOS);
    setSeleccionada(null);
    setResultado(null);
    setError(null);
    setFase('jugando');
  }, [semilla]);

  // Reloj.
  useEffect(() => {
    if (fase !== 'jugando') return;
    const id = setInterval(() => {
      setRestante((s) => {
        if (s <= 1) {
          clearInterval(id);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [fase]);

  const terminar = useCallback(async () => {
    setFase('enviando');
    const finales = puntosRef.current;

    try {
      if (desafioId) {
        const res = await hueplayApi.jugarDesafio(desafioId, finales, SEGUNDOS);
        if (!vivoRef.current) return;
        if (res.success && res.data) {
          const d = res.data.desafio;

          // Quién ganó se deduce de los dos puntajes y no de `ganadorUserId`:
          // ese campo trae un id, y para compararlo haría falta el mío, que no
          // viaja en el desafío. `null` es empate, y también es lo que se
          // muestra mientras el rival todavía no jugó.
          const cerrado = d.misPuntos !== null && d.susPuntos !== null;
          const gane = cerrado
            ? d.misPuntos === d.susPuntos
              ? null
              : (d.misPuntos ?? 0) > (d.susPuntos ?? 0)
            : null;

          setResultado({
            progreso: res.data.progreso,
            duelo: {
              misPuntos: d.misPuntos ?? finales,
              susPuntos: d.susPuntos,
              gane,
              rival: d.otro.username || d.otro.nombreCompleto,
            },
          });
        } else {
          setError(res.message ?? t('common.error'));
        }
      } else if (esDiario) {
        const res = await hueplayApi.diarioJugar(JUEGO, finales, SEGUNDOS);
        if (!vivoRef.current) return;
        if (res.success && res.data) {
          setResultado({ progreso: res.data.progreso, diario: res.data });
        } else {
          // "Ya jugaste" no es un fallo: puede pasar si quedó una pantalla
          // vieja abierta. Se muestra como aviso, no como error rojo.
          setError(res.message ?? t('common.error'));
        }
      } else {
        const res = await hueplayApi.guardarPartida(JUEGO, finales, SEGUNDOS);
        if (!vivoRef.current) return;
        if (res.success && res.data) {
          setResultado({
            progreso: res.data,
            record: res.data.record,
            esRecord: res.data.esRecord,
          });
        } else {
          setError(res.message ?? t('common.error'));
        }
      }
    } catch {
      if (vivoRef.current) setError(t('common.error'));
    }

    if (vivoRef.current) setFase('fin');
  }, [desafioId, esDiario, t]);

  useEffect(() => {
    if (fase === 'jugando' && restante === 0) {
      hapticCelebracion();
      terminar();
    }
  }, [fase, restante, terminar]);

  /** Anima los pasos de una jugada: explota, cae, y encadena si hay cascada. */
  const animar = useCallback(
    async (pasos: ReturnType<typeof resolverIntercambio>['pasos']) => {
      if (pasos.length > 0) setCascadaActiva(true);
      for (const paso of pasos) {
        if (!vivoRef.current) return;
        setTablero(paso.explotando);
        if (paso.cascada > 1) {
          setCombo({ puntos: paso.puntos, cascada: paso.cascada });
          hapticMedio();
        }
        // Hay que esperar la animación ENTERA de cada fase (ver constantes en
        // Celda.tsx) antes de pisar el tablero con el próximo paso — si no,
        // una cascada encadenada corta la explosión o la caída a mitad de
        // camino y todo se ve como un solo parpadeo en vez de una secuencia.
        await esperar(T_ROMPER);
        if (!vivoRef.current) return;
        setTablero(paso.resultado);
        setPuntos((p) => {
          const n = p + paso.puntos;
          puntosRef.current = n;
          return n;
        });
        await esperar(T_CAE);
      }
      if (vivoRef.current) {
        setCombo(null);
        setCascadaActiva(false);
      }
    },
    []
  );

  /**
   * El intercambio en sí, que es lo único que comparten el toque y el arrastre.
   *
   * Los dos gestos terminan pidiendo lo mismo —cambiá estas dos fichas— y sólo
   * se diferencian en cómo llegan al par. Tenerlo separado evita que el rebote
   * de una jugada inválida o el remezclado del tablero trabado se escriban dos
   * veces y se vayan desincronizando.
   */
  const intercambiar = useCallback(
    async (a: Celda, b: Celda) => {
      const r = resolverIntercambio(tablero, a, b, semilla, colasRef.current);

      // Las dos fichas salen viajando ANTES de saber si la jugada sirve: es lo
      // que hace que el rebote se entienda. Si primero se comprobara y sólo se
      // animaran las jugadas buenas, equivocarse no tendría respuesta visual y
      // parecería que el toque no se registró.
      setSeleccionada(null);
      setBloqueado(true);
      setMovimiento({ a, b });
      await esperar(T_MOVER);
      if (!vivoRef.current) return;

      if (!r.valido) {
        hapticError();
        setRechazadas([a, b]);
        // A cero: las fichas vuelven solas por donde vinieron.
        setMovimiento(null);
        await esperar(T_MOVER);
        if (!vivoRef.current) return;
        setRechazadas(null);
        setBloqueado(false);
        return;
      }

      // El tablero ya intercambiado y el fin del viaje, en el mismo render: si
      // se limpiara el movimiento sin cambiar el tablero, las fichas saltarían
      // un cuadro a su lugar viejo antes de explotar.
      setTablero(r.intercambiado);
      setMovimiento(null);
      hapticLeve();
      await animar(r.pasos);

      // Tablero trabado: se mezcla en vez de dejar al jugador mirando el reloj.
      if (vivoRef.current && !hayJugada(r.tablero)) {
        await esperar(200);
        if (vivoRef.current) setTablero(mezclar(semilla, colasRef.current));
      }

      if (vivoRef.current) setBloqueado(false);
    },
    [animar, semilla, tablero]
  );

  const onCelda = useCallback(
    async (c: Celda) => {
      if (fase !== 'jugando' || bloqueado) return;

      if (!seleccionada) {
        hapticLeve();
        setSeleccionada(c);
        return;
      }

      if (seleccionada.fila === c.fila && seleccionada.col === c.col) {
        setSeleccionada(null);
        return;
      }

      // Tocar una celda lejana no es un error: se toma como "elegí esta otra".
      if (!sonVecinas(seleccionada, c)) {
        hapticLeve();
        setSeleccionada(c);
        return;
      }

      await intercambiar(seleccionada, c);
    },
    [bloqueado, fase, intercambiar, seleccionada]
  );

  /**
   * Arrastrar una ficha hacia un lado: se cambia con la vecina de ese lado.
   *
   * Es el gesto natural de este tipo de juego —el dedo empuja la ficha— y
   * ahorra los dos toques. El de tocar sigue funcionando: en una pantalla
   * chica, apuntar es más preciso que arrastrar.
   *
   * Arrastrar contra el borde no hace nada, ni suena a error: no hay vecina
   * ahí, y avisarlo sería regañar por algo que se ve solo.
   */
  const onDeslizar = useCallback(
    async (origen: Celda, dir: { df: number; dc: number }) => {
      if (fase !== 'jugando' || bloqueado) return;

      const destino = { fila: origen.fila + dir.df, col: origen.col + dir.dc };
      if (
        destino.fila < 0 ||
        destino.col < 0 ||
        destino.fila >= tablero.length ||
        destino.col >= tablero[0].length
      ) {
        return;
      }

      setSeleccionada(null);
      await intercambiar(origen, destino);
    },
    [bloqueado, fase, intercambiar, tablero]
  );

  const urgente = restante <= 10;

  if (fase === 'listo') {
    return (
      <ScrollView
        style={{ backgroundColor: colors.background }}
        contentContainerStyle={[styles.intro, centeredContent]}
      >
        <View style={styles.introFichas}>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Ficha key={i} tipo={i} size={40} />
          ))}
        </View>
        <Text style={[styles.titulo, { color: colors.text }]}>HueCrush</Text>
        <Text style={[styles.bajada, { color: colors.textMuted }]}>{t('hueplay.match.comoSeJuega')}</Text>

        {desafioId ? (
          <View style={[styles.aviso, { backgroundColor: colors.primarySoft, borderColor: colors.primary }]}>
            <Ionicons name="flash" size={16} color={colors.primary} />
            <Text style={{ color: colors.text, fontSize: 12, flex: 1 }}>
              {t('hueplay.match.avisoDuelo')}
            </Text>
          </View>
        ) : null}

        <Pressable
          onPress={() => {
            hapticMedio();
            arrancar();
          }}
          style={[styles.boton, { backgroundColor: colors.primary }]}
        >
          <Text style={[styles.botonTexto, { color: colors.primaryText }]}>
            {t('hueplay.match.empezar')}
          </Text>
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
    const duelo = resultado?.duelo;
    return (
      <ScrollView
        style={{ backgroundColor: colors.background }}
        contentContainerStyle={[styles.intro, centeredContent]}
      >
        <Text style={[styles.puntajeFinal, { color: colors.primary }]}>{puntos}</Text>
        <Text style={[styles.bajada, { color: colors.textMuted }]}>{t('hueplay.match.puntos')}</Text>

        {error ? (
          <Text style={{ color: colors.danger, marginTop: 12, textAlign: 'center' }}>{error}</Text>
        ) : null}

        {resultado?.esRecord ? (
          <View style={[styles.aviso, { backgroundColor: colors.primarySoft, borderColor: colors.primary }]}>
            <Ionicons name="trophy" size={16} color={colors.primary} />
            <Text style={{ color: colors.text, fontSize: 13, fontFamily: fonts.bodySemi }}>
              {t('hueplay.match.nuevoRecord')}
            </Text>
          </View>
        ) : null}

        {resultado?.diario ? (
          <View style={[styles.tarjeta, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={{ color: colors.text, fontFamily: fonts.bodySemi, fontSize: 15, textAlign: 'center' }}>
              {t('hueplay.diario.quedaste', {
                puesto: resultado.diario.puesto ?? 0,
                total: resultado.diario.participantes,
              })}
            </Text>
            <Text style={{ color: colors.textMuted, fontSize: 12, textAlign: 'center', marginTop: 4 }}>
              {t('hueplay.diario.racha', { dias: resultado.diario.racha })}
            </Text>
          </View>
        ) : null}

        {duelo ? (
          <View style={[styles.tarjeta, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {duelo.susPuntos === null ? (
              <Text style={{ color: colors.textMuted, textAlign: 'center' }}>
                {t('hueplay.match.esperandoRival', { rival: duelo.rival })}
              </Text>
            ) : (
              <>
                <Text
                  style={[
                    styles.veredicto,
                    { color: duelo.gane === null ? colors.text : duelo.gane ? colors.success : colors.danger },
                  ]}
                >
                  {duelo.gane === null
                    ? t('hueplay.match.empate')
                    : duelo.gane
                      ? t('hueplay.match.ganaste')
                      : t('hueplay.match.perdiste')}
                </Text>
                <Text style={{ color: colors.textMuted, textAlign: 'center' }}>
                  {duelo.misPuntos} · {duelo.rival} {duelo.susPuntos}
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
            <View style={[styles.barra, { backgroundColor: colors.border }]}>
              <View
                style={[
                  styles.barraLlena,
                  {
                    backgroundColor: colors.primary,
                    width: `${Math.min(
                      100,
                      ((resultado.progreso.puntos - resultado.progreso.nivelDesde) /
                        Math.max(1, resultado.progreso.nivelHasta - resultado.progreso.nivelDesde)) *
                        100
                    )}%`,
                  },
                ]}
              />
            </View>
            <Text style={{ color: colors.textMuted, fontSize: 12 }}>
              {t('hueplay.faltanParaNivel', {
                n: resultado.progreso.faltan,
                nivel: resultado.progreso.nivel + 1,
              })}
            </Text>
          </View>
        ) : null}

        <View style={styles.botonera}>
          {/* El reto diario es 1 por día: no se ofrece "otra vez" acá. */}
          {!desafioId && !esDiario ? (
            <Pressable
              onPress={() => router.replace('/(app)/hueplay/huematch')}
              style={[styles.boton, { backgroundColor: colors.primary, flex: 1 }]}
            >
              <Text style={[styles.botonTexto, { color: colors.primaryText }]}>
                {t('hueplay.match.otraVez')}
              </Text>
            </Pressable>
          ) : null}
          <Pressable
            onPress={() => router.replace('/(app)/hueplay')}
            style={[styles.boton, styles.botonSec, { borderColor: colors.border, flex: 1 }]}
          >
            <Text style={[styles.botonTexto, { color: colors.text }]}>{t('hueplay.volver')}</Text>
          </Pressable>
        </View>
      </ScrollView>
    );
  }

  return (
    <View style={[styles.juego, { backgroundColor: colors.background }]}>
      <View style={[styles.hud, centeredContent]}>
        <View>
          <Text style={[styles.hudLabel, { color: colors.textMuted }]}>{t('hueplay.match.puntos')}</Text>
          <Text style={[styles.hudValor, { color: colors.text }]}>{puntos}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={[styles.hudLabel, { color: colors.textMuted }]}>{t('hueplay.match.tiempo')}</Text>
          <Text style={[styles.hudValor, { color: urgente ? colors.danger : colors.text }]}>
            {restante}s
          </Text>
        </View>
      </View>

      <View style={[styles.barraTiempo, { backgroundColor: colors.border }]}>
        <View
          style={[
            styles.barraLlena,
            {
              backgroundColor: urgente ? colors.danger : colors.primary,
              width: `${(restante / SEGUNDOS) * 100}%`,
            },
          ]}
        />
      </View>

      <View style={styles.tableroWrap}>
        <TableroHueMatch
          tablero={tablero}
          seleccionada={seleccionada}
          rechazadas={rechazadas}
          lado={lado}
          movimiento={movimiento}
          onCelda={onCelda}
          onDeslizar={onDeslizar}
          bloqueado={bloqueado}
          cascadaActiva={cascadaActiva}
        />
        {combo ? (
          <View style={[styles.combo, { backgroundColor: colors.primary }]}>
            <Text style={{ color: colors.primaryText, fontFamily: fonts.bodyBold, fontSize: 15 }}>
              x{combo.cascada} +{combo.puntos}
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  intro: { padding: 20, alignItems: 'center', paddingTop: 40, paddingBottom: 40 },
  introFichas: { flexDirection: 'row', gap: 4, marginBottom: 14 },
  titulo: { fontSize: 30, fontFamily: fonts.displaySemi },
  bajada: { fontSize: 13, marginTop: 6, textAlign: 'center', lineHeight: 19 },
  puntajeFinal: { fontSize: 56, fontFamily: fonts.displaySemi },
  veredicto: { fontSize: 20, fontFamily: fonts.displaySemi, textAlign: 'center', marginBottom: 4 },
  aviso: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: 12,
    marginTop: 18,
    maxWidth: 420,
  },
  tarjeta: {
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: 16,
    marginTop: 18,
    gap: 8,
    alignSelf: 'stretch',
    maxWidth: 420,
  },
  boton: {
    borderRadius: radii.pill,
    paddingVertical: 14,
    paddingHorizontal: 34,
    marginTop: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botonSec: { borderWidth: 1, backgroundColor: 'transparent' },
  botonTexto: { fontFamily: fonts.bodySemi, fontSize: 15, textAlign: 'center' },
  botonera: { flexDirection: 'row', gap: 10, alignSelf: 'stretch', maxWidth: 420 },
  juego: { flex: 1, paddingTop: 8 },
  hud: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 18, paddingBottom: 8 },
  hudLabel: { fontSize: 11, textTransform: 'uppercase' },
  hudValor: { fontSize: 26, fontFamily: fonts.displaySemi },
  barraTiempo: { height: 6, borderRadius: 3, marginHorizontal: 18, overflow: 'hidden' },
  barra: { height: 8, borderRadius: 4, overflow: 'hidden' },
  barraLlena: { height: '100%', borderRadius: 4 },
  tableroWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  combo: {
    position: 'absolute',
    top: '42%',
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: radii.pill,
  },
});
