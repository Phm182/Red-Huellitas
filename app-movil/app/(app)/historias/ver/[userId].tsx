import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as SystemUI from 'expo-system-ui';
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
  Keyboard,
  TextInput,
  View,
} from 'react-native';
import { useTheme } from '../../../../src/theme/ThemeProvider';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../../../src/auth/AuthProvider';
import { historiasApi } from '../../../../src/api/historiasApi';
import { DenunciaButtonStub } from '../../../../src/components/DenunciaButtonStub';
import { StoryInteractivoCard } from '../../../../src/stories/StoryInteractivoCard';
import { StoryMediaFill } from '../../../../src/stories/StoryMediaFill';
import { StoryVolumeSlider } from '../../../../src/stories/StoryVolumeSlider';
import { compartirPost } from '../../../../src/utils/compartir';
import { StoryOverlayLayer, storyFilterCss } from '../../../../src/stories/StoryOverlayLayer';
import { emptyOverlay, StoryOverlay } from '../../../../src/stories/storyEditorTypes';
import { Historia, UsuarioResumen } from '../../../../src/types';
import { rhAvatarUrl, rhMediaUrl } from '../../../../src/utils/media';
import { ReaccionesBarra, ReaccionHistoria } from '../../../../src/historias/ReaccionesBarra';

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

/**
 * Envoltorio que desliza toda la pantalla al saltar de un usuario a otro: sale
 * hacia el lado del gesto y el siguiente entra desde el lado contrario, así la
 * animación acompaña si se va hacia adelante o hacia atrás.
 */
export default function VisorHistorias() {
  const slide = useRef(new Animated.Value(0)).current;
  // Primera foto de los usuarios vecinos: se dibujan pegados a los costados de
  // la pantalla para que, al arrastrar, el que sigue vaya apareciendo unido.
  const [vecinas, setVecinas] = useState<{ anterior: string | null; siguiente: string | null }>({
    anterior: null,
    siguiente: null,
  });
  const panel = (uri: string | null, lado: -1 | 1) => (
    <View style={[styles.panelVecino, { left: lado * SCREEN_W }]} pointerEvents="none">
      {uri ? <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="contain" cachePolicy="memory-disk" transition={0} /> : null}
    </View>
  );
  return (
    <View style={{ flex: 1, backgroundColor: '#000', overflow: 'hidden' }}>
      <Animated.View style={{ flex: 1, transform: [{ translateX: slide }] }}>
        {panel(vecinas.anterior, -1)}
        <VisorHistoriasScreen slide={slide} onVecinas={setVecinas} />
        {panel(vecinas.siguiente, 1)}
      </Animated.View>
    </View>
  );
}

function VisorHistoriasScreen({
  slide,
  onVecinas,
}: {
  slide: Animated.Value;
  onVecinas: (v: { anterior: string | null; siguiente: string | null }) => void;
}) {
  // Historias de los usuarios vecinos ya bajadas, para entrar a ellas sin espera.
  const cacheRef = useRef<Record<number, Historia[]>>({});
  // true mientras se pasa a un vecino ya cacheado: la pantalla vuelve a 0 cuando
  // su contenido ya está dibujado, sin pasar por negro.
  const continuoRef = useRef(false);
  const { user } = useAuth();
  const { colors } = useTheme();
  // El teclado desplaza la ventana ("pan") y lo que asoma detrás es el fondo de
  // la ventana, que es claro: por eso parpadeaba en blanco. Mientras se ven
  // historias el fondo de la ventana es negro.
  useFocusEffect(
    useCallback(() => {
      SystemUI.setBackgroundColorAsync('#000000').catch(() => {});
      return () => {
        SystemUI.setBackgroundColorAsync(colors.background).catch(() => {});
      };
    }, [colors.background])
  );
  // Hacia dónde entra el próximo usuario (+1 desde la derecha, -1 desde la izquierda).
  const entradaRef = useRef<0 | 1 | -1>(0);
  const [autores, setAutores] = useState<Record<number, UsuarioResumen>>({});
  const insets = useSafeAreaInsets();
  const { userId, historiaId: historiaIdParam } = useLocalSearchParams<{ userId: string; historiaId?: string }>();
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
  // Lo que el que mira eligió con el botón de la esquina (null = el ajuste base de la historia).
  const [fitManual, setFitManual] = useState<'cover' | 'contain' | null>(null);
  // Pausa por mantener apretado (se suelta al levantar el dedo)...
  const [pausado, setPausado] = useState(false);
  // ...y pausa mientras se escribe una respuesta (dura mientras el campo tenga el
  // foco o quede algo escrito). La reproducción se frena si CUALQUIERA de las dos.
  const [escribiendo, setEscribiendo] = useState(false);
  const [respuesta, setRespuesta] = useState('');
  const [enviandoRespuesta, setEnviandoRespuesta] = useState(false);
  // Al cerrarse el teclado (botón atrás, tocar afuera) la historia se reanuda.
  useEffect(() => {
    const sub = Keyboard.addListener('keyboardDidHide', () => setEscribiendo(false));
    return () => sub.remove();
  }, []);
  const [aviso, setAviso] = useState<string | null>(null);
  const [votando, setVotando] = useState(false);
  const animacionRef = useRef<Animated.CompositeAnimation | null>(null);
  // Cuánto de la barra actual ya se recorrió (0..1), para retomar desde ahí.
  const avanceRef = useRef(0);

  // El orden de usuarios sale del mismo feed que dibuja el carrusel, así que
  // el swipe recorre las historias en el orden que el usuario ya vio arriba.
  // Al ir al perfil desde la cabecera el visor queda debajo: si el tiempo siguiera
  // corriendo terminaría la historia y haría `back()` sobre el perfil.
  const [enfocada, setEnfocada] = useState(true);
  // Historia en la que se estaba al salir (p. ej. al perfil), para retomarla al volver.
  const indexRef = useRef(0);
  const guardado = useRef<{ userId: string; index: number } | null>(null);
  const [ordenUsuarios, setOrdenUsuarios] = useState<number[]>([]);
  const vecinos = useRef({ anterior: null as number | null, siguiente: null as number | null });
  const vecinasRef = useRef<{ anterior: string | null; siguiente: string | null }>({ anterior: null, siguiente: null });

  useEffect(() => {
    let activo = true;
    historiasApi.feed().then((res) => {
      if (!activo || !res.success || !res.data) return;
      setOrdenUsuarios(res.data.usuarios.map((u) => u.autor.userId));
      const mapa: Record<number, UsuarioResumen> = {};
      res.data.usuarios.forEach((u) => {
        mapa[u.autor.userId] = u.autor;
      });
      setAutores(mapa);
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
    vecinasRef.current = { anterior: null, siguiente: null };
    onVecinas(vecinasRef.current);
    let activo = true;
    const traer = (id: number | null, clave: 'anterior' | 'siguiente') => {
      if (id === null) return;
      historiasApi.ver(id).then((res) => {
        if (!activo || !res.success || !res.data) return;
        cacheRef.current[id] = res.data.historias;
        // Las fotos del vecino se bajan ya, así aparece al instante al deslizar.
        res.data.historias.forEach((h) => {
          if (h.tipoMedia === 'foto') void Image.prefetch(rhMediaUrl(h.mediaPath), 'memory-disk');
        });
        const primera = res.data.historias[0];
        const uri = primera && primera.tipoMedia === 'foto' ? rhMediaUrl(primera.mediaPath) : null;
        vecinasRef.current = { ...vecinasRef.current, [clave]: uri };
        onVecinas(vecinasRef.current);
      });
    };
    traer(vecinos.current.anterior, 'anterior');
    traer(vecinos.current.siguiente, 'siguiente');
    return () => {
      activo = false;
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
      setEnfocada(true);
      const cacheado = historiaIdParam ? undefined : cacheRef.current[Number(userId)];
      if (!cacheado) setLoading(true);
      const pedir = cacheado
        ? Promise.resolve({ success: true, data: { historias: cacheado } })
        : historiasApi.ver(Number(userId));
      pedir.then((res) => {
        if (!activo) return;
        if (res.success && res.data) {
          setHistorias(res.data.historias);
          progresos.length = 0;
          res.data.historias.forEach(() => progresos.push(new Animated.Value(0)));
        }
        // Si se llegó desde el chat, se abre directo la historia a la que se respondió.
        const inicio = historiaIdParam
          ? (res.success && res.data ? res.data.historias.findIndex((h) => h.historiaId === Number(historiaIdParam)) : -1)
          : -1;
        const g = guardado.current;
        guardado.current = null;
        const retomar = g && g.userId === String(userId) && res.success && res.data ? Math.min(g.index, res.data.historias.length - 1) : 0;
        setIndex(inicio > 0 ? inicio : Math.max(0, retomar));
        setLoading(false);
        if (entradaRef.current !== 0 && !continuoRef.current) {
          entradaRef.current = 0;
          Animated.timing(slide, { toValue: 0, duration: 110, useNativeDriver: true }).start();
        }
      });
      return () => {
        activo = false;
        guardado.current = { userId: String(userId), index: indexRef.current };
        setEnfocada(false);
      };
    }, [userId, historiaIdParam])
  );

  indexRef.current = index;
  // Id de la historia cuya foto ya se dibujó: la pantalla sólo vuelve a su lugar
  // cuando la del vecino está pintada, si no se ve un parpadeo al reemplazar
  // la copia que se mostraba al costado.
  const [cargadaId, setCargadaId] = useState<number | null>(null);
  useEffect(() => {
    const primera = historias[index];
    if (!continuoRef.current || loading || !primera || primera.userId !== Number(userId)) return;
    if (primera.tipoMedia === 'foto' && cargadaId !== primera.historiaId) return;
    // Un cuadro más de margen para que el dibujado llegue a pantalla.
    const t = setTimeout(() => {
      slide.setValue(0);
      continuoRef.current = false;
      entradaRef.current = 0;
    }, 50);
    return () => clearTimeout(t);
  }, [historias, index, loading, userId, slide, cargadaId]);
  const actual = historias[index] ?? null;
  // Indexado por historiaId: al pasar a la siguiente Huellita no se puede
  // arrastrar la reacción de la anterior.
  const [reacciones, setReacciones] = useState<
    Record<number, { mia: ReaccionHistoria | null; conteo: Record<string, number> }>
  >({});

  const onReaccionar = async (tipo: ReaccionHistoria) => {
    if (!actual) return;
    const res = await historiasApi.reaccionar(actual.historiaId, tipo);
    if (!res.success || !res.data) return;
    setReacciones((prev) => ({
      ...prev,
      [actual.historiaId]: {
        mia: (res.data!.miReaccion as ReaccionHistoria | null) ?? null,
        conteo: res.data!.conteo ?? {},
      },
    }));
  };

  // Cómo se ve cada historia: tal cual la subió el autor. Si el autor eligió un
  // ajuste a propósito se respeta; si no, la foto se muestra ENTERA (antes se
  // agrandaba para llenar la pantalla vertical y se le cortaban los costados).
  // El video sigue llenando la pantalla. El botón de la esquina permite alternar.
  const fitBase: 'cover' | 'contain' =
    actual?.overlay?.contentFit ?? (actual?.tipoMedia === 'video' ? 'cover' : 'contain');
  const contentFit = fitManual ?? fitBase;
  useEffect(() => {
    setFitManual(null);
  }, [actual?.historiaId]);

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
      setIndex((i) => i + 1);
    }
  }, [index, historias.length]);

  const retroceder = () => {
    if (index > 0) {
      setIndex((i) => i - 1);
    }
  };

  const enPausa = pausado || escribiendo || !enfocada;

  // Al cambiar de historia: se marca vista y la barra vuelve a cero.
  useEffect(() => {
    if (!actual) return;
    historiasApi.marcarVista(actual.historiaId);

    progresos.forEach((valor, i) => {
      if (i < index) valor.setValue(1);
      else if (i > index) valor.setValue(0);
    });
    progresos[index]?.setValue(0);
    avanceRef.current = 0;
  }, [actual, index]);

  // Sigue el avance real de la barra actual, así una pausa sabe desde dónde retomar.
  useEffect(() => {
    const valor = progresos[index];
    if (!valor) return;
    const id = valor.addListener(({ value }) => {
      avanceRef.current = value;
    });
    return () => valor.removeListener(id);
  }, [index, progresos.length]);

  // El reloj de la historia. Se frena mientras `enPausa` (dedo apretado o
  // escribiendo una respuesta) y RETOMA desde donde quedó: antes la pausa sólo
  // detenía la animación de los videos y para siempre, y en las fotos ni eso,
  // así que escribir una respuesta dejaba correr el tiempo y te sacaba de la
  // historia a mitad de frase.
  useEffect(() => {
    if (!actual || enPausa) return;
    const esFoto = actual.tipoMedia === 'foto';
    const totalMs = esFoto ? DURACION_FOTO_MS : (duracionEfectiva ?? 15) * 1000;
    const restanteMs = Math.max(50, totalMs * (1 - avanceRef.current));
    const animacion = Animated.timing(progresos[index], {
      toValue: 1,
      duration: restanteMs,
      useNativeDriver: false,
    });
    animacionRef.current = animacion;
    animacion.start(({ finished }) => {
      // Video con recorte: el avance lo dispara el temporizador y no el `onEnded`
      // del media (el video sigue corriendo más allá del final elegido).
      if (finished && (esFoto || actual.recorteFinSeg !== null)) avanzar();
    });
    return () => animacion.stop();
  }, [actual, index, duracionEfectiva, avanzar, enPausa]);

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
        onPanResponderMove: (_e, g) => {
          // La pantalla acompaña al dedo mientras se arrastra de lado.
          if (Math.abs(g.dx) > Math.abs(g.dy) && Math.abs(g.dx) > UMBRAL_GESTO) {
            const v = vecinos.current;
            if ((g.dx < 0 && v.siguiente !== null) || (g.dx > 0 && v.anterior !== null)) {
              slide.setValue(g.dx);
            }
          }
        },
        onPanResponderRelease: (_e, g) => {
          setPausado(false);
          const horizontal = Math.abs(g.dx) > Math.abs(g.dy);

          if (!horizontal && g.dy > UMBRAL_SWIPE) {
            safeGoBack();
            return;
          }
          if (!horizontal) return;
          if (Math.abs(g.dx) <= UMBRAL_SWIPE) {
            Animated.timing(slide, { toValue: 0, duration: 120, useNativeDriver: true }).start();
            return;
          }

          const destino = g.dx < -UMBRAL_SWIPE ? vecinos.current.siguiente : null;
          const previo = g.dx > UMBRAL_SWIPE ? vecinos.current.anterior : null;
          const userIdDestino = destino ?? previo;
          if (userIdDestino === null) {
            // Sin vecino en esa dirección: al final del carrusel se cierra,
            // que es lo que hace Instagram y evita el gesto muerto.
            if (g.dx < -UMBRAL_SWIPE) safeGoBack();
            return;
          }
          // Adelante (dedo a la izquierda): sale hacia la izquierda y el próximo
          // entra por la derecha. Atrás: al revés.
          const dir: 1 | -1 = g.dx < 0 ? 1 : -1;
          const yaLista = cacheRef.current[userIdDestino] !== undefined;
          Animated.timing(slide, { toValue: -dir * SCREEN_W, duration: 80, useNativeDriver: true }).start(() => {
            entradaRef.current = dir;
            if (yaLista) {
              // El vecino ya estaba dibujado al costado: se deja la pantalla ahí
              // y se vuelve a 0 recién cuando su contenido real está puesto.
              continuoRef.current = true;
              setTimeout(() => {
                if (continuoRef.current) {
                  slide.setValue(0);
                  continuoRef.current = false;
                  entradaRef.current = 0;
                }
              }, 700);
            } else {
              slide.setValue(dir * SCREEN_W);
            }
            router.setParams({ userId: String(userIdDestino), historiaId: undefined } as never);
          });
        },
        onPanResponderTerminate: () => {
          setPausado(false);
          Animated.timing(slide, { toValue: 0, duration: 120, useNativeDriver: true }).start();
        },
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
    setEscribiendo(false);
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

  const autorActual: UsuarioResumen | null =
    autores[Number(userId)] ??
    (user && user.userId === Number(userId)
      ? {
          userId: user.userId,
          username: (user as { username?: string | null }).username ?? null,
          nombreCompleto: (user as { nombreCompleto?: string }).nombreCompleto ?? '',
          avatarPath: (user as { avatarPath?: string | null }).avatarPath ?? null,
        }
      : null);

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
        onCargada={() => setCargadaId(actual.historiaId)}
        pausado={enPausa}
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

      {autorActual ? (
        <Pressable
          style={[styles.autorFila, { top: insets.top + 16 }]}
          disabled={!autorActual.username}
          onPress={() => router.push(`/(app)/usuario/${autorActual.username}` as never)}
          accessibilityLabel={autorActual.nombreCompleto}
        >
          {autorActual.avatarPath ? (
            <Image
              source={{ uri: rhAvatarUrl(autorActual.avatarPath, (autorActual as { avatarBust?: number | null }).avatarBust ?? undefined) }}
              style={styles.autorAvatar}
              contentFit="cover"
            />
          ) : (
            <View style={[styles.autorAvatar, styles.autorAvatarVacio]}>
              <Ionicons name="person" size={16} color="#fff" />
            </View>
          )}
          <Text style={styles.autorNombre} numberOfLines={1}>
            {autorActual.username ?? autorActual.nombreCompleto}
          </Text>
        </Pressable>
      ) : null}

      <View style={[styles.topActions, { top: insets.top + 16 }]} pointerEvents="box-none">
        {actual.tipoMedia === 'video' || actual.tipoMedia === 'foto' ? (
          <Pressable
            style={[styles.iconBtn, contentFit === 'contain' && styles.iconBtnOn]}
            onPress={() => setFitManual(contentFit === 'cover' ? 'contain' : 'cover')}
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
        {!actual.esAutor ? (
          <DenunciaButtonStub
            userId={actual.userId}
            historiaId={actual.historiaId}
            compacto
          />
        ) : null}
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
        <View style={styles.reaccionesWrap}>
          <ReaccionesBarra
            miReaccion={reacciones[actual.historiaId]?.mia ?? null}
            conteo={reacciones[actual.historiaId]?.conteo ?? {}}
            onReaccionar={onReaccionar}
            // El autor ve los conteos pero no reacciona a lo suyo.
            soloLectura={actual.esAutor}
          />
        </View>
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
              onChangeText={(v) => {
                setRespuesta(v);
                setEscribiendo(true);
              }}
              placeholder={actual.pregunta ? 'Respondé la pregunta…' : 'Enviar mensaje…'}
              placeholderTextColor="rgba(255,255,255,0.6)"
              style={styles.responderInput}
              onFocus={() => setEscribiendo(true)}
              // Al salir del campo o cerrar el teclado, la historia sigue.
              onBlur={() => setEscribiendo(false)}
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
  panelVecino: { position: 'absolute', top: 0, bottom: 0, width: SCREEN_W, backgroundColor: '#000' },
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
  autorFila: {
    position: 'absolute',
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    maxWidth: '55%',
    zIndex: 7,
    paddingVertical: 4,
    paddingRight: 10,
    paddingLeft: 4,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  autorAvatar: { width: 32, height: 32, borderRadius: 16 },
  autorAvatarVacio: { alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.25)' },
  autorNombre: { color: '#fff', fontWeight: '700', fontSize: 14, flexShrink: 1 },
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
  reaccionesWrap: { marginBottom: 10 },
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
