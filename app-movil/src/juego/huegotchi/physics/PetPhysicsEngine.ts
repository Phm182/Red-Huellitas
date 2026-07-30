/**
 * Física clay: Hooke + damping (squash/stretch) y look-at con lerp.
 */

export type Vec2 = { x: number; y: number };

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export const LOOK_LERP = 0.16;

/** Resorte: x'' = -k*x - c*x'  (semi-implícito Euler). */
export class Spring1D {
  value: number;
  velocity: number;
  readonly target: { current: number };
  k: number;
  c: number;

  constructor(initial = 1, k = 180, c = 18) {
    this.value = initial;
    this.velocity = 0;
    this.target = { current: initial };
    this.k = k;
    this.c = c;
  }

  setTarget(t: number) {
    this.target.current = t;
  }

  impulse(v: number) {
    this.velocity += v;
  }

  step(dt: number) {
    const x = this.value - this.target.current;
    const a = -this.k * x - this.c * this.velocity;
    this.velocity += a * dt;
    this.value += this.velocity * dt;
  }
}

export class PetPhysicsEngine {
  look = { x: 0, y: 0 };
  lookTarget = { x: 0, y: 0 };
  squash = new Spring1D(1, 220, 22);
  stretch = new Spring1D(1, 220, 22);
  isDragging = false;

  setLookTarget(nx: number, ny: number) {
    this.lookTarget.x = clamp(nx, -1, 1);
    this.lookTarget.y = clamp(ny, -1, 1);
  }

  /** Coordenadas página → look local respecto al centro del stage. */
  lookFromPage(
    pageX: number,
    pageY: number,
    stage: { x: number; y: number; w: number; h: number }
  ) {
    const cx = stage.x + stage.w / 2;
    const cy = stage.y + stage.h / 2;
    const nx = (pageX - cx) / Math.max(1, stage.w / 2);
    const ny = (pageY - cy) / Math.max(1, stage.h / 2);
    this.setLookTarget(nx, ny);
  }

  onTap() {
    // Impulsos más suaves: el squash extremo sacaba al animal del marco.
    this.squash.impulse(-2.8);
    this.stretch.impulse(2.6);
    this.squash.setTarget(0.95);
    this.stretch.setTarget(1.05);
    setTimeout(() => {
      this.squash.setTarget(1);
      this.stretch.setTarget(1);
    }, 90);
  }

  onDrag(dx: number, dy: number) {
    this.isDragging = true;
    const mag = clamp(Math.hypot(dx, dy) / 160, 0, 1);
    if (Math.abs(dx) >= Math.abs(dy)) {
      this.stretch.setTarget(1 + mag * 0.09);
      this.squash.setTarget(1 - mag * 0.07);
    } else {
      this.squash.setTarget(1 + mag * 0.08);
      this.stretch.setTarget(1 - mag * 0.06);
    }
  }

  onDragEnd() {
    this.isDragging = false;
    this.squash.impulse(-1.4);
    this.stretch.impulse(1.5);
    this.squash.setTarget(1);
    this.stretch.setTarget(1);
  }

  step(dt: number) {
    const t = clamp(dt, 0.008, 0.033);
    this.look.x = lerp(this.look.x, this.lookTarget.x, LOOK_LERP);
    this.look.y = lerp(this.look.y, this.lookTarget.y, LOOK_LERP);
    this.squash.step(t);
    this.stretch.step(t);
  }

  snapshot() {
    return {
      lookX: this.look.x,
      lookY: this.look.y,
      squash: clamp(this.squash.value, 0.9, 1.1),
      stretch: clamp(this.stretch.value, 0.9, 1.1),
      isDragging: this.isDragging,
    };
  }
}
