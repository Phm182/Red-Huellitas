import React, { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { ResolvedBreed } from '../domain/breeds';
import { HueGotchiState } from '../domain/riveStates';
import {
  blendPose,
  HeldStance,
  idlePose,
  mouthFromVoice,
  PetView,
  Pose,
  poseDuration,
  poseForSpecies,
} from '../domain/poses';
import { ProceduralPet } from './ProceduralPet';

type Props = {
  size: number;
  breed: ResolvedBreed;
  /** Rotación acumulada del usuario; define perfil/frente/espalda y el espejado. */
  yaw: number;
  heldStance: HeldStance;
  actionTrigger: string | null;
  actionStartedAt: number | null;
  visual: HueGotchiState;
  /** 0–1: apertura de boca sincronizada con el audio que está sonando. */
  voiceMouth?: { startedAt: number; durationMs: number } | null;
  fidget?: number;
  lookX?: number;
  lookY?: number;
  squash?: number;
  stretch?: number;
  uid?: string;
};

/**
 * Adaptador del personaje procedural a la misma interfaz que `GlbPetStage` y
 * `LottiePetStage`, para poder elegir renderer por especie sin que la pantalla
 * sepa cómo se dibuja cada uno.
 *
 * El gato entra por acá: su pack GLB era un STL de impresión 3D, sin esqueleto,
 * que sólo se podía mover en bloque. El perro sigue en GLB porque ese sí tiene
 * malla con huesos y clips de animación reales.
 */
export function ProceduralPetStage({
  size,
  breed,
  yaw,
  heldStance,
  actionTrigger,
  actionStartedAt,
  visual,
  voiceMouth = null,
  fidget = 0.5,
  lookX = 0,
  lookY = 0,
  squash = 0,
  stretch = 0,
  uid = 'own',
}: Props) {
  // Reloj propio a ~33fps: el personaje respira y mueve la cola aunque la
  // pantalla no se re-renderice por otra causa.
  const [, tick] = useState(0);
  const clockRef = useRef(Date.now() / 1000);
  useEffect(() => {
    let raf = 0;
    let ultimo = 0;
    let vivo = true;
    const loop = (now: number) => {
      if (!vivo) return;
      if (now - ultimo >= 30) {
        ultimo = now;
        clockRef.current = Date.now() / 1000;
        tick((n) => (n + 1) % 100000);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      vivo = false;
      cancelAnimationFrame(raf);
    };
  }, []);

  const clock = clockRef.current;
  const especie = breed.species;
  const durmiendo = heldStance === 'sleep' || visual === 'sleeping';

  let pose: Pose = idlePose(clock, {
    fidget,
    sleeping: durmiendo,
    sad: visual === 'sad',
    happy: visual === 'happy' || visual === 'playing',
    held: heldStance,
  });

  // Acción en curso, difuminada al entrar y salir para que no pegue un salto.
  if (actionTrigger && actionStartedAt != null) {
    const dur = poseDuration(actionTrigger);
    const t = (Date.now() - actionStartedAt) / dur;
    if (t >= 0 && t <= 1.15) {
      const fade = Math.min(1, Math.min(t / 0.12, (1.05 - t) / 0.15));
      pose = blendPose(pose, poseForSpecies(actionTrigger, t, especie), Math.max(0, fade));
    }
  }

  // La boca sigue al audio: si el maullido dura 2s, la boca se mueve 2s.
  if (voiceMouth) {
    const abierta = mouthFromVoice(Date.now() - voiceMouth.startedAt, voiceMouth.durationMs, especie);
    if (abierta > 0) pose = { ...pose, mouthOpen: Math.max(pose.mouthOpen, abierta) };
  }

  // yaw en pasos de 90°: 0 perfil derecha, 1 frente, 2 perfil izquierda, 3 espalda.
  const paso = ((Math.round(yaw / 90) % 4) + 4) % 4;
  const viewMode: PetView = paso === 1 ? 'frente' : paso === 3 ? 'espalda' : 'perfil';
  const facing: 1 | -1 = paso === 2 ? -1 : 1;

  return (
    <View style={{ width: size, height: size }} pointerEvents="none">
      <ProceduralPet
        size={size}
        breed={breed}
        pose={pose}
        viewMode={viewMode}
        facing={facing}
        lookX={lookX}
        lookY={lookY}
        squash={squash}
        stretch={stretch}
        uid={uid}
        clock={clock}
      />
    </View>
  );
}
