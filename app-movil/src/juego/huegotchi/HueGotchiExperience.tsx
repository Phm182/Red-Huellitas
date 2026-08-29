import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  LayoutChangeEvent,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import { JuegoAccion, MascotaJuego, MascotaJuegoResumen } from '../../types';
import { juegoApi } from '../../api/juegoApi';
import { fonts } from '../../theme/typography';
import { useTheme } from '../../theme/ThemeProvider';
import { radii } from '../../theme/elevation';
import { PLACES } from './systems/environment';
import { modifiersForTrait } from './systems/personality';
import { SceneBackdrop } from './components/SceneBackdrop';
import { CatchFoodGame } from './components/CatchFoodGame';
import { TrickCoachOverlay } from './components/TrickCoachOverlay';
import { ProceduralPetStage } from './components/ProceduralPetStage';
import { resolveVisualState } from './domain/riveStates';
import { useHueGotchiController } from './hooks/useHueGotchiController';
import { PlaceId } from './domain/types';
import { describeBreed, resolveBreedProfile } from './domain/breeds';
import { poseDuration } from './domain/poses';

type Props = {
  juego: MascotaJuego;
  accion: JuegoAccion | null;
  tamano?: number;
};

type PanelId = 'entertain' | 'stance' | 'place' | 'coat' | 'tricks' | 'social' | null;

/**
 * Escenario HueGotchi: Lottie por estado/acción (LottieFiles) + fondos propios + acordeón.
 */
export function HueGotchiExperience({ juego, accion, tamano = 300 }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const c = useHueGotchiController(juego, accion);
  const traitMods = modifiersForTrait(c.identity.trait);
  const stageRef = useRef<View>(null);
  const [catchFoodOpen, setCatchFoodOpen] = useState(false);
  const [foodMsg, setFoodMsg] = useState<string | null>(null);
  const [panel, setPanel] = useState<PanelId>(null);
  const [petMenu, setPetMenu] = useState(false);
  const [otrasMascotas, setOtrasMascotas] = useState<MascotaJuegoResumen[]>([]);

  useEffect(() => {
    let vivo = true;
    void juegoApi.misMascotas().then((res) => {
      if (!vivo || !res.success || !res.data) return;
      setOtrasMascotas(res.data.mascotas);
    });
    return () => {
      vivo = false;
    };
  }, [juego.mascotaId]);

  const togglePanel = useCallback((id: Exclude<PanelId, null>) => {
    setPetMenu(false);
    setPanel((cur) => (cur === id ? null : id));
  }, []);

  const onLayout = useCallback(
    (_e: LayoutChangeEvent) => {
      const node = stageRef.current;
      if (!node || typeof node.measureInWindow !== 'function') {
        const layout = _e?.nativeEvent?.layout;
        if (layout) {
          c.setStageRect({ x: layout.x, y: layout.y, w: layout.width, h: layout.height });
        }
        return;
      }
      node.measureInWindow((x, y, w, h) => {
        c.setStageRect({ x, y, w, h });
      });
    },
    [c]
  );

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const move = (ev: MouseEvent) => c.onPointerMove(ev.clientX, ev.clientY);
    window.addEventListener('mousemove', move, { passive: true });
    return () => window.removeEventListener('mousemove', move);
  }, [c]);

  const pan = Gesture.Pan()
    .onUpdate((e) => {
      runOnJS(c.onDragPet)(e.translationX, e.translationY, e.absoluteX, e.absoluteY);
    })
    .onEnd((e) => {
      runOnJS(c.onDragEnd)(e.translationX, e.translationY);
    });

  const tap = Gesture.Tap().onEnd((e) => {
    runOnJS(c.onTapPet)(e.absoluteX, e.absoluteY);
  });

  const gesture = Gesture.Exclusive(pan, tap);
  const visual = resolveVisualState({ animo: juego.animo, accion });
  const isRaining = c.environment.weather === 'rain' || c.environment.weather === 'storm';
  const clock = Date.now() / 1000;

  const anim = c.animation;
  let actionTrigger: string | null = null;
  if (anim) {
    const dur = poseDuration(anim.trigger);
    if (performance.now() - anim.startedAt < dur) {
      actionTrigger = anim.trigger;
    }
  }

  const chip = (on: boolean) => ({
    borderColor: on ? colors.primary : colors.border,
    backgroundColor: on ? colors.primarySoft : colors.surface,
  });

  const tabs: { id: Exclude<PanelId, null>; label: string; hide?: boolean }[] = [
    { id: 'entertain', label: t('juego.entertain.title') },
    { id: 'stance', label: t('juego.stance.title') },
    { id: 'coat', label: t('juego.coat.title'), hide: c.coats.length === 0 },
    { id: 'place', label: t('juego.panel.place') },
    { id: 'tricks', label: t('juego.tricks.title') },
    { id: 'social', label: t('juego.panel.social') },
  ];

  return (
    <View style={styles.root}>
      <GestureDetector gesture={gesture}>
        <View
          ref={stageRef}
          style={[
            styles.stage,
            {
              width: tamano,
              height: tamano,
              backgroundColor: colors.surface,
            },
          ]}
          onLayout={onLayout}
        >
          <SceneBackdrop
            place={c.environment.place}
            isNight={c.environment.isNight}
            isRaining={isRaining}
            size={tamano}
            clock={clock}
          />
          {c.guest ? (
            <View
              style={{
                position: 'absolute',
                width: tamano * 0.42,
                height: tamano * 0.42,
                right: tamano * 0.04,
                bottom: tamano * 0.08,
                opacity: 0.92,
              }}
              pointerEvents="none"
            >
              <ProceduralPetStage
                size={tamano * 0.42}
                breed={resolveBreedProfile(c.guest.guestSpecies, c.guest.guestRaza, 'adulto')}
                yaw={0}
                heldStance="none"
                actionTrigger={null}
                actionStartedAt={null}
                visual={c.guest.outcome === 'ignore' ? 'sad' : 'happy'}
                uid="guest"
              />
            </View>
          ) : null}
          <View style={styles.fill} pointerEvents="box-none">
            {/* Un solo renderer 2D dibujado a mano (SVG) para las 10 especies:
                nada de modelos 3D ni de paquetes de animación de terceros. */}
            <ProceduralPetStage
              size={tamano}
              breed={c.breed}
              yaw={c.yaw}
              heldStance={c.heldStance}
              actionTrigger={actionTrigger}
              actionStartedAt={anim?.startedAt ?? null}
              visual={visual}
              voiceMouth={c.voiceMouth}
              fidget={traitMods.fidget}
              lookX={c.physicsSnapshot.lookX}
              lookY={c.physicsSnapshot.lookY}
              squash={c.physicsSnapshot.squash}
              stretch={c.physicsSnapshot.stretch}
            />
          </View>
          <TrickCoachOverlay
            activo={c.activeTrick != null}
            gesturePool={c.trickGesturePool}
            totalPasos={c.trickTotal}
            pasos={c.trickPasos}
            flash={c.trickFlash}
            primary={colors.primary}
            surface={colors.surface}
            border={colors.border}
            textColor={colors.text}
            mutedColor={colors.textMuted}
            titulo={
              c.activeTrick
                ? t(c.tricks.find((tr) => tr.id === c.activeTrick)?.labelKey ?? 'juego.tricks.title')
                : null
            }
            xpHint={c.trickXpReward}
            hintText={t('juego.tricks.briefing')}
            progressLabel={t('juego.tricks.progress', {
              n: Math.min(c.trickPasos + 1, Math.max(1, c.trickTotal)),
              total: c.trickTotal,
            })}
          />
          {c.sleepLocked ? (
            <View style={styles.sleepOverlay} pointerEvents="none">
              <Text style={styles.sleepText}>
                {t('juego.sleep.locked', { sec: Math.ceil(c.sleepRemainingMs / 1000) })}
              </Text>
            </View>
          ) : null}
        </View>
      </GestureDetector>

      <Text style={[styles.hint, { color: colors.textMuted }]}>
        {t('juego.petHint')}
      </Text>

      {/* Pelaje siempre visible: no queda escondido en el acordeón. */}
      {c.coats.length > 0 ? (
        <View style={styles.coatRow}>
          <Text style={{ color: colors.textMuted, fontSize: 11, marginRight: 4 }}>
            {t('juego.coat.title')}
          </Text>
          {c.coats.map((v) => {
            const on = (c.coatId ?? c.coats[0]!.id) === v.id;
            return (
              <Pressable
                key={v.id}
                onPress={() => c.setCoat(v.id)}
                style={[
                  styles.swatchMini,
                  {
                    borderColor: on ? colors.primary : colors.border,
                    borderWidth: on ? 3 : 1,
                  },
                ]}
                accessibilityLabel={v.nombre}
              >
                <View style={[styles.swatchColorMini, { backgroundColor: v.base }]}>
                  <View style={{ height: 8, backgroundColor: v.accent }} />
                </View>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      <View style={styles.nameRow}>
        <Pressable
          onPress={() => {
            if (otrasMascotas.length < 2) {
              router.push('/(app)/juego/mascotas' as never);
              return;
            }
            setPanel(null);
            setPetMenu((v) => !v);
          }}
          style={styles.nameBtn}
          accessibilityRole="button"
          accessibilityLabel={t('juego.cambiarMascota')}
        >
          <Text style={[styles.name, { color: colors.text }]}>{juego.nombre}</Text>
          <Ionicons
            name={petMenu ? 'chevron-up' : 'chevron-down'}
            size={22}
            color={colors.primary}
            style={{ marginLeft: 6 }}
          />
        </Pressable>
      </View>
      {petMenu ? (
        <View
          style={[
            styles.petMenu,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          {otrasMascotas.map((m) => {
            const on = m.mascotaId === juego.mascotaId;
            return (
              <Pressable
                key={m.mascotaId}
                onPress={() => {
                  setPetMenu(false);
                  if (on) return;
                  router.replace({
                    pathname: '/(app)/juego/[mascotaId]',
                    params: { mascotaId: String(m.mascotaId) },
                  });
                }}
                style={[
                  styles.petMenuItem,
                  on && { backgroundColor: colors.primarySoft },
                ]}
              >
                <Text style={{ color: on ? colors.primary : colors.text, fontSize: 14 }}>
                  {m.nombre}
                </Text>
                <Text style={{ color: colors.textMuted, fontSize: 11 }}>{m.especie}</Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}
      <Text style={{ color: colors.textMuted, textAlign: 'center' }}>
        {t(`juego.animo.${juego.animo}`)} · {t(`juego.traits.${c.identity.trait}`)}
      </Text>
      <Text style={{ color: colors.textMuted, textAlign: 'center', fontSize: 12, marginTop: 2 }}>
        {describeBreed(c.breed)}
      </Text>
      {c.guest ? (
        <Text style={{ color: colors.primary, marginTop: 6, fontSize: 12 }}>
          {t('juego.visit.guest', { name: c.guest.guestNombre, outcome: c.guest.outcome })}
        </Text>
      ) : null}
      {c.trickMsg ? (
        <Text style={{ color: colors.primary, marginTop: 4, fontSize: 12 }}>{c.trickMsg}</Text>
      ) : null}
      {c.heldStance === 'sleep' && !c.sleepLocked ? (
        <Pressable onPress={() => c.wakePet()} style={{ marginTop: 6 }}>
          <Text style={{ color: colors.primary, fontSize: 13 }}>{t('juego.sleep.wake')}</Text>
        </Pressable>
      ) : null}

      {/* Acordeón: la pestaña activa se continúa en el panel de opciones debajo. */}
      <View
        style={[
          styles.accordion,
          {
            borderColor: colors.border,
            backgroundColor: colors.surface,
          },
          panel ? styles.accordionOpen : null,
        ]}
      >
        <View style={styles.tabRow}>
          {tabs
            .filter((tab) => !tab.hide)
            .map((tab) => {
              const on = panel === tab.id;
              return (
                <Pressable
                  key={tab.id}
                  onPress={() => togglePanel(tab.id)}
                  style={[
                    styles.tab,
                    {
                      borderColor: on ? colors.primary : 'transparent',
                      backgroundColor: on ? colors.primarySoft : 'transparent',
                    },
                    on && panel ? styles.tabConnected : null,
                  ]}
                >
                  <Text
                    style={{ color: on ? colors.primary : colors.text, fontSize: 11, fontWeight: on ? '700' : '400' }}
                    numberOfLines={1}
                  >
                    {tab.label}
                  </Text>
                </Pressable>
              );
            })}
        </View>

        {panel ? (
          <View
            style={[
              styles.panelConnected,
              {
                borderTopColor: colors.primary,
                backgroundColor: colors.primarySoft,
              },
            ]}
          >
            {panel === 'entertain' ? (
              <View style={styles.panel}>
                {(
                  [
                    ['pet', 'pet'],
                    ['scratch', 'scratch'],
                    ['play', 'play'],
                    ['speak', 'speak'],
                  ] as const
                ).map(([kind, key]) => (
                  <Pressable
                    key={kind}
                    disabled={c.sleepLocked}
                    onPress={() => c.entertain(kind)}
                    style={[styles.chip, chip(false), c.sleepLocked && styles.disabled]}
                  >
                    <Text style={{ color: colors.text, fontSize: 12 }}>{t(`juego.entertain.${key}`)}</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}

            {panel === 'stance' ? (
              <View style={styles.panel}>
                {(
                  [
                    ['sit', 'sit'],
                    ['lie', 'lie'],
                    ['none', 'stand'],
                  ] as const
                ).map(([stance, key]) => {
                  const on = c.heldStance === stance;
                  return (
                    <Pressable
                      key={stance}
                      disabled={c.sleepLocked}
                      onPress={() => c.setStance(stance)}
                      style={[styles.chip, chip(on), c.sleepLocked && styles.disabled]}
                    >
                      <Text style={{ color: on ? colors.primary : colors.text, fontSize: 12 }}>
                        {t(`juego.stance.${key}`)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : null}

            {panel === 'place' ? (
              <View style={styles.panel}>
                {PLACES.map((p) => {
                  const on = c.place === p.id;
                  return (
                    <Pressable
                      key={p.id}
                      onPress={() => c.setPlace(p.id as PlaceId)}
                      style={[styles.chip, chip(on)]}
                    >
                      <Text style={{ color: colors.text, fontSize: 12 }}>{t(p.labelKey)}</Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : null}

            {panel === 'coat' ? (
              <View style={styles.panel}>
                {c.coats.map((v) => {
                  const on = (c.coatId ?? c.coats[0]!.id) === v.id;
                  return (
                    <Pressable
                      key={v.id}
                      onPress={() => c.setCoat(v.id)}
                      style={[
                        styles.swatch,
                        { borderColor: on ? colors.primary : colors.border, borderWidth: on ? 3 : 1 },
                      ]}
                      accessibilityLabel={v.nombre}
                    >
                      <View style={[styles.swatchColor, { backgroundColor: v.base }]}>
                        <View style={[styles.swatchAccent, { backgroundColor: v.accent }]} />
                      </View>
                      <Text style={{ color: colors.textMuted, fontSize: 10, marginTop: 3 }} numberOfLines={1}>
                        {v.nombre}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : null}

            {panel === 'tricks' ? (
              <View style={styles.panelCol}>
                <Text style={{ color: colors.textMuted, fontSize: 11, textAlign: 'center', marginBottom: 6 }}>
                  {t('juego.tricks.howto')}
                </Text>
                <View style={styles.panel}>
                  {c.tricks.map((tr) => {
                    const on = c.activeTrick === tr.id;
                    const xp = c.trickXpPreview(tr.id);
                    return (
                      <Pressable
                        key={tr.id}
                        disabled={c.sleepLocked}
                        onPress={() => c.startTrick(tr.id)}
                        style={[styles.chip, chip(on), c.sleepLocked && styles.disabled]}
                      >
                        <Text style={{ color: on ? colors.primary : colors.text, fontSize: 12 }}>
                          {t(tr.labelKey)}
                        </Text>
                        {xp ? (
                          <Text style={{ color: colors.textMuted, fontSize: 10, marginTop: 2 }}>
                            {t('juego.tricks.xpRange', { min: xp.min, max: xp.max })}
                          </Text>
                        ) : null}
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ) : null}

            {panel === 'social' ? (
              <View style={styles.panel}>
                <Pressable
                  disabled={c.sleepLocked}
                  onPress={c.inviteFriend}
                  style={[styles.chip, chip(true), c.sleepLocked && styles.disabled]}
                >
                  <Text style={{ color: colors.primary, fontSize: 12 }}>{t('juego.visit.invite')}</Text>
                </Pressable>
                {c.guest ? (
                  <Pressable
                    onPress={c.clearGuest}
                    style={[styles.chip, { borderColor: colors.border, backgroundColor: colors.surface }]}
                  >
                    <Text style={{ color: colors.textMuted, fontSize: 12 }}>{t('juego.visit.clear')}</Text>
                  </Pressable>
                ) : null}
                {traitMods.enableCatchFood && !catchFoodOpen ? (
                  <Pressable
                    disabled={c.sleepLocked}
                    onPress={() => {
                      setFoodMsg(null);
                      setCatchFoodOpen(true);
                    }}
                    style={[styles.chip, chip(false), c.sleepLocked && styles.disabled]}
                  >
                    <Text style={{ color: colors.text, fontSize: 12 }}>{t('juego.catchFood')}</Text>
                  </Pressable>
                ) : null}
              </View>
            ) : null}
          </View>
        ) : null}
      </View>

      {catchFoodOpen ? (
        <CatchFoodGame
          onFinish={(caught, total) => {
            setCatchFoodOpen(false);
            const xp = caught * 3;
            setFoodMsg(`¡Atrapó ${caught}/${total}! +${xp} XP`);
            c.react('catchFood');
          }}
        />
      ) : null}
      {foodMsg ? <Text style={{ color: colors.primary, marginTop: 8, fontSize: 12 }}>{foodMsg}</Text> : null}

      {environmentHint(c.environment.isNight, c.environment.preferIndoors, t, colors.textMuted)}
    </View>
  );
}

function environmentHint(
  isNight: boolean,
  preferIndoors: boolean,
  t: (k: string) => string,
  color: string
) {
  if (preferIndoors) {
    return <Text style={{ color, fontSize: 11, marginTop: 8 }}>{t('juego.weather.preferIndoors')}</Text>;
  }
  if (isNight) {
    return <Text style={{ color, fontSize: 11, marginTop: 8 }}>{t('juego.weather.night')}</Text>;
  }
  return null;
}

const styles = StyleSheet.create({
  root: { alignItems: 'center', width: '100%' },
  stage: {
    borderRadius: radii.lg,
    overflow: 'hidden',
    alignSelf: 'center',
  },
  fill: { position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 },
  hint: { fontSize: 11, marginTop: 6, textAlign: 'center' },
  nameRow: { marginTop: 8, alignItems: 'center' },
  nameBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4, paddingHorizontal: 8 },
  name: { fontSize: 22, fontFamily: fonts.displaySemi },
  petMenu: {
    marginTop: 6,
    borderWidth: 1,
    borderRadius: radii.md,
    overflow: 'hidden',
    width: '90%',
    maxWidth: 320,
    alignSelf: 'center',
  },
  petMenuItem: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.08)',
  },
  coatRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 8,
    width: '100%',
  },
  swatchMini: { borderRadius: 14, padding: 2 },
  swatchColorMini: {
    width: 26,
    height: 26,
    borderRadius: 13,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  accordion: {
    marginTop: 14,
    width: '100%',
    maxWidth: 420,
    borderWidth: 1,
    borderRadius: radii.lg,
    overflow: 'hidden',
    alignSelf: 'center',
  },
  accordionOpen: {
    borderBottomLeftRadius: radii.lg,
    borderBottomRightRadius: radii.lg,
  },
  tabRow: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    gap: 4,
    width: '100%',
    justifyContent: 'space-evenly',
    paddingHorizontal: 6,
    paddingTop: 8,
    paddingBottom: 8,
  },
  tab: {
    borderWidth: 1.5,
    borderRadius: radii.pill,
    paddingHorizontal: 10,
    paddingVertical: 7,
    flexShrink: 1,
  },
  /** Pestaña activa “abre” hacia el panel: sin radio inferior. */
  tabConnected: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderBottomWidth: 0,
    marginBottom: -1,
    zIndex: 2,
  },
  panelConnected: {
    borderTopWidth: 2,
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: 12,
    width: '100%',
  },
  panelCol: { width: '100%', alignItems: 'center' },
  panel: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
    width: '100%',
  },
  chip: {
    borderWidth: 1,
    borderRadius: radii.pill,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  disabled: { opacity: 0.45 },
  swatch: { alignItems: 'center', width: 58, borderRadius: radii.md, padding: 4 },
  swatchColor: {
    width: 34,
    height: 34,
    borderRadius: 17,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  swatchAccent: { height: 12 },
  sleepOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 12,
    backgroundColor: 'rgba(20, 24, 40, 0.18)',
  },
  sleepText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: fonts.bodySemi,
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});
