import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Dimensions,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CapturedStoryMedia } from './StoryCameraCapture';
import { StoryDraggableText } from './StoryDraggableText';
import { StoryInteractivoCard } from './StoryInteractivoCard';
import { StoryMediaFill } from './StoryMediaFill';
import { StoryOverlayLayer, storyFilterCss } from './StoryOverlayLayer';
import { StoryStickerPanel } from './StoryStickerPanel';
import { StoryTrimBar } from './StoryTrimBar';
import {
  emptyOverlay,
  STORY_DRAW_COLORS,
  STORY_FILTERS,
  STORY_FONTS,
  STORY_TEXT_COLORS,
  StoryFilterId,
  StoryFontId,
  StoryInteractivo,
  StoryOverlay,
  StoryPathItem,
  StoryRecorte,
  StoryTextItem,
} from './storyEditorTypes';

type Tool = 'none' | 'text' | 'draw' | 'stickers';

/** Todo lo que el editor produce y hay que mandar al backend. */
export type StoryPublicacion = {
  overlay: StoryOverlay;
  recorte: StoryRecorte | null;
  sinAudio: boolean;
};

type Props = {
  media: CapturedStoryMedia;
  onBack: () => void;
  onPublish: (publicacion: StoryPublicacion) => void;
  publishing: boolean;
};

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

export function StoryEditor({ media, onBack, onPublish, publishing }: Props) {
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
  const [mostrarTrim, setMostrarTrim] = useState(false);
  const [drawColor, setDrawColor] = useState(STORY_DRAW_COLORS[0]);
  const [textColor, setTextColor] = useState(STORY_TEXT_COLORS[0]);
  const [fontId, setFontId] = useState<StoryFontId>('classic');
  const [draftText, setDraftText] = useState('');
  const [selectedTextId, setSelectedTextId] = useState<string | null>(null);
  const [layout, setLayout] = useState({ w: SCREEN_W, h: SCREEN_H });
  const currentPath = useRef<StoryPathItem | null>(null);

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

  const updateText = (id: string, patch: Partial<StoryTextItem>) => {
    setOverlay((o) => ({
      ...o,
      texts: o.texts.map((tx) => (tx.id === id ? { ...tx, ...patch } : tx)),
    }));
  };

  const agregarSticker = (emoji: string) => {
    setOverlay((o) => ({
      ...o,
      stickers: [
        ...(o.stickers ?? []),
        { id: `s_${Date.now()}`, emoji, x: 0.5, y: 0.5, scale: 1, rotation: 0 },
      ],
    }));
    setTool('none');
  };

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

  const cssFilter = storyFilterCss(overlay.filter);

  const overlayForDraw: StoryOverlay = {
    ...overlay,
    texts: [], // textos interactivos aparte
  };

  return (
    <View style={styles.root}>
      <View
        style={styles.canvas}
        onLayout={(e) => {
          const { width, height } = e.nativeEvent.layout;
          setLayout({ w: width, h: height });
        }}
        {...(tool === 'draw' ? pan.panHandlers : {})}
      >
        <StoryMediaFill uri={media.uri} tipo={media.tipo} cssFilter={cssFilter} loop muted />

        <StoryOverlayLayer overlay={overlayForDraw} width={layout.w} height={layout.h} />

        {overlay.texts.map((item) => (
          <StoryDraggableText
            key={item.id}
            item={item}
            canvasW={layout.w}
            canvasH={layout.h}
            selected={selectedTextId === item.id}
            editable={tool !== 'draw'}
            onSelect={setSelectedTextId}
            onChange={updateText}
          />
        ))}

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

      {mostrarTrim && media.tipo === 'video' && duracion > 0 ? (
        <View style={[styles.trimPanel, { bottom: insets.bottom + 120 }]}>
          <StoryTrimBar
            uri={media.uri}
            duracionSegundos={duracion}
            inicioSeg={recorteInicio}
            finSeg={recorteFin}
            sinAudio={sinAudio}
            onChange={(ini, fin) => {
              setRecorteInicio(ini);
              setRecorteFin(fin);
            }}
            onToggleAudio={() => setSinAudio((v) => !v)}
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
        <View style={[styles.textPanel, { bottom: insets.bottom + 120 }]}>
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
            style={styles.textInput}
            autoFocus
            onSubmitEditing={addText}
          />
          <View style={styles.textActions}>
            <Text style={styles.dragHint}>{t('historias.textDragHint')}</Text>
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

        <Pressable
          style={[styles.publish, publishing && { opacity: 0.6 }]}
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
  topActions: { flexDirection: 'row', gap: 4 },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  toolOn: { backgroundColor: 'rgba(226,59,74,0.85)' },
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
    fontSize: 18,
    fontWeight: '700',
    paddingVertical: 8,
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
  publish: {
    marginHorizontal: 16,
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
