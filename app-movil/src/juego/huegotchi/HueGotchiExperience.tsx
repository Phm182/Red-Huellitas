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
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import { JuegoAccion, MascotaJuego } from '../../types';
import { fonts } from '../../theme/typography';
import { useTheme } from '../../theme/ThemeProvider';
import { radii } from '../../theme/elevation';
import { PLACES } from './systems/environment';
import { modifiersForTrait } from './systems/personality';
import { ProceduralPet } from './components/ProceduralPet';
import { SceneBackdrop } from './components/SceneBackdrop';
import { CatchFoodGame } from './components/CatchFoodGame';
import { resolveVisualState } from './domain/riveStates';
import { useHueGotchiController } from './hooks/useHueGotchiController';
import { PlaceId } from './domain/types';
import { describeBreed, resolveBreedProfile } from './domain/breeds';
import { blendPose, idlePose, poseDuration, poseFor } from './domain/poses';
import { iconoGesto } from './systems/training';

type Props = {
  juego: MascotaJuego;
  accion: JuegoAccion | null;
  tamano?: number;
};

/** Escala de la visita respecto del dueño (queda un paso más atrás). */
const GUEST_SCALE = 0.68;
/** Altura del piso dentro del viewBox del personaje (y=150 de 200). */
const GROUND_FRAC = 0.75;

/**
 * Escenario HueGotchi 100% código: personaje procedural + gestos + lugares +
 * trucos + visitas + minijuego de comida.
 */
export function HueGotchiExperience({ juego, accion, tamano = 300 }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const c = useHueGotchiController(juego, accion);
  const traitMods = modifiersForTrait(c.identity.trait);
  const stageRef = useRef<View>(null);
  const [catchFoodOpen, setCatchFoodOpen] = useState(false);
  const [foodMsg, setFoodMsg] = useState<string | null>(null);

  const onLayout = useCallback(
    (_e: LayoutChangeEvent) => {
      const node = stageRef.current;
      if (!node || typeof node.measureInWindow !== 'function') {
        // Fallback web: usar el layout relativo si measureInWindow no existe.
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
      // El desplazamiento total va acá: es lo que define el gesto del truco.
      runOnJS(c.onDragEnd)(e.translationX, e.translationY);
    });

  const tap = Gesture.Tap().onEnd((e) => {
    runOnJS(c.onTapPet)(e.absoluteX, e.absoluteY);
  });

  const gesture = Gesture.Exclusive(pan, tap);
  const phy = c.physicsSnapshot;
  const visual = resolveVisualState({ animo: juego.animo, accion });
  const isRaining = c.environment.weather === 'rain' || c.environment.weather === 'storm';

  // Reloj compartido: alimenta respiración, cola, lluvia y nubes. El controller
  // ya re-renderiza a ~33fps, así que leer el tiempo acá alcanza y evita tener
  // un Animated.Value por cada parte del cuerpo.
  const now = Date.now();
  const clock = now / 1000;

  const sleeping = accion === 'dormir' || visual === 'sleeping';
  const base = idlePose(clock, {
    fidget: traitMods.fidget,
    sleeping,
    sad: visual === 'sad',
    happy: visual === 'happy' || visual === 'playing',
  });

  // Pose de la acción en curso, difuminada al entrar y al salir para que no
  // pegue un salto cuando arranca o termina.
  const anim = c.animation;
  let pose = base;
  if (anim) {
    const dur = poseDuration(anim.trigger);
    const tAnim = (performance.now() - anim.startedAt) / dur;
    if (tAnim >= 0 && tAnim <= 1.15) {
      const fade = Math.min(1, Math.min(tAnim / 0.12, (1.05 - tAnim) / 0.15));
      pose = blendPose(base, poseFor(anim.trigger, tAnim), Math.max(0, fade));
    }
  }
  // Arrastrar levanta al animal y lo estira un poco.
  if (phy.isDragging) {
    pose = { ...pose, bodyY: pose.bodyY - 8, bodyRot: pose.bodyRot + phy.lookX * 6 };
  }

  const guestBreed = c.guest
    ? resolveBreedProfile(c.guest.guestSpecies, c.guest.guestRaza, 'adulto')
    : null;
  const guestPose = c.guest
    ? idlePose(clock + 1.7, {
        fidget: 0.6,
        sleeping: false,
        sad: c.guest.outcome === 'ignore',
        happy: c.guest.outcome === 'play',
      })
    : null;

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
          {/* La visita va detrás y a un costado, más chica por perspectiva.
              El offset alinea su línea de piso con la del dueño: el suelo del
              viewBox está en y=150/200, así que hay que compensar la escala. */}
          {c.guest && guestBreed && guestPose ? (
            <View
              style={{
                position: 'absolute',
                width: tamano * GUEST_SCALE,
                height: tamano * GUEST_SCALE,
                left: tamano * 0.27,
                top: GROUND_FRAC * tamano * (1 - GUEST_SCALE),
              }}
              pointerEvents="none"
            >
              <ProceduralPet
                size={tamano * GUEST_SCALE}
                breed={guestBreed}
                pose={guestPose}
                facing={-1}
                uid="guest"
                clock={clock}
                lookX={-0.6}
              />
            </View>
          ) : null}
          <View style={styles.fill} pointerEvents="box-none">
            <ProceduralPet
              size={tamano}
              breed={c.breed}
              pose={pose}
              lookX={phy.lookX}
              lookY={phy.lookY}
              squash={phy.squash}
              stretch={phy.stretch}
              uid="own"
              clock={clock}
            />
          </View>
        </View>
      </GestureDetector>

      <Text style={[styles.name, { color: colors.text }]}>{juego.nombre}</Text>
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

      {/* Lugares */}
      <View style={styles.rowWrap}>
        {PLACES.map((p) => {
          const on = c.place === p.id;
          return (
            <Pressable
              key={p.id}
              onPress={() => c.setPlace(p.id as PlaceId)}
              style={[
                styles.chip,
                {
                  borderColor: on ? colors.primary : colors.border,
                  backgroundColor: on ? colors.primarySoft : colors.surface,
                },
              ]}
            >
              <Text style={{ color: colors.text, fontSize: 12 }}>{t(p.labelKey)}</Text>
            </Pressable>
          );
        })}
      </View>

      {/* Pelaje: un Labrador puede ser dorado, chocolate o negro. */}
      {c.coats.length > 0 ? (
        <>
          <Text style={[styles.section, { color: colors.text }]}>{t('juego.coat.title')}</Text>
          <View style={styles.rowWrap}>
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
        </>
      ) : null}

      {/* Trucos */}
      <Text style={[styles.section, { color: colors.text }]}>{t('juego.tricks.title')}</Text>
      <View style={styles.rowWrap}>
        {c.tricks.map((tr) => {
          const on = c.activeTrick === tr.id;
          return (
            <Pressable
              key={tr.id}
              onPress={() => c.startTrick(tr.id)}
              style={[
                styles.chip,
                {
                  borderColor: on ? colors.primary : colors.border,
                  backgroundColor: on ? colors.primarySoft : colors.surface,
                },
              ]}
            >
              <Text style={{ color: on ? colors.primary : colors.text, fontSize: 12 }}>
                {t(tr.labelKey)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Patrón a repetir: sin esto no había forma de saber qué gesto hacer. */}
      {c.trickPatron ? (
        <View style={styles.patron}>
          <Text style={{ color: colors.textMuted, fontSize: 11, marginRight: 4 }}>
            {t('juego.tricks.hace')}
          </Text>
          {c.trickPatron.map((g, i) => {
            const hecho = i < c.trickPasos;
            const ahora = i === c.trickPasos;
            return (
              <View
                key={i}
                style={[
                  styles.paso,
                  {
                    borderColor: ahora ? colors.primary : colors.border,
                    backgroundColor: hecho ? colors.primary : colors.surface,
                    borderWidth: ahora ? 2 : 1,
                  },
                ]}
              >
                <Text style={{ color: hecho ? colors.surface : colors.text, fontSize: 14 }}>
                  {iconoGesto(g)}
                </Text>
              </View>
            );
          })}
        </View>
      ) : null}

      {/* Social + glotón */}
      <View style={styles.rowWrap}>
        <Pressable
          onPress={c.inviteFriend}
          style={[styles.chip, { borderColor: colors.primary, backgroundColor: colors.primarySoft }]}
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
            onPress={() => {
              setFoodMsg(null);
              setCatchFoodOpen(true);
            }}
            style={[styles.chip, { borderColor: colors.border, backgroundColor: colors.surface }]}
          >
            <Text style={{ color: colors.text, fontSize: 12 }}>{t('juego.catchFood')}</Text>
          </Pressable>
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
  name: { fontSize: 22, fontFamily: fonts.displaySemi, marginTop: 12 },
  section: { alignSelf: 'flex-start', fontFamily: fonts.bodySemi, marginTop: 14, marginBottom: 6 },
  rowWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
    justifyContent: 'center',
  },
  chip: {
    borderWidth: 1,
    borderRadius: radii.pill,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  swatch: { alignItems: 'center', width: 58, borderRadius: radii.md, padding: 4 },
  swatchColor: {
    width: 34,
    height: 34,
    borderRadius: 17,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  swatchAccent: { height: 12 },
  patron: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
  paso: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
