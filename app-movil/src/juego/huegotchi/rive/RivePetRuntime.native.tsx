/**
 * Runtime Rive nativo — @rive-app/react-native (development build).
 */
import React, { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  Alignment,
  Fit,
  RiveView,
  useRive,
  useRiveBoolean,
  useRiveFile,
  useRiveNumber,
  useRiveString,
  useViewModelInstance,
} from '@rive-app/react-native';
import {
  RIVE_ARTBOARD,
  RIVE_BOOLEANS,
  RIVE_NUMBERS,
  RIVE_SKIN_PROP,
  RIVE_SM,
  RIVE_VM,
  RiveBridgeInputs,
} from './contract';
import { RivePetHandle, RivePetRuntimeProps } from './RivePetRuntime.types';

export function RivePetRuntime({ source, width, height, onReady, onError }: RivePetRuntimeProps) {
  const fileInput = useMemo(
    () => (typeof source === 'number' ? source : { uri: String(source) }),
    [source]
  );
  const fileState = useRiveFile(fileInput);
  const { setHybridRef } = useRive();

  const { instance: vmi } = useViewModelInstance(fileState.riveFile ?? undefined, {
    viewModelName: RIVE_VM,
    async: true as const,
  });

  const lookX = useRiveNumber(RIVE_NUMBERS.lookX, vmi);
  const lookY = useRiveNumber(RIVE_NUMBERS.lookY, vmi);
  const squash = useRiveNumber(RIVE_NUMBERS.squash, vmi);
  const stretch = useRiveNumber(RIVE_NUMBERS.stretch, vmi);
  const mood = useRiveNumber(RIVE_NUMBERS.mood, vmi);
  const bodyScale = useRiveNumber(RIVE_NUMBERS.bodyScale, vmi);
  const ageBlend = useRiveNumber(RIVE_NUMBERS.ageBlend, vmi);
  const placeId = useRiveNumber(RIVE_NUMBERS.placeId, vmi);
  const weatherId = useRiveNumber(RIVE_NUMBERS.weatherId, vmi);
  const periodId = useRiveNumber(RIVE_NUMBERS.periodId, vmi);

  const dragging = useRiveBoolean(RIVE_BOOLEANS.isDragging, vmi);
  const sleeping = useRiveBoolean(RIVE_BOOLEANS.isSleeping, vmi);
  const night = useRiveBoolean(RIVE_BOOLEANS.isNight, vmi);
  const raining = useRiveBoolean(RIVE_BOOLEANS.isRaining, vmi);
  const preferIndoors = useRiveBoolean(RIVE_BOOLEANS.preferIndoors, vmi);
  const hasGuest = useRiveBoolean(RIVE_BOOLEANS.hasGuest, vmi);
  const skin = useRiveString(RIVE_SKIN_PROP, vmi);

  useEffect(() => {
    if (fileState.error) onError?.(fileState.error);
  }, [fileState.error, onError]);

  useEffect(() => {
    if (!vmi) return;

    const setInputs = (partial: Partial<RiveBridgeInputs>) => {
      if (partial.lookX != null) lookX.setValue(partial.lookX);
      if (partial.lookY != null) lookY.setValue(partial.lookY);
      if (partial.squash != null) squash.setValue(partial.squash);
      if (partial.stretch != null) stretch.setValue(partial.stretch);
      if (partial.mood != null) mood.setValue(partial.mood);
      if (partial.bodyScale != null) bodyScale.setValue(partial.bodyScale);
      if (partial.ageBlend != null) ageBlend.setValue(partial.ageBlend);
      if (partial.placeId != null) placeId.setValue(partial.placeId);
      if (partial.weatherId != null) weatherId.setValue(partial.weatherId);
      if (partial.periodId != null) periodId.setValue(partial.periodId);
      if (partial.isDragging != null) dragging.setValue(partial.isDragging);
      if (partial.isSleeping != null) sleeping.setValue(partial.isSleeping);
      if (partial.isNight != null) night.setValue(partial.isNight);
      if (partial.isRaining != null) raining.setValue(partial.isRaining);
      if (partial.preferIndoors != null) preferIndoors.setValue(partial.preferIndoors);
      if (partial.hasGuest != null) hasGuest.setValue(partial.hasGuest);
      if (partial.skinId != null) skin.setValue(partial.skinId);
    };

    const handle: RivePetHandle = {
      setInputs,
      setSkin: (skinId) => skin.setValue(skinId),
      fire: (triggerName) => {
        try {
          const prop = (vmi as { trigger?: (n: string) => { trigger: () => void } | null }).trigger?.(
            triggerName
          );
          prop?.trigger();
        } catch {
          /* */
        }
      },
      react: (kind) => {
        try {
          const prop = (vmi as { trigger?: (n: string) => { trigger: () => void } | null }).trigger?.(
            kind
          );
          prop?.trigger();
        } catch {
          /* */
        }
      },
    };
    onReady?.(handle);
  }, [
    vmi,
    onReady,
    lookX,
    lookY,
    squash,
    stretch,
    mood,
    bodyScale,
    ageBlend,
    placeId,
    weatherId,
    periodId,
    dragging,
    sleeping,
    night,
    raining,
    preferIndoors,
    hasGuest,
    skin,
  ]);

  if (fileState.isLoading || !fileState.riveFile) {
    return <View style={{ width, height }} />;
  }

  return (
    <View style={[styles.wrap, { width, height }]}>
      <RiveView
        file={fileState.riveFile}
        artboardName={RIVE_ARTBOARD}
        stateMachineName={RIVE_SM}
        dataBind={vmi ?? undefined}
        autoPlay
        fit={Fit.Contain}
        alignment={Alignment.Center}
        style={{ width, height }}
        // Nitro hybrid ref (API @rive-app/react-native)
        {...({ hybridRef: setHybridRef } as Record<string, unknown>)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { overflow: 'hidden', borderRadius: 20 },
});
