import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { historiasApi } from '../../../../src/api/historiasApi';
import { StoryInteractivoCard } from '../../../../src/stories/StoryInteractivoCard';
import { StoryMediaFill } from '../../../../src/stories/StoryMediaFill';
import { StoryVolumeSlider } from '../../../../src/stories/StoryVolumeSlider';
import { compartirPost } from '../../../../src/utils/compartir';
import { StoryOverlayLayer, storyFilterCss } from '../../../../src/stories/StoryOverlayLayer';
import { emptyOverlay, StoryOverlay } from '../../../../src/stories/storyEditorTypes';
import { Historia } from '../../../../src/types';
import { rhMediaUrl } from '../../../../src/utils/media';

const DURACION_FOTO_MS = 5000;
const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

/** Cuánto hay que arrastrar para que cuente como swipe y no como toque. */
const UMBRAL_SWIPE = 60;
/** Movimiento mínimo para que el gesto le gane al tap/mantener apretado. */
const UMBRAL_GESTO = 12;

function safeGoBack() {
  if (router.canGoBack()) router.back();
  else router.replace('/(app)/(tabs)');
}

export default function VisorHistoriasScreen() {
  const insets = useSafeAreaInsets();
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const [historias, setHistorias] = useState<Historia[]>([]);
  const [loading, setLoading] = useState(true);
  const [index, setIndex] = useState(0);
  const [canvas, setCanvas] = useState({ w: SCREEN_W, h: SCREEN_H });

  const progresos = useRef<Animated.Value[]>([]).current;

  // El audio arrancaba forzado en mute, así que toda historia con sonido se
  // veía muda. Ahora el silencio es decisión del que mira (y se recuerda
  // mientras dure la sesión de visor) o del autor vía `sinAudio`.
  const [silenciado, setSilenciado] = useState(false);
  const [volumen, setVolumen] = useState(0.85);
  const [mostrarVolumen, setMostrarVolumen] = useState(false);
  const [contentFit, setContentFit] = useState<'cover' | 'contain'>('cover');
  const [pausado, setPausado] = useState(false);
  const [respuesta, setRespuesta] = useState('');
  const [enviandoRespuesta, setEnviandoRespuesta] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [votando, setVotando] = useState(false);
  const animacionRef = useRef<Animated.CompositeAnimation | null>(null);

  // El orden de usuarios sale del mismo feed que dibuja el carrusel, así que
  // el swipe recorre las historias en el orden que el usuario ya vio arriba.
  const [ordenUsuarios, setOrdenUsuarios] = useState<number[]>([]);
  const vecinos = useRef({ anterior: null as number | null, siguiente: null as number | null });

  useEffect(() => {
    let activo = true;
    historiasApi.feed().then((res) => {
      if (!activo || !res.success || !res.data) return;
      setOrdenUsuarios(res.data.usuarios.map((u) => u.autor.userId));
    });
    return () => {
      activo = false;
    };
  }, []);

  useEffect(() => {
    const i = ordenUsuarios.indexOf(Number(userId));
    vecinos.current = {
      anterior: i > 0 ? ordenUsuarios[i - 1] : null,
      siguiente: i >= 0 && i < ordenUsuarios.length - 1 ? ordenUsuarios[i + 1] : null,
    };
  }, [ordenUsuarios, userId]);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
      document.documentElement.style.overflow = '';
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      let activo = true;
      setLoading(true);
      historiasApi.ver(Number(userId)).then((res) => {
        if (!activo) return;
        if (res.success && res.data) {
          setHistorias(res.data.historias);
          progresos.length = 0;
          res.data.historias.forEach(() => progresos.push(new Animated.Value(0)));
        }
        setIndex(0);
        setLoading(false);
      });
      return () => {
        activo = false;
      };
    }, [userId])
  );

  const actual = historias[index] ?? null;

  const overlay: StoryOverlay = useMemo(() => {
    if (!actual?.overlay) return emptyOverlay();
    return {
      filter: (actual.overlay.filter as StoryOverlay['filter']) || 'none',
      texts: (actual.overlay.texts ?? []).map((tx) => ({
        id: tx.id,
        text: tx.text,
        x: tx.x,
        y: tx.y,
        color: tx.color,
        scale: tx.scale ?? 1,
        rotation: tx.rotation ?? 0,
        fontId: (tx.fontId as StoryOverlay['texts'][number]['fontId']) || 'classic',
      })),
      paths: actual.overlay.paths ?? [],
      stickers: (actual.overlay.stickers ?? []).map((s) => ({
        id: s.id,
        emoji: s.emoji,
        x: s.x,
        y: s.y,
        scale: s.scale ?? 1,
        rotation: s.rotation ?? 0,
      })),
      // El interactivo se dibuja aparte (necesita ser tocable), así que no va
      // en la capa de overlay que es pointerEvents="none".
      interactivo: null,
    };
  }, [actual]);

  /**
   * Duración efectiva del tramo a mostrar. Con recorte no destructivo el
   * video dura lo que eligió el autor aunque el archivo sea más largo, y la
   * barra de progreso tiene que medir sobre eso y no sobre el archivo entero.
   */
  const duracionEfectiva = useMemo(() => {
    if (!actual || actual.tipoMedia !== 'video') return null;
    const total = actual.duracionSegundos ?? 15;
    const tramo =
      actual.recorteInicioSeg !== null && actual.recorteFinSeg !== null
        ? actual.recorteFinSeg - actual.recorteInicioSeg
        : total;
    // A 2x el mismo tramo se ve en la mitad de tiempo, así que la barra de
    // progreso tiene que correr más rápido o quedaría desfasada del video.
    const factor = actual.velocidad && actual.velocidad > 0 ? actual.velocidad : 1;
    return Math.max(1, tramo / factor);
  }, [actual]);

  const avanzar = useCallback(() => {
    if (index >= historias.length - 1) {
      safeGoBack();
    } else {
      setContentFit('cover');
      setIndex((i) => i + 1);
    }
  }, [index, historias.length]);

  const retroceder = () => {
    if (index > 0) {
      setContentFit('cover');
      setIndex((i) => i - 1);
    }
  };

  useEffect(() => {
    if (!actual) return;
    historiasApi.marcarVista(actual.historiaId);

    progresos.forEach((valor, i) => {
      if (i < index) valor.setValue(1);
      else if (i > index) valor.setValue(0);
    });

    if (actual.tipoMedia === 'foto') {
      progresos[index]?.setValue(0);
      const animacion = Animated.timing(progresos[index], {
        toValue: 1,
        duration: DURACION_FOTO_MS,
        useNativeDriver: false,
      });
      animacion.start(({ finished }) => {
        if (finished) avanzar();
      });
      return () => animacion.stop();
    }
    return undefined;
  }, [actual, index, avanzar]);

  useEffect(() => {
    if (actual?.tipoMedia !== 'video') return;
    progresos[index]?.setValue(0);
    const duracionMs = (duracionEfectiva ?? 15) * 1000;
    const animacion = Animated.timing(progresos[index], {
      toValue: 1,
      duration: duracionMs,
      useNativeDriver: false,
    });
    animacionRef.current = animacion;
    animacion.start(({ finished }) => {
      // Con recorte el video sigue corriendo más allá del final elegido, así
      // que el avance lo dispara el temporizador y no el `onEnded` del media.
      if (finished && actual.recorteFinSeg !== null) avanzar();
    });
    return () => animacion.stop();
  }, [actual, index, duracionEfectiva, avanzar]);

  // Mantener el dedo apretado pausa: es el gesto básico de las historias y no
  // estaba. Congela la barra donde va y frena el media.
  useEffect(() => {
    if (!pausado) return;
    animacionRef.current?.stop();
  }, [pausado]);

  /**
   * Swipe: horizontal salta de usuario, vertical hacia abajo cierra.
   *
   * Va sobre las zonas de tap y no en lugar de ellas: el responder recién se
   * queda con el gesto cuando hay movimiento real (`UMBRAL_GESTO`), así el
   * toque para avanzar y el mantener apretado para pausar siguen funcionando.
   */
  const swipe = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_e, g) =>
          Math.abs(g.dx) > UMBRAL_GESTO || g.dy > UMBRAL_GESTO,
        onPanResponderRelease: (_e, g) => {
          setPausado(false);
          const horizontal = Math.abs(g.dx) > Math.abs(g.dy);

          if (!horizontal && g.dy > UMBRAL_SWIPE) {
            safeGoBack();
            return;
          }
          if (!horizontal) return;

          const destino = g.dx < -UMBRAL_SWIPE ? vecinos.current.siguiente : null;
          const previo = g.dx > UMBRAL_SWIPE ? vecinos.current.anterior : null;
          const userIdDestino = destino ?? previo;
          if (userIdDestino === null) {
            // Sin vecino en esa dirección: al final del carrusel se cierra,
            // que es lo que hace Instagram y evita el gesto muerto.
            if (g.dx < -UMBRAL_SWIPE) safeGoBack();
            return;
          }
          router.replace({
            pathname: '/(app)/historias/ver/[userId]',
            params: { userId: String(userIdDestino) },
          });
        },
        onPanResponderTerminate: () => setPausado(false),
      }),
    []
  );

  const onVotar = async (opcion: 'A' | 'B') => {
    if (!actual?.encuesta || votando) return;
    setVotando(true);
    const res = await historiasApi.votarEncuesta(actual.encuesta.encuestaId, opcion);
    setVotando(false);
    if (res.success && res.data) {
      const datos = res.data;
      setHistorias((prev) =>
        prev.map((h) =>
          h.historiaId === actual.historiaId && h.encuesta
            ? { ...h, encuesta: { ...h.encuesta, ...datos } }
            : h
        )
      );
    }
  };

  const onCompartirHistoria = () => {
    if (!actual) return;
    void compartirPost({
      texto: actual.cadena
        ? `Mirá esta historia de la cadena "${actual.cadena.tema}" en Red Huellitas`
        : 'Mirá esta historia en Red Huellitas',
      url: rhMediaUrl(actual.mediaPath),
    });
  };

  const onEnviarRespuesta = async () => {
    const texto = respuesta.trim();
    if (!actual || !texto || enviandoRespuesta) return;
    setEnviandoRespuesta(true);
    const res = actual.pregunta
      ? await historiasApi.responderPregunta(actual.pregunta.preguntaId, texto)
      : await historiasApi.responder(actual.historiaId, texto);
    setEnviandoRespuesta(false);
    setRespuesta('');
    setAviso(res.message);
    setTimeout(() => setAviso(null), 2200);
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator color="#fff" />
      </View>
    );
  }

  if (!actual) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Pressable onPress={safeGoBack} style={[styles.closeButton, { top: insets.top + 12 }]}>
          <Text style={styles.closeText}>✕</Text>
        </Pressable>
      </View>
    );
  }

  const cssFilter = storyFilterCss(overlay.filter);
  const mediaUri = rhMediaUrl(actual.mediaPath);

  return (
    <View
      style={styles.container}
      onLayout={(e) => {
        const { width, height } = e.nativeEvent.layout;
        setCanvas({ w: width, h: height });
      }}
    >
      <StoryMediaFill
        key={`${actual.historiaId}_${actual.mediaPath}`}
        uri={mediaUri}
        tipo={actual.tipoMedia}
        cssFilter={cssFilter}
        loop={false}
        // `sinAudio` es decisión del autor y no se puede desactivar; el
        // silencio del que mira sí es reversible con el botón.
        muted={actual.sinAudio || silenciado}
        volume={volumen}
        contentFit={contentFit}
        pausado={pausado}
        inicioSeg={actual.recorteInicioSeg}
        finSeg={actual.recorteFinSeg}
        velocidad={actual.velocidad}
        onEnded={avanzar}
      />

      <StoryOverlayLayer overlay={overlay} width={canvas.w} height={canvas.h} />

      <View style={[styles.progressRow, { top: insets.top + 8 }]}>
        {historias.map((h, i) => (
          <View key={h.historiaId} style={styles.progressTrack}>
            <Animated.View
              style={[
                styles.progressFill,
                {
                  width: progresos[i]
                    ? progresos[i].interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] })
                    : '0%',
                },
              ]}
            />
          </View>
        ))}
      </View>

      <View style={[styles.topActions, { top: insets.top + 16 }]} pointerEvents="box-none">
        {actual.tipoMedia === 'video' || actual.tipoMedia === 'foto' ? (
          <Pressable
            style={[styles.iconBtn, contentFit === 'contain' && styles.iconBtnOn]}
            onPress={() => setContentFit((f) => (f === 'cover' ? 'contain' : 'cover'))}
          >
            <Ionicons name={contentFit === 'contain' ? 'expand' : 'scan'} size={18} color="#fff" />
          </Pressable>
        ) : null}
        {actual.tipoMedia === 'video' && !actual.sinAudio ? (
          <>
            <Pressable
              style={styles.iconBtn}
              onPress={() => {
                setSilenciado((v) => {
                  const next = !v;
                  if (!next) setMostrarVolumen(true);
                  return next;
                });
              }}
            >
              <Ionicons name={silenciado ? 'volume-mute' : 'volume-high'} size={20} color="#fff" />
            </Pressable>
            <Pressable style={styles.iconBtn} onPress={() => setMostrarVolumen((v) => !v)}>
              <Ionicons name="options-outline" size={18} color="#fff" />
            </Pressable>
          </>
        ) : null}
        <Pressable style={styles.iconBtn} onPress={onCompartirHistoria}>
          <Ionicons name="paper-plane-outline" size={20} color="#fff" />
        </Pressable>
        <Pressable style={styles.iconBtn} onPress={safeGoBack}>
          <Ionicons name="close" size={22} color="#fff" />
        </Pressable>
      </View>

      {mostrarVolumen && actual.tipoMedia === 'video' && !actual.sinAudio ? (
        <View style={[styles.volumePanel, { top: insets.top + 56 }]}>
          <Ionicons name="volume-low" size={16} color="#fff" />
          <StoryVolumeSlider
            value={volumen}
            onChange={(v) => {
              setVolumen(v);
              if (v > 0) setSilenciado(false);
            }}
          />
          <Ionicons name="volume-high" size={16} color="#fff" />
        </View>
      ) : null}

      {/* Banner de cadena: el "3º de Chapuzón" es lo que da ganas de sumarse. */}
      {actual.cadena ? (
        <Pressable
          style={[styles.cadenaBanner, { top: insets.top + 56 }]}
          onPress={() => router.push(`/(app)/cadenas/${actual.cadena!.cadenaId}` as never)}
        >
          <Ionicons name="link" size={14} color="#fff" />
          <Text style={styles.cadenaTema} numberOfLines={1}>
            {actual.cadena.tema}
          </Text>
          <Text style={styles.cadenaPos}>
            {actual.cadena.posicion}º de {actual.cadena.total}
          </Text>
        </Pressable>
      ) : null}

      {/* Los interactivos van fuera de StoryOverlayLayer porque tienen que
          poder recibir toques, y esa capa es pointerEvents="none". */}
      {actual.encuesta ? (
        <StoryInteractivoCard
          interactivo={{
            kind: 'encuesta',
            x: actual.overlay?.interactivo?.kind === 'encuesta' ? actual.overlay.interactivo.x : 0.5,
            y: actual.overlay?.interactivo?.kind === 'encuesta' ? actual.overlay.interactivo.y : 0.6,
            pregunta: actual.encuesta.pregunta,
            opcionA: actual.encuesta.opcionA,
            opcionB: actual.encuesta.opcionB,
          }}
          width={canvas.w}
          height={canvas.h}
          votosA={actual.encuesta.votosA}
          votosB={actual.encuesta.votosB}
          miVoto={actual.encuesta.miVoto}
          onVotar={actual.esAutor ? undefined : onVotar}
        />
      ) : null}

      {actual.pregunta ? (
        <StoryInteractivoCard
          interactivo={{
            kind: 'pregunta',
            x: actual.overlay?.interactivo?.kind === 'pregunta' ? actual.overlay.interactivo.x : 0.5,
            y: actual.overlay?.interactivo?.kind === 'pregunta' ? actual.overlay.interactivo.y : 0.6,
            texto: actual.pregunta.texto,
          }}
          width={canvas.w}
          height={canvas.h}
        />
      ) : null}

      {/* Las zonas de tap van DEBAJO de los controles en z-order, si no
          taparían la encuesta y los botones. */}
      <View style={styles.tapZones} {...swipe.panHandlers}>
        <Pressable
          style={styles.tapZone}
          onPress={retroceder}
          onLongPress={() => setPausado(true)}
          onPressOut={() => setPausado(false)}
          delayLongPress={180}
        />
        <Pressable
          style={styles.tapZone}
          onPress={avanzar}
          onLongPress={() => setPausado(true)}
          onPressOut={() => setPausado(false)}
          delayLongPress={180}
        />
      </View>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 12 }]} pointerEvents="box-none">
        {actual.esAutor ? (
          <Pressable
            style={styles.vistasBtn}
            onPress={() => router.push(`/(app)/historia-vistas/${actual.historiaId}` as never)}
          >
            <Ionicons name="eye-outline" size={18} color="#fff" />
            <Text style={styles.vistasLabel}>
              {actual.totalVistas ?? 0} {(actual.totalVistas ?? 0) === 1 ? 'vista' : 'vistas'}
            </Text>
          </Pressable>
        ) : (
          <View style={styles.responderFila}>
            <TextInput
              value={respuesta}
              onChangeText={setRespuesta}
              placeholder={actual.pregunta ? 'Respondé la pregunta…' : 'Enviar mensaje…'}
              placeholderTextColor="rgba(255,255,255,0.6)"
              style={styles.responderInput}
              onFocus={() => setPausado(true)}
              onBlur={() => setPausado(false)}
            />
            <Pressable
              onPress={onEnviarRespuesta}
              disabled={!respuesta.trim() || enviandoRespuesta}
              style={[styles.enviarBtn, (!respuesta.trim() || enviandoRespuesta) && styles.enviarBtnOff]}
            >
              <Ionicons name="send" size={18} color="#fff" />
            </Pressable>
          </View>
        )}

        {aviso ? <Text style={styles.aviso}>{aviso}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    overflow: 'hidden',
    ...(Platform.OS === 'web'
      ? ({
          position: 'fixed' as const,
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: '100%',
          height: '100%',
          maxHeight: '100vh',
        } as object)
      : null),
  },
  centered: { alignItems: 'center', justifyContent: 'center' },
  progressRow: { position: 'absolute', left: 8, right: 8, flexDirection: 'row', gap: 4, zIndex: 5 },
  progressTrack: { flex: 1, height: 3, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#fff' },
  closeButton: { position: 'absolute', right: 12, padding: 8, zIndex: 6 },
  closeText: { color: '#fff', fontSize: 20, fontWeight: '700' },
  // zIndex 4: por debajo de los controles, para no tapar la encuesta ni los
  // botones con las zonas de avance.
  tapZones: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, flexDirection: 'row', zIndex: 4 },
  tapZone: { flex: 1 },
  topActions: { position: 'absolute', right: 12, flexDirection: 'row', gap: 4, zIndex: 6 },
  iconBtn: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 19,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  iconBtnOn: { backgroundColor: 'rgba(226,59,74,0.85)' },
  volumePanel: {
    position: 'absolute',
    left: 12,
    right: 70,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(0,0,0,0.65)',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    zIndex: 7,
  },
  cadenaBanner: {
    position: 'absolute',
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    maxWidth: '65%',
    backgroundColor: 'rgba(226,59,74,0.9)',
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 12,
    zIndex: 6,
  },
  cadenaTema: { color: '#fff', fontWeight: '700', fontSize: 13, flexShrink: 1 },
  cadenaPos: { color: 'rgba(255,255,255,0.85)', fontSize: 11 },
  bottomBar: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 12, zIndex: 6 },
  vistasBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', padding: 8 },
  vistasLabel: { color: '#fff', fontSize: 13, fontWeight: '600' },
  responderFila: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  responderInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 11,
    color: '#fff',
    fontSize: 15,
  },
  enviarBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E23B4A',
  },
  enviarBtnOff: { opacity: 0.4 },
  aviso: { color: '#fff', fontSize: 12, textAlign: 'center', paddingTop: 8 },
});
