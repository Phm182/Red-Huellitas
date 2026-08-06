import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { SlideInRight } from 'react-native-reanimated';
import { hueplayApi } from '../../../src/api/hueplayApi';
import { TriviaPregunta, TriviaResultado, TriviaTanda } from '../../../src/types/hueplay';
import { radii } from '../../../src/theme/elevation';
import { centeredContent } from '../../../src/theme/layout';
import { fonts } from '../../../src/theme/typography';
import { useTheme } from '../../../src/theme/ThemeProvider';
import { hapticCelebracion, hapticLeve, hapticMedio } from '../../../src/utils/haptics';

type Fase = 'cargando' | 'listo' | 'jugando' | 'enviando' | 'fin';

/**
 * HueTrivia: 10 preguntas de cuidado animal contra reloj.
 *
 * La pantalla no sabe cuál es la respuesta correcta y no puede saberlo: el
 * backend manda las 4 opciones barajadas y corrige al final. Por eso acá no hay
 * feedback inmediato de acierto — se muestra todo junto al terminar, con la
 * explicación de cada una.
 */
export default function HueTriviaScreen() {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ desafioId?: string; semilla?: string }>();

  const desafioId = params.desafioId ? Number(params.desafioId) : null;
  const [semilla] = useState(() =>
    params.semilla ? Number(params.semilla) : Math.floor(Math.random() * 2147483646) + 1
  );

  const [fase, setFase] = useState<Fase>('cargando');
  const [tanda, setTanda] = useState<TriviaTanda | null>(null);
  const [indice, setIndice] = useState(0);
  const [restante, setRestante] = useState(0);
  const [resultado, setResultado] = useState<TriviaResultado | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Las respuestas y el tiempo van en refs: el reloj vive en un `setInterval`
  // que capturó el render en el que se creó y leería valores viejos.
  const respuestasRef = useRef<Record<string, number | null>>({});
  const segundosRef = useRef(0);
  const vivoRef = useRef(true);

  useEffect(() => {
    vivoRef.current = true;
    return () => {
      vivoRef.current = false;
    };
  }, []);

  // El idioma de la app, recortado a 2 letras: el backend decide si lo tiene.
  const idioma = (i18n.language || 'es').slice(0, 2);

  useEffect(() => {
    hueplayApi.triviaPreguntas(semilla, idioma).then((res) => {
      if (!vivoRef.current) return;
      if (res.success && res.data) {
        setTanda(res.data);
        setFase('listo');
      } else {
        setError(res.message ?? t('common.error'));
        setFase('listo');
      }
    });
  }, [semilla, idioma, t]);

  const terminar = useCallback(async () => {
    if (!tanda) return;
    setFase('enviando');

    const res = await hueplayApi.triviaResponder(
      semilla,
      tanda.idioma,
      respuestasRef.current,
      segundosRef.current,
      desafioId
    );
    if (!vivoRef.current) return;

    if (res.success && res.data) {
      hapticCelebracion();
      setResultado(res.data);
    } else {
      setError(res.message ?? t('common.error'));
    }
    setFase('fin');
  }, [tanda, semilla, desafioId, t]);

  const siguiente = useCallback(() => {
    setIndice((i) => {
      const prox = i + 1;
      if (!tanda || prox >= tanda.preguntas.length) {
        terminar();
        return i;
      }
      setRestante(tanda.segundosPorPregunta);
      return prox;
    });
  }, [tanda, terminar]);

  // Reloj por pregunta. Al llegar a cero, la deja sin responder y avanza: es lo
  // que hace que apurarse tenga sentido y que no se pueda buscar la respuesta.
  useEffect(() => {
    if (fase !== 'jugando') return;
    const id = setInterval(() => {
      segundosRef.current += 1;
      setRestante((s) => {
        if (s <= 1) {
          siguiente();
          return tanda?.segundosPorPregunta ?? 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [fase, siguiente, tanda]);

  const responder = (p: TriviaPregunta, opcionId: number) => {
    hapticMedio();
    respuestasRef.current[p.clave] = opcionId;
    siguiente();
  };

  if (fase === 'cargando' || fase === 'enviando') {
    return (
      <View style={[styles.centro, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ color: colors.textMuted, marginTop: 12 }}>
          {fase === 'enviando' ? t('hueplay.trivia.corrigiendo') : t('common.loading')}
        </Text>
      </View>
    );
  }

  if (fase === 'listo') {
    return (
      <ScrollView
        style={{ backgroundColor: colors.background }}
        contentContainerStyle={[styles.intro, centeredContent]}
      >
        <Ionicons name="help-circle" size={64} color="#4CC3A5" />
        <Text style={[styles.titulo, { color: colors.text }]}>HueTrivia</Text>
        <Text style={[styles.bajada, { color: colors.textMuted }]}>
          {t('hueplay.trivia.comoSeJuega', { n: tanda?.preguntas.length ?? 10, s: tanda?.segundosPorPregunta ?? 15 })}
        </Text>

        {error ? <Text style={{ color: colors.danger, marginTop: 14 }}>{error}</Text> : null}

        {/* Si el idioma de la app todavía no tiene preguntas, se avisa en vez de
            que parezca que la app cambió de idioma sola. */}
        {tanda && tanda.idioma !== idioma ? (
          <View style={[styles.aviso, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons name="language" size={16} color={colors.textMuted} />
            <Text style={{ color: colors.textMuted, fontSize: 12, flex: 1 }}>
              {t('hueplay.trivia.sinIdioma')}
            </Text>
          </View>
        ) : null}

        {desafioId ? (
          <View style={[styles.aviso, { backgroundColor: colors.primarySoft, borderColor: colors.primary }]}>
            <Ionicons name="flash" size={16} color={colors.primary} />
            <Text style={{ color: colors.text, fontSize: 12, flex: 1 }}>
              {t('hueplay.trivia.avisoDuelo')}
            </Text>
          </View>
        ) : null}

        {tanda ? (
          <Pressable
            onPress={() => {
              hapticMedio();
              setRestante(tanda.segundosPorPregunta);
              setFase('jugando');
            }}
            style={[styles.boton, { backgroundColor: colors.primary }]}
          >
            <Text style={[styles.botonTexto, { color: colors.primaryText }]}>
              {t('hueplay.match.empezar')}
            </Text>
          </Pressable>
        ) : null}
      </ScrollView>
    );
  }

  if (fase === 'fin') {
    return (
      <ScrollView
        style={{ backgroundColor: colors.background }}
        contentContainerStyle={[styles.intro, centeredContent]}
      >
        <Text style={[styles.puntajeFinal, { color: colors.primary }]}>
          {resultado?.aciertos ?? 0}/{resultado?.total ?? 0}
        </Text>
        <Text style={[styles.bajada, { color: colors.textMuted }]}>
          {t('hueplay.trivia.aciertos')} · {resultado?.puntos ?? 0} {t('hueplay.match.puntos').toLowerCase()}
        </Text>

        {error ? <Text style={{ color: colors.danger, marginTop: 12 }}>{error}</Text> : null}

        {resultado?.esRecord ? (
          <View style={[styles.aviso, { backgroundColor: colors.primarySoft, borderColor: colors.primary }]}>
            <Ionicons name="trophy" size={16} color={colors.primary} />
            <Text style={{ color: colors.text, fontSize: 13, fontFamily: fonts.bodySemi }}>
              {t('hueplay.match.nuevoRecord')}
            </Text>
          </View>
        ) : null}

        {resultado?.progreso ? (
          <View style={[styles.tarjeta, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={{ color: colors.text, fontFamily: fonts.bodySemi }}>
              {t('hueplay.nivel', { n: resultado.progreso.nivel })}
              {resultado.progreso.subioDeNivel ? ` · ${t('hueplay.subisteDeNivel')}` : ''}
            </Text>
          </View>
        ) : null}

        {/* El repaso es la parte útil del juego: sin esto es un puntaje y nada
            más, y la idea era que se aprenda algo de cuidado animal. */}
        {tanda && resultado ? (
          <View style={{ alignSelf: 'stretch', maxWidth: 460, marginTop: 22 }}>
            <Text style={[styles.seccion, { color: colors.textMuted }]}>{t('hueplay.trivia.repaso')}</Text>
            {resultado.detalle.map((d, i) => {
              const p = tanda.preguntas.find((x) => x.clave === d.clave);
              return (
                <View
                  key={d.clave}
                  style={[styles.repaso, { backgroundColor: colors.surface, borderColor: colors.border }]}
                >
                  <View style={styles.repasoTitulo}>
                    <Ionicons
                      name={d.acerto ? 'checkmark-circle' : 'close-circle'}
                      size={18}
                      color={d.acerto ? colors.success : colors.danger}
                    />
                    <Text style={{ color: colors.text, flex: 1, fontSize: 13 }}>
                      {i + 1}. {p?.texto ?? d.clave}
                    </Text>
                  </View>
                  <Text style={{ color: d.acerto ? colors.success : colors.text, fontSize: 12, marginTop: 4 }}>
                    {t('hueplay.trivia.laCorrecta')}: {d.textoCorrecto}
                  </Text>
                  {d.explicacion ? (
                    <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 2 }}>{d.explicacion}</Text>
                  ) : null}
                </View>
              );
            })}
          </View>
        ) : null}

        <View style={styles.botonera}>
          {!desafioId ? (
            <Pressable
              onPress={() => router.replace('/(app)/hueplay/huetrivia')}
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

  const p = tanda!.preguntas[indice]!;
  const urgente = restante <= 5;

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[styles.juego, centeredContent]}
    >
      <View style={styles.hud}>
        <Text style={{ color: colors.textMuted, fontSize: 13 }}>
          {indice + 1} / {tanda!.preguntas.length}
        </Text>
        <Text
          style={{
            color: urgente ? colors.danger : colors.text,
            fontFamily: fonts.displaySemi,
            fontSize: 22,
          }}
        >
          {restante}s
        </Text>
      </View>

      <View style={[styles.barraTiempo, { backgroundColor: colors.border }]}>
        <View
          style={[
            styles.barraLlena,
            {
              backgroundColor: urgente ? colors.danger : colors.primary,
              width: `${(restante / tanda!.segundosPorPregunta) * 100}%`,
            },
          ]}
        />
      </View>

      {/* La pregunta entera entra desplazada y se acomoda.
          La `key` es el índice: al cambiar, React desmonta y vuelve a montar,
          y la animación de entrada se dispara sola en cada pregunta. Sin eso
          el texto se reemplazaba de golpe y no se notaba que habías avanzado. */}
      <Animated.View
        key={indice}
        entering={SlideInRight.duration(260).springify().damping(18)}
      >
      <Text style={[styles.pregunta, { color: colors.text }]}>{p.texto}</Text>

      {p.opciones.map((o) => (
        <Pressable
          key={o.id}
          onPress={() => responder(p, o.id)}
          style={({ pressed }) => [
            styles.opcion,
            {
              backgroundColor: pressed ? colors.primarySoft : colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <Text style={{ color: colors.text, fontSize: 14, flex: 1 }}>{o.texto}</Text>
        </Pressable>
      ))}
      </Animated.View>

      <Pressable
        onPress={() => {
          hapticLeve();
          respuestasRef.current[p.clave] = null;
          siguiente();
        }}
        style={styles.saltear}
      >
        <Text style={{ color: colors.textMuted, fontSize: 13 }}>{t('hueplay.trivia.saltear')}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  intro: { padding: 20, alignItems: 'center', paddingTop: 36, paddingBottom: 40 },
  titulo: { fontSize: 30, fontFamily: fonts.displaySemi, marginTop: 10 },
  bajada: { fontSize: 13, marginTop: 6, textAlign: 'center', lineHeight: 19 },
  puntajeFinal: { fontSize: 54, fontFamily: fonts.displaySemi },
  seccion: { fontSize: 12, fontFamily: fonts.bodySemi, marginBottom: 8, textTransform: 'uppercase' },
  aviso: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: 12,
    marginTop: 16,
    alignSelf: 'stretch',
    maxWidth: 460,
  },
  tarjeta: {
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: 16,
    marginTop: 16,
    alignSelf: 'stretch',
    maxWidth: 460,
  },
  repaso: { borderWidth: 1, borderRadius: radii.md, padding: 12, marginBottom: 8 },
  repasoTitulo: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  boton: { borderRadius: radii.pill, paddingVertical: 14, paddingHorizontal: 34, marginTop: 22 },
  botonSec: { borderWidth: 1, backgroundColor: 'transparent' },
  botonTexto: { fontFamily: fonts.bodySemi, fontSize: 15, textAlign: 'center' },
  botonera: { flexDirection: 'row', gap: 10, alignSelf: 'stretch', maxWidth: 460 },
  juego: { padding: 18, paddingBottom: 40 },
  hud: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  barraTiempo: { height: 6, borderRadius: 3, marginTop: 8, overflow: 'hidden' },
  barraLlena: { height: '100%', borderRadius: 3 },
  pregunta: { fontSize: 19, fontFamily: fonts.displaySemi, marginTop: 22, marginBottom: 18, lineHeight: 26 },
  opcion: {
    borderWidth: 1,
    borderRadius: radii.md,
    padding: 16,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  saltear: { alignSelf: 'center', padding: 12, marginTop: 6 },
});
