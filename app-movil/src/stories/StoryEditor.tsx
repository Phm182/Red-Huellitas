import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Dimensions,
  Keyboard,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS, useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  esAssetVideo,
  normalizarDuracionSegundos,
  probeVideoDurationSeconds,
} from '../utils/mediaDuration';
import { CapturedStoryMedia } from './StoryCameraCapture';
import { StoryDraggableSticker } from './StoryDraggableSticker';
import { StoryDraggableText } from './StoryDraggableText';
import { StoryInteractivoCard } from './StoryInteractivoCard';
import { StoryContentFit, StoryMediaFill } from './StoryMediaFill';
import { StoryOverlayLayer, storyFilterCss } from './StoryOverlayLayer';
import { StoryStickerPanel } from './StoryStickerPanel';
import { StoryTrimBar } from './StoryTrimBar';
import { StoryVolumeSlider } from './StoryVolumeSlider';
import {
  emptyOverlay,
  fotoTransformDefault,
  fotoTransformEsDefault,
  PinchRotateTarget,
  STORY_DRAW_COLORS,
  STORY_FILTERS,
  STORY_FONTS,
  STORY_TEXT_COLORS,
  StoryFilterId,
  StoryFontId,
  StoryFotoTransform,
  StoryInteractivo,
  StoryOverlay,
  StoryPathItem,
  StoryRecorte,
  StoryStickerItem,
  StoryTextItem,
  storyFontFamily,
} from './storyEditorTypes';

type Tool = 'none' | 'text' | 'draw' | 'stickers';

/** Todo lo que el editor produce y hay que mandar al backend. */
export type StoryPublicacion = {
  overlay: StoryOverlay;
  recorte: StoryRecorte | null;
  sinAudio: boolean;
  /** 0.5 / 1 / 2 — no destructiva, la aplica el reproductor (ver sql/024). */
  velocidad: number;
  /** Zoom/paneo manual de la foto (null si quedó tal cual, sin tocar). */
  fotoTransform: StoryFotoTransform | null;
  /** Tamaño del canvas de edición en el momento de publicar — hace falta
   * para convertir `fotoTransform` (píxeles de pantalla) al recorte real de
   * la imagen fuente. */
  canvasSize: { w: number; h: number };
};

/** Las mismas que ofrece la cámara; el backend rechaza cualquier otra. */
const VELOCIDADES = [0.5, 1, 2] as const;

type Props = {
  media: CapturedStoryMedia;
  onBack: () => void;
  /** Reemplaza foto/video sin salir del flujo. */
  onMediaChange: (media: CapturedStoryMedia) => void;
  onPublish: (publicacion: StoryPublicacion) => void;
  publishing: boolean;
};

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

/** La foto puede achicarse hasta la mitad del tamaño original — mismo
 * rango que ya usan los botones de escala de texto/sticker — no sólo
 * agrandarse; por debajo de 1 el canvas se ve negro alrededor (mismo fondo
 * que ya tiene `StoryMediaFill`), es un efecto válido, no un glitch. */
const FOTO_ESCALA_MIN = 0.5;
const FOTO_ESCALA_MAX = 4;
/** Mismo rango que usa `StoryTransformable` para texto/sticker. */
const ITEM_ESCALA_MIN = 0.5;
const ITEM_ESCALA_MAX = 3;

/**
 * Cuánto se puede alejar la imagen del centro sin dejar bordes vacíos a la
 * vista. Aproximado (no conocemos acá el tamaño real de la foto fuente,
 * sólo el canvas): con "cover" la imagen siempre cubre el frame entero, así
 * que zoomear `scale` de más deja `(scale-1) * frame/2` de margen real para
 * arrastrar en cada eje antes de que se vea el borde. Con `Math.abs`: por
 * debajo de 1 esa resta da negativo y sin él invertía el orden de
 * min/max del clamp (el margen tiene que ser siempre >= 0, esté la foto
 * agrandada o achicada). Al nivel de módulo (no del cuerpo del componente)
 * y con `'worklet'` explícito porque se llama desde `.onUpdate` (hilo de
 * UI); `layout` llega ya leído del shared value en vez de cerrar sobre
 * `layout.w/h` del render.
 */
function clampFotoPan(x: number, y: number, scale: number, layout: { layoutW: number; layoutH: number }) {
  'worklet';
  const margenX = Math.abs((scale - 1) * layout.layoutW) / 2;
  const margenY = Math.abs((scale - 1) * layout.layoutH) / 2;
  return {
    x: Math.max(-margenX, Math.min(margenX, x)),
    y: Math.max(-margenY, Math.min(margenY, y)),
  };
}

export function StoryEditor({ media, onBack, onMediaChange, onPublish, publishing }: Props) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [overlay, setOverlay] = useState<StoryOverlay>(emptyOverlay());
  const [tool, setTool] = useState<Tool>('none');

  // Recorte no destructivo: arranca cubriendo el video entero, así publicar
  // sin tocar nada da exactamente el mismo resultado que antes.
  const duracion = media.duracionSegundos > 0 ? media.duracionSegundos : 0;
  const [recorteInicio, setRecorteInicio] = useState(0);
  const [recorteFin, setRecorteFin] = useState(duracion);
  const [sinAudio, setSinAudio] = useState(false);
  // La velocidad viene elegida desde la cámara, pero se puede cambiar acá: como
  // no se re-encodea nada, arrepentirse no cuesta volver a grabar.
  const [velocidad, setVelocidad] = useState(media.velocidad ?? 1);
  const [mutedPreview, setMutedPreview] = useState(false);
  const [volumen, setVolumen] = useState(0.85);
  const [mostrarVolumen, setMostrarVolumen] = useState(false);
  const [contentFit, setContentFit] = useState<StoryContentFit>('cover');
  const [mostrarTrim, setMostrarTrim] = useState(false);
  // Cabezal de reproducción: `scrub` es el segundo que se está tocando ahora
  // (null si nadie arrastra) y `posicionBuscada` el último salto pedido. Van
  // separados porque al soltar hay que despausar sin volver al principio.
  const [scrubSeg, setScrubSeg] = useState<number | null>(null);
  const [posicionBuscada, setPosicionBuscada] = useState<number | null>(null);
  const [posicionSeg, setPosicionSeg] = useState(0);
  const [drawColor, setDrawColor] = useState(STORY_DRAW_COLORS[0]);
  const [textColor, setTextColor] = useState(STORY_TEXT_COLORS[0]);
  const [fontId, setFontId] = useState<StoryFontId>('classic');
  const [draftText, setDraftText] = useState('');
  const [selectedTextId, setSelectedTextId] = useState<string | null>(null);
  const [selectedStickerId, setSelectedStickerId] = useState<string | null>(null);
  const [layout, setLayout] = useState({ w: SCREEN_W, h: SCREEN_H });
  // Alto del teclado en pantalla — el panel de "agregar texto" es
  // `position: absolute` con `bottom` fijo, así que un `KeyboardAvoidingView`
  // (que ajusta padding/alto del layout normal) no lo mueve: hace falta
  // sumarle este valor a mano para que quede arriba del teclado en vez de
  // tapado por él. `keyboardWillShow/Hide` en iOS (anima junto con el
  // teclado); `keyboardDidShow/Hide` en Android (no existe la versión
  // "will" ahí).
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const subShow = Keyboard.addListener(showEvt, (e) => setKeyboardHeight(e.endCoordinates?.height ?? 0));
    const subHide = Keyboard.addListener(hideEvt, () => setKeyboardHeight(0));
    return () => {
      subShow.remove();
      subHide.remove();
    };
  }, []);
  const [cambiandoMedia, setCambiandoMedia] = useState(false);
  const currentPath = useRef<StoryPathItem | null>(null);

  // Zoom/paneo manual de la foto (pellizcar con dos dedos, arrastrar con uno
  // ya zoomeado). Sólo aplica a foto — el video ya tiene su propio cover/
  // contain y recortar de verdad exige re-encodear, que acá no se hace.
  const [fotoTransform, setFotoTransform] = useState<StoryFotoTransform>(fotoTransformDefault());

  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => tool === 'draw',
        onMoveShouldSetPanResponder: () => tool === 'draw',
        onPanResponderGrant: (evt) => {
          if (tool !== 'draw' || layout.w <= 0) return;
          const { locationX, locationY } = evt.nativeEvent;
          const id = `p_${Date.now()}`;
          currentPath.current = {
            id,
            color: drawColor,
            width: 4,
            points: [{ x: locationX / layout.w, y: locationY / layout.h }],
          };
          setOverlay((prev) => ({ ...prev, paths: [...prev.paths, currentPath.current!] }));
        },
        onPanResponderMove: (evt) => {
          if (!currentPath.current || layout.w <= 0) return;
          const { locationX, locationY } = evt.nativeEvent;
          const pt = { x: locationX / layout.w, y: locationY / layout.h };
          currentPath.current.points.push(pt);
          const pathId = currentPath.current.id;
          const points = [...currentPath.current.points];
          setOverlay((prev) => ({
            ...prev,
            paths: prev.paths.map((p) => (p.id === pathId ? { ...p, points } : p)),
          }));
        },
        onPanResponderRelease: () => {
          currentPath.current = null;
        },
      }),
    [tool, drawColor, layout.w, layout.h]
  );

  // El gesto de pellizco/rotación/arrastre de foto y texto/sticker está más
  // abajo (después de `updateText`/`updateSticker`, que necesita) — buscar
  // `gestoFoto`.

  const setFilter = (id: StoryFilterId) => setOverlay((o) => ({ ...o, filter: id }));

  const addText = () => {
    const text = draftText.trim();
    if (!text) return;
    const id = `t_${Date.now()}`;
    setOverlay((o) => ({
      ...o,
      texts: [
        ...o.texts,
        {
          id,
          text,
          x: 0.5,
          y: 0.42,
          color: textColor,
          scale: 1,
          rotation: 0,
          fontId,
        },
      ],
    }));
    setDraftText('');
    setSelectedTextId(id);
    setTool('none');
  };

  // `useCallback` con deps vacías: referencia ESTABLE entre renders (sólo
  // cierra sobre `setOverlay`, que React ya garantiza estable). Hace falta
  // así de estable para poder pasarla directo a `runOnJS` desde un worklet
  // del gesto de pellizco/rotación de más abajo sin el indirection de
  // ref+trampolín que usa `StoryTransformable` (ahí `onChange` SÍ cambia
  // cada render porque lo arma el padre con un arrow function nuevo).
  const updateText = useCallback((id: string, patch: Partial<StoryTextItem>) => {
    setOverlay((o) => ({
      ...o,
      texts: o.texts.map((tx) => (tx.id === id ? { ...tx, ...patch } : tx)),
    }));
  }, []);

  const agregarSticker = (emoji: string) => {
    const id = `s_${Date.now()}`;
    setOverlay((o) => ({
      ...o,
      stickers: [...(o.stickers ?? []), { id, emoji, x: 0.5, y: 0.5, scale: 1, rotation: 0 }],
    }));
    setSelectedStickerId(id);
    setSelectedTextId(null);
    setTool('none');
  };

  const updateSticker = useCallback((id: string, patch: Partial<StoryStickerItem>) => {
    setOverlay((o) => ({
      ...o,
      stickers: (o.stickers ?? []).map((s) => (s.id === id ? { ...s, ...patch } : s)),
    }));
  }, []);

  // Zoom/paneo/rotación manual de la FOTO (pellizcar/girar con dos dedos,
  // arrastrar con uno ya zoomeada) Y de texto/sticker vía los MISMOS dos
  // dedos — ver por qué están acá y no en `StoryTransformable`.
  //
  // El pellizco/giro de un ítem chico (texto, emoji) tiene que poder
  // agarrarse con un dedo ARRIBA del ítem y el otro en CUALQUIER OTRA parte
  // de la pantalla — así funciona en Instagram, y es indispensable cuando
  // el ítem es más chico que la separación natural entre dos dedos. Pero
  // `react-native-gesture-handler` hace su propio hit-test por CADA dedo
  // nuevo que toca la pantalla contra la vista a la que está pegado cada
  // gesto — un `Gesture.Pinch()` colgado del `View` chiquito del texto NUNCA
  // ve el segundo dedo si cae afuera de ese recuadro (ni con `hitSlop`,
  // que sigue siendo un rectángulo acotado). La única forma de lograr "el
  // segundo dedo en cualquier lado" es reconocer el pellizco/giro en un
  // `GestureDetector` que cubra TODA la pantalla — acá, el mismo que ya
  // envuelve el canvas entero — y in decidir DESPUÉS a qué le pega: si hay
  // un texto/sticker seleccionado, a ese; si no y es una foto, a la foto.
  // El arrastre de UN dedo (`pan`) sigue viviendo en cada ítem por su
  // cuenta (`StoryTransformable`) porque ESE sí depende de dónde arranca el
  // primer toque, que si hace bien el hit-test de por sí.
  //
  // "Base" congelada al arrancar cada gesto + delta contra eso — con
  // `useSharedValue`, no `useRef`: la escribe un worklet (`.onStart`) y la
  // lee otro (`.onUpdate`), y con un `useRef` común esos dos gestos dejan
  // de estar sincronizados apenas se recrea el `Gesture...` en el medio del
  // propio gesto. Y CRÍTICO — el motivo del "cambia constantemente, resetea
  // tamaño": pellizco y rotación pueden pasar A LA VEZ (un pellizco real
  // casi siempre trae algo de giro de los 2 dedos juntos), así que cada uno
  // manda sólo el PARCHE que le toca (`{scale}` o `{rotation}`, nunca los
  // dos juntos) a `updateText`/`updateSticker`/`patchFotoTransform` — las
  // tres hacen un merge funcional (`setX((prev) => ({...prev, ...patch}))`)
  // contra lo último confirmado, así ninguno pisa lo que el otro acaba de
  // cambiar con un valor viejo (que es justo lo que pasaba antes, mandando
  // el objeto COMPLETO leyendo el campo ajeno de un shared value que podía
  // estar un cuadro atrasado).
  const fotoBase = useSharedValue({ scale: 1, x: 0, y: 0, rotation: 0 });
  const fotoActual = useSharedValue({
    scale: fotoTransform.scale,
    x: fotoTransform.x,
    y: fotoTransform.y,
    rotation: fotoTransform.rotation,
    layoutW: layout.w,
    layoutH: layout.h,
  });
  useEffect(() => {
    fotoActual.value = {
      scale: fotoTransform.scale,
      x: fotoTransform.x,
      y: fotoTransform.y,
      rotation: fotoTransform.rotation,
      layoutW: layout.w,
      layoutH: layout.h,
    };
  }, [
    fotoActual,
    fotoTransform.scale,
    fotoTransform.x,
    fotoTransform.y,
    fotoTransform.rotation,
    layout.w,
    layout.h,
  ]);
  const contentFitRef = useSharedValue(contentFit);
  useEffect(() => {
    contentFitRef.value = contentFit;
  }, [contentFitRef, contentFit]);

  const patchFotoTransform = useCallback((patch: Partial<StoryFotoTransform>) => {
    setFotoTransform((prev) => ({ ...prev, ...patch }));
  }, []);

  // A qué le pega el pellizco/giro de dos dedos en este momento: al texto o
  // sticker seleccionado (si hay uno) o, si no, a la foto (si el medio es
  // foto). `base`/`rotation` acá son el valor YA confirmado del ítem
  // apuntado, para que cada gesto pueda congelarlo en su propio `onStart`.
  const targetInfo = useSharedValue<PinchRotateTarget>({ kind: 'none', id: null, scale: 1, rotation: 0, x: 0.5, y: 0.5 });
  useEffect(() => {
    if (selectedTextId) {
      const item = overlay.texts.find((tx) => tx.id === selectedTextId);
      targetInfo.value = {
        kind: 'text',
        id: selectedTextId,
        scale: item?.scale ?? 1,
        rotation: item?.rotation ?? 0,
        x: item?.x ?? 0.5,
        y: item?.y ?? 0.5,
      };
    } else if (selectedStickerId) {
      const item = (overlay.stickers ?? []).find((s) => s.id === selectedStickerId);
      targetInfo.value = {
        kind: 'sticker',
        id: selectedStickerId,
        scale: item?.scale ?? 1,
        rotation: item?.rotation ?? 0,
        x: item?.x ?? 0.5,
        y: item?.y ?? 0.5,
      };
    } else if (media.tipo === 'foto') {
      targetInfo.value = {
        kind: 'foto',
        id: null,
        scale: fotoTransform.scale,
        rotation: fotoTransform.rotation,
        x: fotoTransform.x,
        y: fotoTransform.y,
      };
    } else {
      targetInfo.value = { kind: 'none', id: null, scale: 1, rotation: 0, x: 0.5, y: 0.5 };
    }
  }, [
    targetInfo,
    selectedTextId,
    selectedStickerId,
    overlay.texts,
    overlay.stickers,
    fotoTransform.scale,
    fotoTransform.rotation,
    fotoTransform.x,
    fotoTransform.y,
    media.tipo,
  ]);
  // Base del ítem (texto/sticker) apuntado — separada de `fotoBase` porque
  // usa fracciones (0.05–0.95) de canvas, no píxeles.
  const itemBase = useSharedValue({ scale: 1, rotation: 0, x: 0.5, y: 0.5 });
  // Punto focal (centro entre los 2 dedos) al arrancar el pellizco — para
  // que MOVER, GIRAR y ESCALAR anden A LA VEZ: `Pinch` ya trae `focalX`/
  // `focalY` (el punto medio entre los dos dedos, en píxeles del canvas)
  // así que el DESPLAZAMIENTO de ese punto desde que arrancó el gesto es
  // exactamente cuánto se movieron los dos dedos juntos — sin esto sólo se
  // pellizcaba/giraba en el lugar, sin poder reubicar a la vez (el `pan` de
  // 1 dedo de cada ítem no alcanza a cubrir esto: sólo ve el dedo que
  // arrancó SOBRE el ítem, y con 2 dedos abajo `Pinch`/`Rotation` ya están
  // activos a la vez que ese `pan`, pero cada uno resuelve un eje distinto
  // del gesto — mover con el CENTRO de los dos dedos es lo que realmente
  // se siente "real"). Sólo en `canvasPinch` (no en `canvasRotate`
  // también): los dos comparten prácticamente el mismo punto focal, y
  // aplicarlo dos veces sumaría el desplazamiento doble.
  const focalBase = useSharedValue({ x: 0, y: 0 });

  const fotoHabilitada = media.tipo === 'foto' && tool === 'none';
  // El pellizco/arrastre de UN dedo de la foto SÍ se apaga con algo
  // seleccionado (a diferencia del pellizco/giro de dos dedos, que ahora
  // decide su propio destino vía `targetInfo` — ver arriba): con un dedo,
  // arrastrar la foto o arrastrar el texto seleccionado son gestos
  // DISTINTOS que competirían por el mismo toque si los dos quedan
  // habilitados a la vez.
  const fotoZoomHabilitada = fotoHabilitada && !selectedTextId && !selectedStickerId;

  const gestoFoto = useMemo(() => {
    const canvasPinch = Gesture.Pinch()
      .enabled(tool === 'none')
      .onStart((e) => {
        const t = targetInfo.value;
        focalBase.value = { x: e.focalX, y: e.focalY };
        if (t.kind === 'foto') {
          fotoBase.value = { ...fotoBase.value, scale: fotoActual.value.scale, x: fotoActual.value.x, y: fotoActual.value.y };
        } else {
          itemBase.value = { ...itemBase.value, scale: t.scale, x: t.x, y: t.y };
        }
      })
      .onUpdate((e) => {
        const t = targetInfo.value;
        if (t.kind === 'foto') {
          const nuevaEscala = Math.max(FOTO_ESCALA_MIN, Math.min(FOTO_ESCALA_MAX, fotoBase.value.scale * e.scale));
          // Base + lo que se movió el pellizco entero (los 2 dedos juntos,
          // no cada uno por su cuenta) desde que arrancó — así se puede
          // agrandar/achicar Y reubicar en el mismo gesto.
          const { x, y } = clampFotoPan(
            fotoBase.value.x + (e.focalX - focalBase.value.x),
            fotoBase.value.y + (e.focalY - focalBase.value.y),
            nuevaEscala,
            fotoActual.value
          );
          runOnJS(patchFotoTransform)({ scale: nuevaEscala, x, y });
        } else if (t.kind !== 'none' && t.id) {
          const { layoutW: w, layoutH: h } = fotoActual.value;
          const nuevaEscala = Math.max(ITEM_ESCALA_MIN, Math.min(ITEM_ESCALA_MAX, itemBase.value.scale * e.scale));
          const patch: Partial<StoryTextItem> = { scale: nuevaEscala };
          if (w > 0 && h > 0) {
            patch.x = Math.min(0.95, Math.max(0.05, itemBase.value.x + (e.focalX - focalBase.value.x) / w));
            patch.y = Math.min(0.95, Math.max(0.05, itemBase.value.y + (e.focalY - focalBase.value.y) / h));
          }
          runOnJS(t.kind === 'text' ? updateText : updateSticker)(t.id, patch);
        }
      });

    const canvasRotate = Gesture.Rotation()
      .enabled(tool === 'none')
      .onStart(() => {
        const t = targetInfo.value;
        if (t.kind === 'foto') {
          fotoBase.value = { ...fotoBase.value, rotation: fotoActual.value.rotation };
        } else {
          itemBase.value = { ...itemBase.value, rotation: t.rotation };
        }
      })
      .onUpdate((e) => {
        const t = targetInfo.value;
        const gradosDelta = (e.rotation * 180) / Math.PI;
        if (t.kind === 'foto') {
          runOnJS(patchFotoTransform)({ rotation: fotoBase.value.rotation + gradosDelta });
        } else if (t.kind !== 'none' && t.id) {
          runOnJS(t.kind === 'text' ? updateText : updateSticker)(t.id, { rotation: itemBase.value.rotation + gradosDelta });
        }
      });

    const fotoPan = Gesture.Pan()
      .enabled(fotoZoomHabilitada)
      // Un solo dedo, siempre: sin este límite, `Pan` TAMBIÉN reconoce el
      // toque de 2 dedos de un pellizco/giro y su `onUpdate` dispara a la
      // vez con la escala vieja congelada al arrancar — pisando lo que
      // `canvasPinch`/`canvasRotate` acababan de actualizar.
      .minPointers(1)
      .maxPointers(1)
      .onStart(() => {
        fotoBase.value = { ...fotoBase.value, scale: fotoActual.value.scale, x: fotoActual.value.x, y: fotoActual.value.y };
      })
      .onUpdate((e) => {
        // Arrastrar con un solo dedo sólo tiene sentido si ya hay zoom
        // aplicado (de cualquier signo: agrandada O achicada); si no, el
        // toque es para tocar-para-cambiar-ajuste.
        if (Math.abs(fotoBase.value.scale - 1) <= 0.01) return;
        const { x, y } = clampFotoPan(
          fotoBase.value.x + e.translationX,
          fotoBase.value.y + e.translationY,
          fotoBase.value.scale,
          fotoActual.value
        );
        runOnJS(patchFotoTransform)({ x, y });
      });

    const fotoTap = Gesture.Tap()
      .enabled(fotoHabilitada)
      .onEnd(() => {
        // Toque simple sin zoom activo: el gesto de siempre de "tocá de nuevo
        // para llenar".
        if (Math.abs(fotoActual.value.scale - 1) <= 0.01) {
          const next = contentFitRef.value === 'cover' ? 'contain' : 'cover';
          runOnJS(setContentFit)(next);
        }
      });

    return Gesture.Simultaneous(fotoPan, canvasPinch, canvasRotate, fotoTap);
  }, [
    tool,
    fotoHabilitada,
    fotoZoomHabilitada,
    fotoBase,
    fotoActual,
    itemBase,
    focalBase,
    targetInfo,
    contentFitRef,
    patchFotoTransform,
    updateText,
    updateSticker,
    setContentFit,
  ]);

  const agregarInteractivo = (interactivo: StoryInteractivo) => {
    setOverlay((o) => ({ ...o, interactivo }));
    setTool('none');
  };

  const quitarInteractivo = () => setOverlay((o) => ({ ...o, interactivo: null }));

  const publicar = () => {
    // Sólo se manda el recorte si el usuario efectivamente movió algo: así una
    // historia común no arrastra campos que no le corresponden.
    const recorteTocado = duracion > 0 && (recorteInicio > 0 || recorteFin < duracion);
    onPublish({
      overlay,
      recorte: recorteTocado ? { inicioSeg: recorteInicio, finSeg: recorteFin } : null,
      sinAudio,
      velocidad: media.tipo === 'video' ? velocidad : 1,
      fotoTransform:
        media.tipo === 'foto' && !fotoTransformEsDefault(fotoTransform) ? fotoTransform : null,
      canvasSize: layout,
    });
  };

  const undo = () => {
    setOverlay((o) => {
      if (o.paths.length) return { ...o, paths: o.paths.slice(0, -1) };
      if (o.texts.length) {
        const next = o.texts.slice(0, -1);
        setSelectedTextId(next[next.length - 1]?.id ?? null);
        return { ...o, texts: next };
      }
      return o;
    });
  };

  const pickFromGallery = async () => {
    if (cambiandoMedia) return;
    if (Platform.OS !== 'web') {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) return;
    }
    setCambiandoMedia(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images', 'videos'],
        videoMaxDuration: 60,
        quality: 0.9,
        allowsEditing: false,
      });
      if (result.canceled || !result.assets[0]) return;
      const asset = result.assets[0];
      const esVideo = esAssetVideo(asset);
      let dur = normalizarDuracionSegundos(asset.duration);
      if (esVideo && dur <= 0) dur = await probeVideoDurationSeconds(asset.uri);
      if (esVideo && dur <= 0) dur = 15;
      const capped = esVideo ? Math.min(dur, 60) : 0;
      onMediaChange({
        uri: asset.uri,
        tipo: esVideo ? 'video' : 'foto',
        mimeType: asset.mimeType || (esVideo ? 'video/mp4' : 'image/jpeg'),
        duracionSegundos: capped,
      });
      setRecorteInicio(0);
      setRecorteFin(capped);
      setMostrarTrim(false);
      setScrubSeg(null);
      setPosicionBuscada(null);
      setPosicionSeg(0);
      setVelocidad(1);
      setFotoTransform(fotoTransformDefault());
    } finally {
      setCambiandoMedia(false);
    }
  };

  const cssFilter = storyFilterCss(overlay.filter);
  const previewMuted = media.tipo !== 'video' || sinAudio || mutedPreview;

  const overlayForDraw: StoryOverlay = {
    ...overlay,
    texts: [], // textos interactivos aparte
    stickers: [], // stickers interactivos aparte (mismo motivo que texts)
  };

  return (
    <View style={styles.root}>
      <GestureDetector gesture={gestoFoto}>
        <View
          style={styles.canvas}
          onLayout={(e) => {
            const { width, height } = e.nativeEvent.layout;
            setLayout({ w: width, h: height });
          }}
          {...(tool === 'draw' ? pan.panHandlers : {})}
        >
        <StoryMediaFill
          uri={media.uri}
          tipo={media.tipo}
          cssFilter={cssFilter}
          loop
          muted={previewMuted}
          volume={volumen}
          contentFit={contentFit}
          inicioSeg={media.tipo === 'video' && duracion > 0 ? recorteInicio : null}
          finSeg={media.tipo === 'video' && duracion > 0 ? recorteFin : null}
          posicionBuscada={posicionBuscada}
          onPosicion={setPosicionSeg}
          pausado={scrubSeg !== null}
          velocidad={velocidad}
          fotoTransform={media.tipo === 'foto' ? fotoTransform : undefined}
        />

        {/* El video no tiene pellizco (sólo cover/contain de toda la vida):
            un solo toque alcanza. La foto ya resuelve el toque simple con el
            gesto compuesto de arriba (`gestoFoto`), junto con pellizco y
            arrastre. */}
        {tool === 'none' && media.tipo === 'video' ? (
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setContentFit((f) => (f === 'cover' ? 'contain' : 'cover'))}
          />
        ) : null}

        <StoryOverlayLayer overlay={overlayForDraw} width={layout.w} height={layout.h} />

        {(overlay.stickers ?? []).map((item) => (
          <StoryDraggableSticker
            key={item.id}
            item={item}
            canvasW={layout.w}
            canvasH={layout.h}
            selected={selectedStickerId === item.id}
            editable={tool !== 'draw'}
            targetInfo={targetInfo}
            onSelect={(id) => {
              setSelectedStickerId(id);
              setSelectedTextId(null);
            }}
            onDeselect={() => setSelectedStickerId(null)}
            onChange={updateSticker}
          />
        ))}

        {overlay.texts.map((item) => (
          <StoryDraggableText
            key={item.id}
            item={item}
            canvasW={layout.w}
            canvasH={layout.h}
            selected={selectedTextId === item.id}
            editable={tool !== 'draw'}
            targetInfo={targetInfo}
            onSelect={(id) => {
              setSelectedTextId(id);
              setSelectedStickerId(null);
            }}
            onDeselect={() => setSelectedTextId(null)}
            onChange={updateText}
          />
        ))}

        {tool === 'text' && draftText.trim().length > 0 ? (
          // Mientras se escribe, el preview va ARRIBA (no centrado): el
          // panel de fuente/color/input le ocupa toda la mitad de abajo
          // (y encima el teclado), así que centrado en el canvas queda
          // tapado por eso. Una vez que se toca "Add" pasa a ser un
          // `StoryDraggableText` normal con su posición guardada (0.42),
          // que el usuario puede arrastrar a donde quiera.
          <View pointerEvents="none" style={[styles.liveTextWrap, { paddingTop: insets.top + 90 }]}>
            <Text
              style={[
                styles.liveText,
                { color: textColor, fontFamily: storyFontFamily(fontId) },
              ]}
            >
              {draftText}
            </Text>
          </View>
        ) : null}

        {/* Preview del sticker interactivo tal cual lo va a ver el otro. Sin
            handlers: acá no se vota, sólo se ubica. */}
        {overlay.interactivo ? (
          <StoryInteractivoCard
            interactivo={overlay.interactivo}
            width={layout.w}
            height={layout.h}
          />
        ) : null}
        </View>
      </GestureDetector>

      {overlay.interactivo ? (
        <Pressable onPress={quitarInteractivo} style={[styles.quitarInteractivo, { top: insets.top + 56 }]}>
          <Ionicons name="close-circle" size={16} color="#fff" />
          <Text style={styles.quitarInteractivoLabel}>
            {overlay.interactivo.kind === 'encuesta' ? 'Quitar encuesta' : 'Quitar preguntas'}
          </Text>
        </Pressable>
      ) : null}

      <View style={[styles.topBar, { paddingTop: insets.top + 6 }]} pointerEvents="box-none">
        <Pressable onPress={onBack} style={styles.iconBtn}>
          <Ionicons name="chevron-back" size={28} color="#fff" />
        </Pressable>
        <View style={styles.topActions}>
          <Pressable onPress={pickFromGallery} disabled={cambiandoMedia} style={styles.iconBtn}>
            {cambiandoMedia ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Ionicons name="images-outline" size={22} color="#fff" />
            )}
          </Pressable>
          <Pressable
            onPress={() => setContentFit((f) => (f === 'cover' ? 'contain' : 'cover'))}
            style={[styles.iconBtn, contentFit === 'contain' && styles.toolOn]}
          >
            <Ionicons name={contentFit === 'contain' ? 'expand' : 'scan'} size={20} color="#fff" />
          </Pressable>
          {media.tipo === 'video' ? (
            <>
              <Pressable
                onPress={() => {
                  if (sinAudio) return;
                  setMutedPreview((v) => {
                    const next = !v;
                    if (!next) setMostrarVolumen(true);
                    return next;
                  });
                }}
                style={[styles.iconBtn, (sinAudio || mutedPreview) && styles.toolOn]}
              >
                <Ionicons
                  name={sinAudio || mutedPreview ? 'volume-mute' : 'volume-high'}
                  size={22}
                  color="#fff"
                />
              </Pressable>
              <Pressable
                onPress={() => setMostrarVolumen((v) => !v)}
                style={[styles.iconBtn, mostrarVolumen && styles.toolOn]}
              >
                <Ionicons name="options-outline" size={20} color="#fff" />
              </Pressable>
            </>
          ) : null}
          <Pressable onPress={undo} style={styles.iconBtn}>
            <Ionicons name="arrow-undo" size={22} color="#fff" />
          </Pressable>
          <Pressable
            onPress={() => setTool((t0) => (t0 === 'text' ? 'none' : 'text'))}
            style={[styles.iconBtn, tool === 'text' && styles.toolOn]}
          >
            <Ionicons name="text" size={22} color="#fff" />
          </Pressable>
          <Pressable
            onPress={() => setTool((t0) => (t0 === 'draw' ? 'none' : 'draw'))}
            style={[styles.iconBtn, tool === 'draw' && styles.toolOn]}
          >
            <Ionicons name="brush" size={22} color="#fff" />
          </Pressable>
          <Pressable
            onPress={() => setTool((t0) => (t0 === 'stickers' ? 'none' : 'stickers'))}
            style={[styles.iconBtn, tool === 'stickers' && styles.toolOn]}
          >
            <Ionicons name="happy" size={22} color="#fff" />
          </Pressable>
          {/* El recorte sólo tiene sentido en video, y sólo si sabemos cuánto
              dura: sin duración no hay dónde poner las manijas. */}
          {media.tipo === 'video' && duracion > 0 ? (
            <Pressable
              onPress={() => setMostrarTrim((v) => !v)}
              style={[styles.iconBtn, mostrarTrim && styles.toolOn]}
            >
              <Ionicons name="cut" size={22} color="#fff" />
            </Pressable>
          ) : null}
        </View>
      </View>

      {mostrarVolumen && media.tipo === 'video' && !sinAudio ? (
        <View style={[styles.volumePanel, { top: insets.top + 56 }]}>
          <Ionicons name="volume-low" size={16} color="#fff" />
          <StoryVolumeSlider
            value={volumen}
            onChange={(v) => {
              setVolumen(v);
              if (v > 0) setMutedPreview(false);
            }}
          />
          <Ionicons name="volume-high" size={16} color="#fff" />
        </View>
      ) : null}

      {contentFit === 'contain' && !mostrarVolumen ? (
        <View style={[styles.fitBanner, { top: insets.top + 56 }]} pointerEvents="none">
          <Text style={styles.fitHint}>{t('historias.fitContainHint')}</Text>
        </View>
      ) : null}

      {mostrarTrim && media.tipo === 'video' && duracion > 0 ? (
        <View style={[styles.trimPanel, { bottom: insets.bottom + 120 }]}>
          <StoryTrimBar
            uri={media.uri}
            duracionSegundos={duracion}
            inicioSeg={recorteInicio}
            finSeg={recorteFin}
            sinAudio={sinAudio}
            velocidad={velocidad}
            posicionSeg={posicionSeg}
            onChange={(ini, fin) => {
              setRecorteInicio(ini);
              setRecorteFin(fin);
            }}
            onScrub={(seg) => {
              setScrubSeg(seg);
              // El salto se mantiene al soltar: la idea es poder revisar un
              // momento puntual sin volver a mirar el video desde el principio.
              if (seg !== null) setPosicionBuscada(seg);
            }}
            onToggleAudio={() => setSinAudio((v) => !v)}
            onToggleVelocidad={() =>
              setVelocidad((v) => {
                const i = VELOCIDADES.indexOf(v as (typeof VELOCIDADES)[number]);
                return VELOCIDADES[(i + 1) % VELOCIDADES.length];
              })
            }
          />
        </View>
      ) : null}

      {tool === 'stickers' ? (
        <StoryStickerPanel
          onAgregarSticker={agregarSticker}
          onAgregarInteractivo={agregarInteractivo}
          yaHayInteractivo={!!overlay.interactivo}
          onCerrar={() => setTool('none')}
        />
      ) : null}

      {tool === 'text' ? (
        <View
          style={[
            styles.textPanel,
            // + `insets.bottom` incluso con teclado abierto: en algunos
            // Android (visto en MIUI) `Keyboard`'s `endCoordinates.height`
            // no incluye la barra de navegación por gestos, así que sin
            // esto el panel queda esa franja tapado por el teclado.
            { bottom: keyboardHeight > 0 ? keyboardHeight + insets.bottom + 12 : insets.bottom + 120 },
          ]}
        >
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.colorRow}>
            {STORY_FONTS.map((f) => (
              <Pressable
                key={f.id}
                onPress={() => {
                  setFontId(f.id);
                  if (selectedTextId) updateText(selectedTextId, { fontId: f.id });
                }}
                style={[styles.fontChip, fontId === f.id && styles.fontChipOn]}
              >
                <Text style={[styles.fontChipText, { fontFamily: f.fontFamily }]}>{f.label}</Text>
              </Pressable>
            ))}
          </ScrollView>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.colorRow}>
            {STORY_TEXT_COLORS.map((c) => (
              <Pressable
                key={c}
                onPress={() => {
                  setTextColor(c);
                  if (selectedTextId) updateText(selectedTextId, { color: c });
                }}
                style={[styles.swatch, { backgroundColor: c }, textColor === c && styles.swatchOn]}
              />
            ))}
          </ScrollView>
          <TextInput
            value={draftText}
            onChangeText={setDraftText}
            placeholder={t('historias.textPlaceholder')}
            placeholderTextColor="rgba(255,255,255,0.5)"
            style={[styles.textInput, { fontFamily: storyFontFamily(fontId), color: textColor }]}
            autoFocus
            onSubmitEditing={addText}
          />
          <View style={styles.textActions}>
            <Text style={styles.dragHint}>{t('historias.textLiveHint')}</Text>
            <Pressable onPress={addText} style={styles.addTextBtn}>
              <Text style={styles.addTextLabel}>{t('historias.addText')}</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      {selectedTextId && tool === 'none' ? (
        <View style={[styles.textToolbar, { top: insets.top + 56 }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.colorRow}>
            {STORY_FONTS.map((f) => (
              <Pressable
                key={f.id}
                onPress={() => updateText(selectedTextId, { fontId: f.id })}
                style={styles.fontChip}
              >
                <Text style={[styles.fontChipText, { fontFamily: f.fontFamily }]}>{f.label}</Text>
              </Pressable>
            ))}
          </ScrollView>
          <View style={styles.rotateRow}>
            <Pressable
              onPress={() => {
                const cur = overlay.texts.find((tx) => tx.id === selectedTextId);
                if (cur) updateText(selectedTextId, { rotation: (cur.rotation || 0) - 15 });
              }}
              style={styles.iconBtn}
            >
              <Ionicons name="reload-outline" size={20} color="#fff" style={{ transform: [{ scaleX: -1 }] }} />
            </Pressable>
            <Pressable
              onPress={() => {
                const cur = overlay.texts.find((tx) => tx.id === selectedTextId);
                if (cur) updateText(selectedTextId, { rotation: (cur.rotation || 0) + 15 });
              }}
              style={styles.iconBtn}
            >
              <Ionicons name="reload-outline" size={20} color="#fff" />
            </Pressable>
            <Pressable
              onPress={() => {
                const cur = overlay.texts.find((tx) => tx.id === selectedTextId);
                if (cur) updateText(selectedTextId, { scale: Math.min(3, (cur.scale || 1) + 0.15) });
              }}
              style={styles.iconBtn}
            >
              <Ionicons name="add" size={22} color="#fff" />
            </Pressable>
            <Pressable
              onPress={() => {
                const cur = overlay.texts.find((tx) => tx.id === selectedTextId);
                if (cur) updateText(selectedTextId, { scale: Math.max(0.5, (cur.scale || 1) - 0.15) });
              }}
              style={styles.iconBtn}
            >
              <Ionicons name="remove" size={22} color="#fff" />
            </Pressable>
          </View>
        </View>
      ) : null}

      {selectedStickerId && tool === 'none' ? (
        <View style={[styles.textToolbar, { top: insets.top + 56 }]}>
          <View style={styles.rotateRow}>
            <Pressable
              onPress={() => {
                const cur = (overlay.stickers ?? []).find((s) => s.id === selectedStickerId);
                if (cur) updateSticker(selectedStickerId, { rotation: (cur.rotation || 0) - 15 });
              }}
              style={styles.iconBtn}
            >
              <Ionicons name="reload-outline" size={20} color="#fff" style={{ transform: [{ scaleX: -1 }] }} />
            </Pressable>
            <Pressable
              onPress={() => {
                const cur = (overlay.stickers ?? []).find((s) => s.id === selectedStickerId);
                if (cur) updateSticker(selectedStickerId, { rotation: (cur.rotation || 0) + 15 });
              }}
              style={styles.iconBtn}
            >
              <Ionicons name="reload-outline" size={20} color="#fff" />
            </Pressable>
            <Pressable
              onPress={() => {
                const cur = (overlay.stickers ?? []).find((s) => s.id === selectedStickerId);
                if (cur) updateSticker(selectedStickerId, { scale: Math.min(3, (cur.scale || 1) + 0.15) });
              }}
              style={styles.iconBtn}
            >
              <Ionicons name="add" size={22} color="#fff" />
            </Pressable>
            <Pressable
              onPress={() => {
                const cur = (overlay.stickers ?? []).find((s) => s.id === selectedStickerId);
                if (cur) updateSticker(selectedStickerId, { scale: Math.max(0.5, (cur.scale || 1) - 0.15) });
              }}
              style={styles.iconBtn}
            >
              <Ionicons name="remove" size={22} color="#fff" />
            </Pressable>
          </View>
        </View>
      ) : null}

      {tool === 'draw' ? (
        <View style={[styles.drawPanel, { bottom: insets.bottom + 120 }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.colorRow}>
            {STORY_DRAW_COLORS.map((c) => (
              <Pressable
                key={c}
                onPress={() => setDrawColor(c)}
                style={[styles.swatch, { backgroundColor: c }, drawColor === c && styles.swatchOn]}
              />
            ))}
          </ScrollView>
          <Text style={styles.drawHint}>{t('historias.drawHint')}</Text>
        </View>
      ) : null}

      <View style={[styles.bottom, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
          {STORY_FILTERS.map((f) => (
            <Pressable key={f.id} onPress={() => setFilter(f.id)} style={styles.filterChip}>
              <View
                style={[
                  styles.filterPreview,
                  {
                    backgroundColor: f.id === 'none' ? '#333' : f.layers[0]?.color ?? '#555',
                  },
                  overlay.filter === f.id && styles.filterOn,
                ]}
              />
              <Text style={styles.filterLabel} numberOfLines={1}>
                {f.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        <View style={styles.bottomActions}>
          <Pressable style={styles.changeMediaBtn} onPress={onBack}>
            <Ionicons name="camera-outline" size={18} color="#fff" />
            <Text style={styles.changeMediaLabel}>{t('historias.retake')}</Text>
          </Pressable>
          <Pressable
            style={[styles.publish, publishing && { opacity: 0.6 }, { flex: 1 }]}
            disabled={publishing}
            onPress={publicar}
          >
            {publishing ? (
              <ActivityIndicator color="#111" />
            ) : (
              <>
                <Text style={styles.publishText}>{t('historias.publish')}</Text>
                <Ionicons name="arrow-forward" size={18} color="#111" />
              </>
            )}
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000',
    overflow: 'hidden',
    ...(Platform.OS === 'web' ? ({ height: '100%', maxHeight: '100vh' } as object) : null),
  },
  canvas: {
    flex: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  liveTextWrap: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingHorizontal: 24,
    zIndex: 3,
  },
  liveText: {
    fontSize: 34,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.65)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
    maxWidth: '90%',
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    zIndex: 20,
  },
  topActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, maxWidth: '78%', justifyContent: 'flex-end' },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  toolOn: { backgroundColor: 'rgba(226,59,74,0.85)' },
  volumePanel: {
    position: 'absolute',
    left: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(0,0,0,0.65)',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    zIndex: 22,
  },
  fitBanner: {
    position: 'absolute',
    alignSelf: 'center',
    left: 24,
    right: 24,
    alignItems: 'center',
    zIndex: 18,
  },
  fitHint: { color: 'rgba(255,255,255,0.85)', fontSize: 11, textAlign: 'center' },
  trimPanel: {
    position: 'absolute',
    left: 0,
    right: 0,
    backgroundColor: 'rgba(15,18,17,0.92)',
    paddingVertical: 4,
  },
  quitarInteractivo: {
    position: 'absolute',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  quitarInteractivoLabel: { color: '#fff', fontSize: 12, fontWeight: '600' },
  textPanel: {
    position: 'absolute',
    left: 16,
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.72)',
    borderRadius: 14,
    padding: 12,
    gap: 8,
    zIndex: 25,
  },
  textToolbar: {
    position: 'absolute',
    left: 12,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 14,
    padding: 8,
    gap: 6,
    zIndex: 22,
  },
  drawPanel: {
    position: 'absolute',
    left: 16,
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 14,
    padding: 12,
    gap: 8,
    zIndex: 25,
  },
  colorRow: { gap: 10, paddingVertical: 4, alignItems: 'center' },
  swatch: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: 'transparent' },
  swatchOn: { borderColor: '#fff' },
  fontChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  fontChipOn: { backgroundColor: 'rgba(255,229,102,0.35)' },
  fontChipText: { color: '#fff', fontSize: 13 },
  textInput: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    paddingVertical: 10,
    textAlign: 'center',
  },
  textActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dragHint: { color: 'rgba(255,255,255,0.65)', fontSize: 11, flex: 1, marginRight: 8 },
  addTextBtn: {
    backgroundColor: '#fff',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  addTextLabel: { color: '#111', fontWeight: '700' },
  rotateRow: { flexDirection: 'row', gap: 4, justifyContent: 'flex-end' },
  drawHint: { color: 'rgba(255,255,255,0.75)', fontSize: 12 },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, gap: 10, paddingTop: 8, zIndex: 20 },
  filters: { paddingHorizontal: 14, gap: 10 },
  filterChip: { alignItems: 'center', width: 62, gap: 4 },
  filterPreview: { width: 48, height: 48, borderRadius: 24, borderWidth: 2, borderColor: 'transparent' },
  filterOn: { borderColor: '#FFE566' },
  filterLabel: { color: '#fff', fontSize: 10, fontWeight: '600', maxWidth: 62, textAlign: 'center' },
  bottomActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
  },
  changeMediaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 24,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  changeMediaLabel: { color: '#fff', fontWeight: '700', fontSize: 13 },
  publish: {
    backgroundColor: '#fff',
    borderRadius: 24,
    paddingVertical: 14,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  publishText: { color: '#111', fontWeight: '800', fontSize: 16 },
});
