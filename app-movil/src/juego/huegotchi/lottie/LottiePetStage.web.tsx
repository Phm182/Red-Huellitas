/**
 * Player Lottie web — un solo clip a la vez (sin capas semitransparentes).
 */

import React, { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import type { AnimationItem } from 'lottie-web';
import { HueSpecies } from '../domain/types';
import { lottieSource, resolveLottieClip, ResolveLottieOpts } from './catalog';

type Props = {
  size: number;
  species: HueSpecies;
  heldStance: ResolveLottieOpts['heldStance'];
  actionTrigger: string | null;
  mood: string;
  visual?: string | null;
  /** Cambia en cada reacción para reiniciar el mismo clip. */
  animGen?: number;
};

function WebLottieClip({
  source,
  loop,
  size,
  clipKey,
}: {
  source: object;
  loop: boolean;
  size: number;
  clipKey: string;
}) {
  const hostRef = useRef<View>(null);
  const animRef = useRef<AnimationItem | null>(null);

  useEffect(() => {
    let cancelled = false;

    void import('lottie-web').then((mod) => {
      if (cancelled) return;
      const el = hostRef.current as unknown as HTMLElement | null;
      if (!el) return;
      const lottie = mod.default;
      const data = JSON.parse(JSON.stringify(source));
      el.innerHTML = '';
      animRef.current?.destroy();
      animRef.current = lottie.loadAnimation({
        container: el,
        renderer: 'svg',
        loop,
        autoplay: true,
        animationData: data,
        rendererSettings: {
          preserveAspectRatio: 'xMidYMid meet',
          clearCanvas: true,
        },
      });
    });

    return () => {
      cancelled = true;
      animRef.current?.destroy();
      animRef.current = null;
      const el = hostRef.current as unknown as HTMLElement | null;
      if (el) el.innerHTML = '';
    };
  }, [source, loop, clipKey]);

  return (
    <View
      ref={hostRef}
      style={{ width: size * 0.92, height: size * 0.92 }}
      pointerEvents="none"
    />
  );
}

export function LottiePetStage({
  size,
  species,
  heldStance,
  actionTrigger,
  mood,
  visual,
  animGen = 0,
}: Props) {
  const resolved = resolveLottieClip({
    species,
    heldStance,
    actionTrigger,
    mood,
    visual,
  });
  const source = lottieSource(species, resolved.clip);
  const clipKey = `${species}-${resolved.clip}-${animGen}`;

  return (
    <View style={[styles.wrap, { width: size, height: size }]} pointerEvents="none">
      <WebLottieClip
        key={clipKey}
        clipKey={clipKey}
        source={source}
        loop={resolved.loop}
        size={size}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    top: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
