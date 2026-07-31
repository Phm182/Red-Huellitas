/**
 * Player Lottie nativo — un solo clip a la vez (sin capas semitransparentes).
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';
import LottieView from 'lottie-react-native';
import { HueSpecies } from '../domain/types';
import { lottieSource, resolveLottieClip, ResolveLottieOpts } from './catalog';

type Props = {
  size: number;
  species: HueSpecies;
  heldStance: ResolveLottieOpts['heldStance'];
  actionTrigger: string | null;
  mood: string;
  visual?: string | null;
  animGen?: number;
};

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
  const dim = Math.round(size * 0.92);
  const clipKey = `${species}-${resolved.clip}-${animGen}`;

  return (
    <View style={[styles.wrap, { width: size, height: size }]} pointerEvents="none">
      <LottieView
        key={clipKey}
        source={source}
        autoPlay
        loop={resolved.loop}
        style={{ width: dim, height: dim }}
        resizeMode="contain"
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
