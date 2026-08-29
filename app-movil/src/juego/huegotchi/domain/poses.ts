/**
 * Animaciones de cuerpo por acción.
 *
 * Cada acción es una función pura del progreso `t` (0→1) a una pose. Las
 * duraciones son largas a propósito: dormir, comer o bañarse tienen que
 * leerse como una escena, no como un tic de 1 segundo.
 */

import { HueSpecies } from './types';

export type Pose = {
  /** Desplazamiento del animal completo, en unidades del viewBox 200x200. */
  bodyX: number;
  bodyY: number;
  /** Rotación del animal completo en grados. */
  bodyRot: number;
  bodyScaleX: number;
  bodyScaleY: number;
  /** Cabeza relativa al cuerpo. */
  headX: number;
  headY: number;
  headRot: number;
  /** Rotación extra de las orejas (aletean al sacudirse / saltar). */
  earFlap: number;
  /** 0 = cerrada … 1 = abierta de par en par. */
  mouthOpen: number;
  /** 0 = ojos abiertos … 1 = cerrados. */
  eyeClose: number;
  /** Intensidad del movimiento de cola (multiplica la velocidad base). */
  tailWag: number;
  /** Cuánto se levanta la pata delantera izquierda (0→1). */
  pawLift: number;
  /** 0 = parado … 1 = sentado (patas traseras plegadas). */
  sit: number;
  /** 0 = erguido … 1 = acostado de costado. */
  lie: number;
  /** Utilería en escena durante la acción. */
  prop: PropKind | null;
  /** Progreso propio de la utilería (para animarla aparte). */
  propT: number;
};

export type PropKind =
  | 'plato'
  | 'pelota'
  | 'agua'
  | 'zzz'
  | 'estrellas'
  | 'corazon'
  | 'nube'
  | 'hueso';

/** Postura sostenida hasta que el usuario mande otra cosa. */
export type HeldStance = 'none' | 'sit' | 'lie' | 'sleep';

/** Orientación de cámara del personaje. */
export type PetView = 'perfil' | 'frente' | 'espalda';

export const IDLE_POSE: Pose = {
  bodyX: 0, bodyY: 0, bodyRot: 0, bodyScaleX: 1, bodyScaleY: 1,
  headX: 0, headY: 0, headRot: 0, earFlap: 0,
  mouthOpen: 0, eyeClose: 0, tailWag: 1, pawLift: 0, sit: 0, lie: 0,
  prop: null, propT: 0,
};

/**
 * Duraciones en ms. Dormir es largo a propósito: el animal se acuesta y se
 * queda así un rato; el controller además bloquea interacciones.
 */
export const POSE_DURATION: Record<string, number> = {
  poke: 900,
  feed: 4200,
  play: 4800,
  bath: 5000,
  sleep: 16000,
  yawn: 2200,
  pet: 2800,
  scratch: 3200,
  speak: 600,
  sitDown: 1800,
  lieDown: 2200,
  standUp: 1400,
  trickPaw: 3600,
  trickSit: 2000,
  trickSpin: 3200,
  trickPlayDead: 5000,
  trickSuccess: 2200,
  trickFail: 1600,
  catchFood: 2600,
  guestArrive: 2200,
  guestPlay: 3600,
  guestSniff: 2800,
  guestIgnore: 2200,
};

/** Cuánto tiempo mínimo queda dormido (bloquea taps / acciones). */
export const SLEEP_LOCK_MS = 14000;

export function poseDuration(trigger: string): number {
  return POSE_DURATION[trigger] ?? 900;
}

// ------------------------------------------------------------------ easings
const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
/** Sube y baja una vez (0→1→0). */
const pulse = (t: number) => Math.sin(clamp01(t) * Math.PI);
/** Oscilación de n ciclos que arranca y termina en 0. */
const osc = (t: number, cycles: number) => Math.sin(clamp01(t) * Math.PI * 2 * cycles) * pulse(t);
/** Rampa que sube, se queda, y baja. */
const hold = (t: number, up = 0.2, down = 0.75) => {
  if (t < up) return t / up;
  if (t > down) return clamp01(1 - (t - down) / (1 - down));
  return 1;
};
/** Sube y se queda hasta el final (sin bajar). */
const settle = (t: number, up = 0.22) => (t < up ? t / up : 1);

/** Pose de la acción `trigger` en el instante `t` (0→1). */
export function poseFor(trigger: string, tRaw: number): Pose {
  const t = clamp01(tRaw);
  const p: Pose = { ...IDLE_POSE };

  switch (trigger) {
    case 'poke': {
      const k = pulse(t);
      p.bodyScaleY = 1 - k * 0.12;
      p.bodyScaleX = 1 + k * 0.1;
      p.bodyY = k * 2;
      p.earFlap = osc(t, 2) * 18;
      p.headRot = osc(t, 1.5) * 5;
      p.tailWag = 1 + k * 2.5;
      p.mouthOpen = k * 0.25;
      break;
    }

    case 'feed': {
      const bites = 4;
      const phase = (t * bites) % 1;
      const down = pulse(phase);
      p.sit = hold(t, 0.12, 0.92) * 0.35;
      p.bodyRot = down * 8;
      p.bodyX = down * 4;
      p.headY = down * 18;
      p.headX = down * 6;
      p.headRot = down * 18;
      p.mouthOpen = t > 0.92 ? 0 : Math.abs(Math.sin(t * Math.PI * bites * 3)) * 0.8;
      p.bodyScaleY = 1 - down * 0.06;
      p.tailWag = 3.5;
      p.eyeClose = down * 0.4;
      p.prop = 'plato';
      p.propT = t;
      break;
    }

    case 'play': {
      const jumps = 4;
      const phase = (t * jumps) % 1;
      const air = Math.sin(phase * Math.PI);
      // Saltos más bajos: si van a -30 se cortan contra el borde del stage.
      p.bodyY = -air * 16;
      p.bodyRot = Math.sin(t * Math.PI * 2 * jumps) * 7;
      p.bodyScaleY = 1 + air * 0.1 - (phase > 0.92 || phase < 0.08 ? 0.1 : 0);
      p.bodyScaleX = 1 - air * 0.07 + (phase > 0.92 || phase < 0.08 ? 0.1 : 0);
      p.earFlap = -air * 28;
      p.headY = -air * 2;
      p.mouthOpen = 0.35 + air * 0.3;
      p.tailWag = 5;
      p.prop = 'pelota';
      p.propT = t;
      break;
    }

    case 'bath': {
      const shaking = t > 0.18 && t < 0.82;
      const s = shaking ? 1 : 0;
      p.bodyRot = osc(t, 11) * 12 * s;
      p.bodyX = osc(t, 11) * 4 * s;
      p.bodyScaleX = 1 + Math.abs(osc(t, 11)) * 0.07 * s;
      p.earFlap = osc(t, 11) * 48 * s;
      p.headRot = osc(t, 11) * -10 * s;
      p.eyeClose = hold(t, 0.12, 0.88) * 0.85;
      p.mouthOpen = 0.2;
      p.tailWag = 2.5;
      p.prop = 'agua';
      p.propT = t;
      break;
    }

    // Dormir: se sienta → se tumba al piso (lie), sin rotar el dibujo en vertical.
    case 'sleep': {
      const down = settle(t, 0.18);
      const tumba = settle(Math.max(0, (t - 0.12) / 0.28), 1);
      p.sit = down * (1 - tumba * 0.55);
      p.lie = tumba;
      p.bodyRot = 0;
      p.bodyY = tumba * 2;
      p.bodyScaleY = 1 - tumba * 0.08 + Math.sin(t * Math.PI * 8) * 0.012 * tumba;
      p.bodyScaleX = 1 + tumba * 0.06;
      p.headY = tumba * 4;
      p.headRot = tumba * -8;
      p.eyeClose = clamp01(down * 1.5);
      p.tailWag = 0.08;
      p.mouthOpen = 0;
      p.prop = 'zzz';
      p.propT = t;
      break;
    }

    case 'yawn': {
      const k = pulse(t);
      p.headRot = -k * 18;
      p.headY = -k * 4;
      p.mouthOpen = k;
      p.eyeClose = k * 0.85;
      p.bodyScaleY = 1 + k * 0.05;
      p.tailWag = 0.4;
      break;
    }

    // Acariciar: se inclina hacia la mano, ojos entrecerrados, cola suave.
    case 'pet': {
      const k = hold(t, 0.2, 0.85);
      p.headRot = k * 12;
      p.headY = k * 4;
      p.bodyRot = k * 4;
      p.eyeClose = k * 0.55;
      p.earFlap = -k * 8;
      p.tailWag = 2.2;
      p.mouthOpen = k * 0.15;
      p.prop = 'corazon';
      p.propT = t;
      break;
    }

    // Rascarse / estirarse suave (sin salir del marco).
    case 'scratch': {
      const k = hold(t, 0.18, 0.82);
      p.sit = k * 0.45;
      p.bodyY = k * 6;
      p.pawLift = hold(t, 0.3, 0.75);
      p.headRot = osc(t, 3) * 8 * k;
      p.earFlap = osc(t, 4) * 12 * k;
      p.tailWag = 1.5;
      p.eyeClose = k * 0.25;
      break;
    }

    // Hablar / ladrar / maullar: la boca la mueve el sync de audio;
    // acá sólo un empujoncito de cuerpo.
    case 'speak': {
      const k = pulse(t);
      p.bodyScaleY = 1 - k * 0.04;
      p.headY = -k * 2;
      p.earFlap = -k * 6;
      p.tailWag = 1 + k;
      break;
    }

    case 'sitDown':
    case 'trickSit': {
      const k = settle(t, 0.35);
      p.sit = k;
      p.bodyY = k * 10;
      p.bodyRot = k * -5;
      p.headRot = k * 6;
      p.tailWag = 2;
      p.mouthOpen = k * 0.2;
      break;
    }

    case 'lieDown': {
      const k = settle(t, 0.4);
      p.sit = k * 0.35;
      p.lie = k;
      p.bodyRot = 0;
      p.bodyY = k * 2;
      p.headRot = k * -6;
      p.eyeClose = k * 0.35;
      p.tailWag = 0.35;
      break;
    }

    case 'standUp': {
      const k = 1 - settle(t, 0.4);
      p.sit = k * 0.8;
      p.lie = k;
      p.bodyY = k * 1;
      p.bodyRot = 0;
      break;
    }

    case 'trickPaw': {
      const sitK = settle(t, 0.28);
      p.sit = sitK;
      p.bodyY = 0;
      p.bodyRot = 0;
      p.pawLift = hold(t, 0.35, 0.88);
      p.headRot = sitK * 8;
      p.tailWag = 3;
      p.mouthOpen = 0.2;
      break;
    }

    case 'trickSpin': {
      // El giro 360° lo hace el yaw del modelo 3D (controller); acá un saltito.
      const air = Math.sin(t * Math.PI);
      p.bodyY = -air * 8;
      p.bodyScaleY = 1 + air * 0.05;
      p.earFlap = -air * 20;
      p.tailWag = 4;
      p.mouthOpen = 0.35;
      break;
    }

    case 'trickPlayDead': {
      const fall = settle(t, 0.28);
      p.bodyRot = 0;
      p.bodyY = fall * 2;
      p.sit = fall * 0.3;
      p.lie = fall;
      p.eyeClose = t > 0.7 && t < 0.82 ? 0.15 : fall * 0.95;
      p.tailWag = 1 - fall;
      p.mouthOpen = fall * 0.1;
      p.headRot = fall * -6;
      break;
    }

    case 'trickSuccess': {
      const jumps = 2;
      const phase = (t * jumps) % 1;
      const air = Math.sin(phase * Math.PI);
      p.bodyY = -air * 14;
      p.bodyScaleY = 1 + air * 0.1;
      p.bodyRot = osc(t, 2) * 8;
      p.earFlap = -air * 22;
      p.mouthOpen = 0.55;
      p.tailWag = 5;
      p.prop = 'estrellas';
      p.propT = t;
      break;
    }

    case 'trickFail': {
      // Sacude la cabeza, orejas caídas, se encoge: frustración clara.
      const shake = Math.sin(t * Math.PI * 7) * (1 - t);
      p.headRot = shake * 22;
      p.headY = hold(t, 0.15, 0.85) * 3;
      p.earFlap = 26 + Math.abs(shake) * 10;
      p.bodyY = hold(t, 0.2, 0.85) * 7;
      p.bodyScaleY = 1 - hold(t, 0.15, 0.75) * 0.1;
      p.bodyScaleX = 1 + hold(t, 0.15, 0.75) * 0.06;
      p.eyeClose = 0.4 + osc(t, 2) * 0.12;
      p.mouthOpen = 0.12;
      p.tailWag = 0.12;
      p.prop = 'nube';
      p.propT = t;
      break;
    }

    case 'catchFood': {
      const air = Math.sin(t * Math.PI);
      p.bodyY = -air * 18;
      p.bodyRot = air * -6;
      p.bodyScaleY = 1 + air * 0.1;
      p.bodyScaleX = 1 - air * 0.07;
      p.headY = -air * 4;
      p.headRot = -air * 12;
      p.mouthOpen = t < 0.55 ? 0.9 : 0.1;
      p.earFlap = -air * 26;
      p.tailWag = 4;
      p.prop = 'hueso';
      p.propT = t;
      break;
    }

    case 'guestArrive': {
      const k = hold(t, 0.2, 0.75);
      p.earFlap = -k * 16;
      p.bodyY = -pulse(t) * 8;
      p.headRot = k * 8;
      p.mouthOpen = k * 0.45;
      p.tailWag = 5;
      break;
    }

    case 'guestPlay': {
      const jumps = 3;
      const phase = (t * jumps) % 1;
      const air = Math.sin(phase * Math.PI);
      p.bodyY = -air * 12;
      p.bodyX = hold(t, 0.2, 0.8) * 12;
      p.bodyRot = osc(t, 3) * 7;
      p.mouthOpen = 0.5;
      p.tailWag = 5;
      p.prop = 'corazon';
      p.propT = t;
      break;
    }

    case 'guestSniff': {
      const k = hold(t, 0.25, 0.8);
      p.bodyX = k * 14;
      p.bodyRot = k * 7;
      p.headY = k * 14;
      p.headX = k * 6;
      p.headRot = k * 18;
      p.mouthOpen = 0.12;
      p.eyeClose = k * 0.25;
      p.tailWag = 2.2;
      break;
    }

    case 'guestIgnore': {
      const k = hold(t, 0.25, 0.8);
      p.headRot = k * -22;
      p.headX = k * -6;
      p.bodyRot = k * -4;
      p.eyeClose = k * 0.5;
      p.tailWag = 0.3;
      break;
    }

    default: {
      const k = pulse(t);
      p.bodyScaleY = 1 - k * 0.06;
      p.bodyScaleX = 1 + k * 0.05;
      p.tailWag = 1 + k * 1.5;
      break;
    }
  }

  return p;
}

/**
 * Pose de reposo: respiración, parpadeo y micro-movimientos.
 * Si hay una postura sostenida (sentado / acostado / dormido), la mantiene.
 */
export function idlePose(tSec: number, opts: {
  fidget: number;
  sleeping: boolean;
  sad: boolean;
  happy: boolean;
  held?: HeldStance;
}): Pose {
  const p: Pose = { ...IDLE_POSE };
  const breath = Math.sin(tSec * 1.5);
  p.bodyScaleY = 1 + breath * 0.022;
  p.bodyScaleX = 1 - breath * 0.016;
  p.bodyY = Math.sin(tSec * 1.5 + 0.4) * 1.4;

  const held = opts.held ?? (opts.sleeping ? 'sleep' : 'none');

  if (held === 'sleep' || opts.sleeping) {
    p.sit = 0.25;
    p.lie = 1;
    p.bodyRot = 0;
    p.bodyY = 2;
    p.bodyScaleY = 1 - 0.06 + breath * 0.02;
    p.bodyScaleX = 1.05;
    p.headY = 3;
    p.headRot = -6;
    p.eyeClose = 1;
    p.tailWag = 0.08;
    p.prop = 'zzz';
    p.propT = (tSec * 0.28) % 1;
    return p;
  }

  if (held === 'lie') {
    p.sit = 0.3;
    p.lie = 1;
    p.bodyRot = 0;
    p.bodyY = 2;
    p.headRot = -4;
    p.eyeClose = 0.25;
    p.tailWag = 0.35;
    return p;
  }

  if (held === 'sit') {
    p.sit = 1;
    p.bodyY = 0;
    p.bodyRot = 0;
    p.headRot = 4;
    p.tailWag = 1.6;
    p.eyeClose = 0.85;
    p.headRot += Math.sin(tSec * 0.6) * 4 * opts.fidget;
    return p;
  }

  // Parpadeo / ojos felices: el chibi por defecto lleva ojitos cerrados
  // (como la ref). Sólo se abren un instante al parpadear "al revés".
  const blinkCycle = tSec % 5.5;
  const eyesOpenFlash = blinkCycle > 4.9 && blinkCycle < 5.15;
  p.eyeClose = eyesOpenFlash ? 0 : 0.85;

  const f = opts.fidget;
  p.headRot = Math.sin(tSec * 0.7) * 5 * f;
  p.headX = Math.sin(tSec * 0.5) * 2.5 * f;
  p.earFlap = Math.sin(tSec * 2.3) * 6 * f;

  if (opts.happy) {
    p.tailWag = 3.2;
    p.mouthOpen = 0.15 + Math.sin(tSec * 2) * 0.04;
    p.eyeClose = 0.9;
    const hopPhase = (tSec % 3.4) / 3.4;
    if (hopPhase < 0.14) p.bodyY -= Math.sin((hopPhase / 0.14) * Math.PI) * 5;
  } else if (opts.sad) {
    p.tailWag = 0.15;
    p.headY = 5;
    p.headRot = -4;
    p.eyeClose = 0.35;
    p.bodyY += 3;
  } else {
    p.tailWag = 1.2;
  }

  return p;
}

/** Mezcla la pose de acción sobre la de reposo. */
export function blendPose(base: Pose, action: Pose | null, weight: number): Pose {
  if (!action || weight <= 0) return base;
  const w = clamp01(weight);
  const mix = (a: number, b: number) => a + (b - a) * w;
  return {
    bodyX: mix(base.bodyX, action.bodyX),
    bodyY: mix(base.bodyY, action.bodyY),
    bodyRot: mix(base.bodyRot, action.bodyRot),
    bodyScaleX: mix(base.bodyScaleX, action.bodyScaleX),
    bodyScaleY: mix(base.bodyScaleY, action.bodyScaleY),
    headX: mix(base.headX, action.headX),
    headY: mix(base.headY, action.headY),
    headRot: mix(base.headRot, action.headRot),
    earFlap: mix(base.earFlap, action.earFlap),
    mouthOpen: mix(base.mouthOpen, action.mouthOpen),
    eyeClose: mix(base.eyeClose, action.eyeClose),
    tailWag: mix(base.tailWag, action.tailWag),
    pawLift: mix(base.pawLift, action.pawLift),
    sit: mix(base.sit, action.sit),
    lie: mix(base.lie, action.lie),
    prop: action.prop ?? base.prop,
    propT: action.prop ? action.propT : base.propT,
  };
}

/**
 * Envolvente de boca sincronizada con la duración del audio.
 * `species`: el perro jadea (boca más abierta); el gato maúlla con
 * apertura más chica. El resto de las especies no tienen voz propia
 * todavía (ver `VOICE_ASSETS` en `PetVoiceEngine.ts`), así que caen al
 * caso genérico.
 */
export function mouthFromVoice(
  elapsedMs: number,
  durationMs: number,
  species?: HueSpecies
): number {
  if (durationMs <= 0 || elapsedMs < 0 || elapsedMs > durationMs) return 0;
  const t = elapsedMs / durationMs;
  const attack = Math.min(1, elapsedMs / 55);
  const release = t > 0.72 ? clamp01(1 - (t - 0.72) / 0.28) : 1;
  const chatter =
    species === 'gato'
      ? 0.4 + 0.35 * Math.abs(Math.sin(elapsedMs / 70))
      : 0.55 + 0.45 * Math.abs(Math.sin(elapsedMs / 55));
  const peak = species === 'gato' ? 0.75 : species === 'perro' ? 1 : 0.5;
  return clamp01(attack * release * chatter * peak);
}

/** Pose de acción con matices por especie (boca / expresión). */
export function poseForSpecies(
  trigger: string,
  t: number,
  species: HueSpecies
): Pose {
  const p = poseFor(trigger, t);
  if (species === 'gato') {
    // Gato: maullido = boca moderada, sin exagerar; cola más expresiva.
    if (trigger === 'speak' || trigger === 'poke') {
      p.mouthOpen = Math.min(p.mouthOpen, 0.55);
      p.tailWag = Math.max(p.tailWag, 1.8);
    }
    if (trigger === 'play') {
      p.mouthOpen = Math.min(p.mouthOpen, 0.4);
      p.earFlap *= 1.2;
    }
    if (trigger === 'scratch') {
      p.pawLift = Math.max(p.pawLift, 0.7);
    }
  } else if (species === 'perro') {
    if (trigger === 'speak' || trigger === 'play' || trigger === 'trickSuccess') {
      p.mouthOpen = Math.max(p.mouthOpen, 0.55);
    }
    if (trigger === 'feed') {
      p.tailWag = Math.max(p.tailWag, 4);
    }
  } else if (species === 'tortuga') {
    p.mouthOpen *= 0.2;
    p.tailWag = 0;
    p.pawLift = 0;
    p.bodyY *= 0.3;
  }
  return p;
}
