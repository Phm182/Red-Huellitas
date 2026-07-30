/**
 * Animaciones de cuerpo por acción.
 *
 * Cada acción es una función pura del progreso `t` (0→1) a una pose: qué hace
 * cada parte del cuerpo en ese instante. No hay emojis flotando en lugar de
 * animación — el animal se agacha, salta, se sacude, levanta la pata.
 *
 * El loop de render del controller ya corre a ~30fps, así que alcanza con
 * evaluar esto en cada frame a partir del tiempo transcurrido.
 */

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

export const IDLE_POSE: Pose = {
  bodyX: 0, bodyY: 0, bodyRot: 0, bodyScaleX: 1, bodyScaleY: 1,
  headX: 0, headY: 0, headRot: 0, earFlap: 0,
  mouthOpen: 0, eyeClose: 0, tailWag: 1, pawLift: 0, sit: 0,
  prop: null, propT: 0,
};

/** Duración de cada acción en ms. */
export const POSE_DURATION: Record<string, number> = {
  poke: 700,
  feed: 2400,
  play: 2400,
  bath: 2600,
  sleep: 3000,
  yawn: 1600,
  trickPaw: 2200,
  trickSpin: 1800,
  trickPlayDead: 2800,
  trickSuccess: 1600,
  trickFail: 1200,
  catchFood: 1800,
  guestArrive: 1600,
  guestPlay: 2400,
  guestSniff: 2000,
  guestIgnore: 1600,
};

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

/** Pose de la acción `trigger` en el instante `t` (0→1). */
export function poseFor(trigger: string, tRaw: number): Pose {
  const t = clamp01(tRaw);
  const p: Pose = { ...IDLE_POSE };

  switch (trigger) {
    // Toque: golpe corto de squash + orejas que saltan.
    case 'poke': {
      const k = pulse(t);
      p.bodyScaleY = 1 - k * 0.16;
      p.bodyScaleX = 1 + k * 0.14;
      p.bodyY = k * 3;
      p.earFlap = osc(t, 2) * 22;
      p.headRot = osc(t, 1.5) * 5;
      p.tailWag = 1 + k * 3;
      p.mouthOpen = k * 0.35;
      break;
    }

    // Comer: tres bocados hacia el plato, mastica, cola feliz.
    case 'feed': {
      const bites = 3;
      const phase = (t * bites) % 1;
      const down = pulse(phase);
      p.bodyRot = down * 5;
      p.bodyX = down * 3;
      p.headY = down * 15;
      p.headX = down * 5;
      p.headRot = down * 16;
      p.mouthOpen = t > 0.9 ? 0 : Math.abs(Math.sin(t * Math.PI * bites * 4)) * 0.75;
      p.bodyScaleY = 1 - down * 0.07;
      p.tailWag = 4;
      p.eyeClose = down * 0.45;
      p.prop = 'plato';
      p.propT = t;
      break;
    }

    // Jugar: tres saltos con aplastado al caer y la pelota rebotando.
    case 'play': {
      const jumps = 3;
      const phase = (t * jumps) % 1;
      const air = Math.sin(phase * Math.PI);
      p.bodyY = -air * 30;
      p.bodyRot = Math.sin(t * Math.PI * 2 * jumps) * 8;
      // Estirado en el aire, aplastado al tocar el piso.
      p.bodyScaleY = 1 + air * 0.14 - (phase > 0.92 || phase < 0.08 ? 0.16 : 0);
      p.bodyScaleX = 1 - air * 0.09 + (phase > 0.92 || phase < 0.08 ? 0.14 : 0);
      p.earFlap = -air * 34;
      p.headY = -air * 3;
      p.mouthOpen = 0.4 + air * 0.35;
      p.tailWag = 5;
      p.prop = 'pelota';
      p.propT = t;
      break;
    }

    // Bañarse: sacudida rápida de todo el cuerpo + gotas volando.
    case 'bath': {
      const shaking = t > 0.25 && t < 0.85;
      const s = shaking ? 1 : 0;
      p.bodyRot = osc(t, 9) * 15 * s;
      p.bodyX = osc(t, 9) * 5 * s;
      p.bodyScaleX = 1 + Math.abs(osc(t, 9)) * 0.09 * s;
      p.earFlap = osc(t, 9) * 55 * s;
      p.headRot = osc(t, 9) * -12 * s;
      p.eyeClose = hold(t, 0.15, 0.85) * 0.9;
      p.mouthOpen = 0.25;
      p.tailWag = 3;
      p.prop = 'agua';
      p.propT = t;
      break;
    }

    // Dormir: se hunde, cierra los ojos, respira lento.
    case 'sleep': {
      const settle = hold(t, 0.28, 0.92);
      p.sit = settle;
      p.bodyY = settle * 12;
      p.bodyScaleY = 1 - settle * 0.2 + Math.sin(t * Math.PI * 6) * 0.02 * settle;
      p.bodyScaleX = 1 + settle * 0.12;
      p.headY = settle * 14;
      p.headRot = settle * -14;
      p.eyeClose = clamp01(settle * 1.4);
      p.tailWag = 1 - settle * 0.9;
      p.prop = 'zzz';
      p.propT = t;
      break;
    }

    // Bostezo: cabeza hacia atrás, boca enorme, ojos apretados.
    case 'yawn': {
      const k = pulse(t);
      p.headRot = -k * 20;
      p.headY = -k * 5;
      p.mouthOpen = k;
      p.eyeClose = k * 0.85;
      p.bodyScaleY = 1 + k * 0.06;
      p.tailWag = 0.4;
      break;
    }

    // Dar la pata: se sienta y sostiene la pata en el aire.
    case 'trickPaw': {
      const sitK = hold(t, 0.25, 0.85);
      p.sit = sitK;
      p.bodyY = sitK * 10;
      p.bodyRot = sitK * -6;
      p.pawLift = hold(t, 0.4, 0.82);
      p.headRot = sitK * 10;
      p.headY = sitK * -2;
      p.tailWag = 3;
      p.mouthOpen = 0.3;
      break;
    }

    // Dar una vuelta: giro completo con saltito.
    case 'trickSpin': {
      p.bodyRot = t * 360;
      const air = Math.sin(t * Math.PI);
      p.bodyY = -air * 16;
      p.bodyScaleY = 1 + air * 0.08;
      p.earFlap = -air * 30;
      p.tailWag = 4;
      p.mouthOpen = 0.45;
      break;
    }

    // Hacerse el muerto: se tumba de costado y espía al final.
    case 'trickPlayDead': {
      const fall = hold(t, 0.22, 0.88);
      p.bodyRot = fall * 84;
      p.bodyY = fall * 26;
      p.bodyX = fall * -10;
      p.sit = fall;
      p.eyeClose = t > 0.75 && t < 0.85 ? 0.2 : fall;
      p.tailWag = 1 - fall;
      p.mouthOpen = fall * 0.2;
      p.headRot = fall * -10;
      break;
    }

    // Logro: dos saltos y estrellas.
    case 'trickSuccess': {
      const jumps = 2;
      const phase = (t * jumps) % 1;
      const air = Math.sin(phase * Math.PI);
      p.bodyY = -air * 26;
      p.bodyScaleY = 1 + air * 0.12;
      p.bodyRot = osc(t, 2) * 10;
      p.earFlap = -air * 28;
      p.mouthOpen = 0.6;
      p.tailWag = 6;
      p.prop = 'estrellas';
      p.propT = t;
      break;
    }

    case 'trickFail': {
      p.headRot = osc(t, 3) * 14;
      p.bodyY = hold(t, 0.3, 0.7) * 5;
      p.eyeClose = hold(t, 0.3, 0.7) * 0.4;
      p.tailWag = 0.2;
      p.prop = 'nube';
      p.propT = t;
      break;
    }

    // Atrapar comida: salto alto con la boca abierta y mordida.
    case 'catchFood': {
      const air = Math.sin(t * Math.PI);
      p.bodyY = -air * 34;
      p.bodyRot = air * -8;
      p.bodyScaleY = 1 + air * 0.16;
      p.bodyScaleX = 1 - air * 0.1;
      p.headY = -air * 6;
      p.headRot = -air * 14;
      p.mouthOpen = t < 0.55 ? 0.9 : 0.1;
      p.earFlap = -air * 32;
      p.tailWag = 5;
      p.prop = 'hueso';
      p.propT = t;
      break;
    }

    // Llega la visita: se endereza, orejas arriba, saltito de saludo.
    case 'guestArrive': {
      const k = hold(t, 0.2, 0.7);
      p.earFlap = -k * 18;
      p.bodyY = -pulse(t) * 12;
      p.headRot = k * 8;
      p.headY = -k * 3;
      p.mouthOpen = k * 0.5;
      p.tailWag = 5;
      break;
    }

    case 'guestPlay': {
      const jumps = 3;
      const phase = (t * jumps) % 1;
      const air = Math.sin(phase * Math.PI);
      p.bodyY = -air * 20;
      p.bodyX = hold(t, 0.2, 0.8) * 14;
      p.bodyRot = osc(t, 3) * 9;
      p.mouthOpen = 0.55;
      p.tailWag = 6;
      p.prop = 'corazon';
      p.propT = t;
      break;
    }

    case 'guestSniff': {
      const k = hold(t, 0.25, 0.8);
      p.bodyX = k * 16;
      p.bodyRot = k * 8;
      p.headY = k * 16;
      p.headX = k * 8;
      p.headRot = k * 20;
      p.mouthOpen = 0.15;
      p.eyeClose = k * 0.3;
      p.tailWag = 2.5;
      break;
    }

    case 'guestIgnore': {
      const k = hold(t, 0.25, 0.8);
      p.headRot = k * -26;
      p.headX = k * -8;
      p.bodyRot = k * -5;
      p.eyeClose = k * 0.55;
      p.tailWag = 0.3;
      break;
    }

    default: {
      const k = pulse(t);
      p.bodyScaleY = 1 - k * 0.08;
      p.bodyScaleX = 1 + k * 0.07;
      p.tailWag = 1 + k * 2;
      break;
    }
  }

  return p;
}

/**
 * Pose de reposo: respiración, parpadeo y micro-movimientos según el rasgo.
 * `fidget` viene de los modificadores de personalidad (un hiperactivo se mueve
 * mucho más que un perezoso).
 */
export function idlePose(tSec: number, opts: {
  fidget: number;
  sleeping: boolean;
  sad: boolean;
  happy: boolean;
}): Pose {
  const p: Pose = { ...IDLE_POSE };
  const breath = Math.sin(tSec * 1.5);
  p.bodyScaleY = 1 + breath * 0.022;
  p.bodyScaleX = 1 - breath * 0.016;
  p.bodyY = Math.sin(tSec * 1.5 + 0.4) * 1.4;

  if (opts.sleeping) {
    p.sit = 1;
    p.bodyY += 12;
    p.bodyScaleY = 1 - 0.18 + breath * 0.03;
    p.bodyScaleX = 1.12;
    p.headY = 14;
    p.headRot = -14;
    p.eyeClose = 1;
    p.tailWag = 0.1;
    p.prop = 'zzz';
    p.propT = (tSec * 0.35) % 1;
    return p;
  }

  // Parpadeo: cada ~4s, 120ms cerrado.
  const blinkCycle = tSec % 4;
  p.eyeClose = blinkCycle < 0.12 ? 1 : 0;

  // Fidget: mira alrededor y mueve las orejas de a ratos.
  const f = opts.fidget;
  p.headRot = Math.sin(tSec * 0.7) * 5 * f;
  p.headX = Math.sin(tSec * 0.5) * 2.5 * f;
  p.earFlap = Math.sin(tSec * 2.3) * 6 * f;

  if (opts.happy) {
    p.tailWag = 3.2;
    p.mouthOpen = 0.3 + Math.sin(tSec * 2) * 0.08;
    // Saltito cada ~3s.
    const hopPhase = (tSec % 3) / 3;
    if (hopPhase < 0.18) p.bodyY -= Math.sin((hopPhase / 0.18) * Math.PI) * 8;
  } else if (opts.sad) {
    p.tailWag = 0.15;
    p.headY = 5;
    p.headRot = -4;
    p.eyeClose = Math.max(p.eyeClose, 0.3);
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
    prop: action.prop ?? base.prop,
    propT: action.prop ? action.propT : base.propT,
  };
}
