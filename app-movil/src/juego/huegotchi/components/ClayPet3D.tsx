/**
 * ClayPet3D — un solo animal de “arcilla” 3D proyectado a 2D.
 *
 * No cambia de dibujo al girar: las mismas partes (elipsoides) se proyectan
 * con yaw 0…2π. Impacto: ~25–40 elipses/frame, barato en CPU; sin VRAM extra
 * (SVG). Si más adelante quieren PBR/meshes reales: expo-gl + three.
 */

import React, { useMemo } from 'react';
import Svg, {
  Circle,
  Defs,
  Ellipse,
  G,
  LinearGradient,
  Path,
  RadialGradient,
  Stop,
} from 'react-native-svg';
import { ResolvedBreed } from '../domain/breeds';
import { Pose } from '../domain/poses';

export type ClayPet3DProps = {
  size: number;
  breed: ResolvedBreed;
  pose: Pose;
  /** Ángulo horizontal en radianes (arrastre del usuario). */
  yaw: number;
  lookX?: number;
  lookY?: number;
  squash?: number;
  stretch?: number;
  uid?: string;
  clock: number;
};

type Vec3 = { x: number; y: number; z: number };

type Part = {
  id: string;
  p: Vec3;
  rx: number;
  ry: number;
  rz: number;
  color: string;
  opacity?: number;
  /** Si true, es un ojo/nariz/boca (no se escala con fluff). */
  feature?: boolean;
};

const GROUND = 150;
const CX = 100;

function shade(hex: string, amount: number): string {
  const c = hex.replace('#', '');
  const full = c.length === 3 ? c.split('').map((x) => x + x).join('') : c;
  const num = parseInt(full, 16);
  if (Number.isNaN(num)) return hex;
  const r = Math.max(0, Math.min(255, ((num >> 16) & 255) + amount));
  const g = Math.max(0, Math.min(255, ((num >> 8) & 255) + amount));
  const b = Math.max(0, Math.min(255, (num & 255) + amount));
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

function project(p: Vec3, yaw: number): { x: number; y: number; depth: number; sx: number } {
  const c = Math.cos(yaw);
  const s = Math.sin(yaw);
  const x = p.x * c - p.z * s;
  const depth = p.x * s + p.z * c;
  // Foreshortening suave del radio según profundidad.
  const sx = 1 + depth * 0.0022;
  return { x: CX + x, y: p.y, depth, sx };
}

function lit(base: string, depth: number, yaw: number, nx = 0): string {
  // Luz fija desde arriba-izquierda del mundo.
  const light = Math.cos(yaw) * 0.15 + nx * 0.2 - depth * 0.004;
  return shade(base, Math.round(light * 40 - 8));
}

export function ClayPet3D({
  size,
  breed: b,
  pose,
  yaw,
  lookX = 0,
  lookY = 0,
  squash = 0,
  stretch = 0,
  uid = 'p',
  clock,
}: ClayPet3DProps) {
  const esGato = b.species === 'gato';
  const esPerro = b.species === 'perro';
  const esTortuga = b.species === 'tortuga';

  const parts = useMemo(() => {
    const S = b.scale * 0.92;
    const sit = pose.sit;
    const lie = pose.lie ?? 0;

    // --- Esqueleto en espacio local (X = largo, Y = arriba, Z = ancho) ---
    // El animal mira +X. Patas tocan Y = GROUND.
    const legH = (14 + 22 * b.legLength) * S * (1 - sit * 0.55) * (1 - lie * 0.85);
    const bodyLen = 28 * b.bodyLength * S;
    const bodyH = 18 * b.bodyHeight * S * (1 - lie * 0.55);
    const bodyW = 14 * b.bodyWidth * S;
    const headR = 11 * b.headSize * S;

    // Acostarse = bajar el torso al piso y aplastar (NO rotar 90° en pantalla).
    const bellyY = GROUND - legH - bodyH * 0.35 * (1 - lie) - lie * (bodyW * 0.35);
    const chest: Vec3 = {
      x: pose.bodyX * 0.3,
      y: bellyY + pose.bodyY,
      z: 0,
    };
    // Al acostarse el cuerpo se “tira” de costado en Z local (queda horizontal).
    const lieRoll = lie * 1.15; // rad approx for offsetting parts
    const rump: Vec3 = {
      x: chest.x - bodyLen * (0.85 - lie * 0.1),
      y: chest.y + sit * bodyH * 0.35 + lie * 2,
      z: lie * bodyW * 0.15,
    };
    const head: Vec3 = {
      x: chest.x + bodyLen * 0.55 + pose.headX * 0.4,
      y: chest.y - bodyH * 0.55 - headR * 0.35 + pose.headY * 0.35 - sit * 2,
      z: pose.headX * 0.15 + lookX * 2,
    };

    const dark = shade(b.base, -28);
    const light = shade(b.base, 22);
    const out: Part[] = [];

    const add = (part: Part) => out.push(part);

    if (esTortuga) {
      const shellY = GROUND - 18 * S + pose.bodyY;
      add({ id: 'shell', p: { x: 0, y: shellY, z: 0 }, rx: 32 * S, ry: 20 * S, rz: 26 * S, color: b.base });
      add({ id: 'belly', p: { x: 0, y: shellY + 8 * S, z: 0 }, rx: 24 * S, ry: 6 * S, rz: 18 * S, color: b.belly });
      add({ id: 'head', p: { x: 28 * S, y: shellY - 4 * S, z: 0 }, rx: 9 * S, ry: 8 * S, rz: 8 * S, color: light });
      for (const [lx, lz] of [[-14, -12], [-14, 12], [10, -14], [10, 14]] as const) {
        add({
          id: `leg${lx}${lz}`,
          p: { x: lx * S, y: GROUND - 4 * S, z: lz * S },
          rx: 7 * S,
          ry: 4 * S,
          rz: 5 * S,
          color: dark,
        });
      }
      return out;
    }

    // Cola (detrás del rump). Gato: alta; perro: más baja.
    const wag = Math.sin(clock * 5.5 * Math.max(0.15, pose.tailWag)) * (6 + 8 * Math.min(2, pose.tailWag));
    const tailLen = 22 * b.tailLength * S;
    if (b.tailLength > 0.2) {
      const tailBase: Vec3 = { x: rump.x - 2, y: rump.y - bodyH * 0.1, z: 0 };
      const tailTip: Vec3 = esGato
        ? { x: rump.x - tailLen * 0.15, y: rump.y - tailLen * 0.75 - lie * 8, z: wag * 0.6 }
        : { x: rump.x - tailLen * 0.7, y: rump.y - tailLen * 0.15 + wag * 0.15, z: wag * 0.5 };
      add({
        id: 'tail',
        p: {
          x: (tailBase.x + tailTip.x) / 2,
          y: (tailBase.y + tailTip.y) / 2,
          z: (tailBase.z + tailTip.z) / 2,
        },
        rx: Math.max(4, Math.hypot(tailTip.x - tailBase.x, tailTip.y - tailBase.y) * 0.55),
        ry: (3.5 + 4 * b.tailFluff) * S,
        rz: (3.5 + 4 * b.tailFluff) * S,
        color: b.pattern === 'colorpoint' ? b.accent : b.base,
      });
    }

    // Patas: 4, con sit/lie plegando traseras.
    const pawY = GROUND - 3.2 * S;
    const fl: Vec3 = {
      x: chest.x + bodyLen * 0.22,
      y: lie > 0.5 ? chest.y + bodyH * 0.2 : pawY - pose.pawLift * legH * 0.7,
      z: bodyW * 0.55,
    };
    const fr: Vec3 = {
      x: chest.x + bodyLen * 0.22,
      y: lie > 0.5 ? chest.y + bodyH * 0.2 : pawY,
      z: -bodyW * 0.55,
    };
    const hl: Vec3 = {
      x: rump.x + bodyLen * 0.05,
      y: lie > 0.4 ? chest.y + bodyH * 0.15 : GROUND - 3.2 * S - sit * legH * 0.15,
      z: bodyW * 0.6 * (1 - sit * 0.3),
    };
    const hr: Vec3 = {
      x: rump.x + bodyLen * 0.05,
      y: lie > 0.4 ? chest.y + bodyH * 0.15 : GROUND - 3.2 * S - sit * legH * 0.15,
      z: -bodyW * 0.6 * (1 - sit * 0.3),
    };

    const pawR = (4.2 + b.bodyWidth) * S;
    for (const [id, p, lift] of [
      ['pawFL', fl, pose.pawLift],
      ['pawFR', fr, 0],
      ['pawHL', hl, 0],
      ['pawHR', hr, 0],
    ] as const) {
      add({
        id,
        p,
        rx: pawR * (1 + (lift as number) * 0.2),
        ry: pawR * 0.7,
        rz: pawR,
        color: b.pattern === 'colorpoint' ? b.accent : dark,
      });
    }

    // Muslos / cañas (conectores visuales)
    if (lie < 0.6) {
      add({
        id: 'legFL',
        p: { x: fl.x, y: (chest.y + fl.y) / 2, z: fl.z * 0.85 },
        rx: 4 * S,
        ry: Math.max(4, (chest.y - fl.y) * 0.45),
        rz: 4 * S,
        color: dark,
        opacity: 0.95,
      });
      add({
        id: 'legFR',
        p: { x: fr.x, y: (chest.y + fr.y) / 2, z: fr.z * 0.85 },
        rx: 4 * S,
        ry: Math.max(4, (chest.y - fr.y) * 0.45),
        rz: 4 * S,
        color: dark,
        opacity: 0.95,
      });
      add({
        id: 'legHL',
        p: { x: hl.x - 2, y: (rump.y + hl.y) / 2, z: hl.z * 0.8 },
        rx: 5.5 * S,
        ry: Math.max(4, (rump.y - hl.y) * 0.4),
        rz: 5 * S,
        color: dark,
      });
      add({
        id: 'legHR',
        p: { x: hr.x - 2, y: (rump.y + hr.y) / 2, z: hr.z * 0.8 },
        rx: 5.5 * S,
        ry: Math.max(4, (rump.y - hr.y) * 0.4),
        rz: 5 * S,
        color: dark,
      });
    }

    // Torso (dos elipsoides: pecho + grupa)
    const sqX = pose.bodyScaleX * (1 + squash * 0.06 - stretch * 0.04);
    const sqY = pose.bodyScaleY * (1 - squash * 0.08 + stretch * 0.05);
    add({
      id: 'chest',
      p: chest,
      rx: bodyLen * 0.42 * sqX,
      ry: bodyH * 0.55 * sqY * (1 + lieRoll * 0.05),
      rz: bodyW * (0.85 + lie * 0.35) * sqX,
      color: light,
    });
    add({
      id: 'rump',
      p: rump,
      rx: bodyLen * 0.38 * sqX,
      ry: bodyH * 0.5 * sqY,
      rz: bodyW * (0.9 + lie * 0.3) * sqX,
      color: b.base,
    });
    add({
      id: 'belly',
      p: { x: (chest.x + rump.x) / 2, y: chest.y + bodyH * 0.28, z: 0 },
      rx: bodyLen * 0.35,
      ry: bodyH * 0.28,
      rz: bodyW * 0.7,
      color: b.belly,
      opacity: 0.9,
    });

    // Cuello
    add({
      id: 'neck',
      p: {
        x: (chest.x + head.x) / 2,
        y: (chest.y + head.y) / 2,
        z: (chest.z + head.z) / 2,
      },
      rx: 6 * S,
      ry: 7 * S,
      rz: 6 * S,
      color: b.base,
    });

    // Cabeza
    add({
      id: 'head',
      p: { ...head, y: head.y + lookY * 1.5 },
      rx: headR * (esGato ? 0.95 : 1.05),
      ry: headR,
      rz: headR * 0.95,
      color: light,
    });

    // Hocico
    const snoutLen = headR * (0.35 + 0.9 * b.snoutLength);
    const snout: Vec3 = {
      x: head.x + snoutLen * 0.7,
      y: head.y + headR * 0.15,
      z: head.z,
    };
    add({
      id: 'snout',
      p: snout,
      rx: snoutLen * 0.55,
      ry: headR * (0.35 + 0.15 * b.snoutLength),
      rz: headR * 0.4,
      color: shade(b.base, 8),
    });

    // Orejas
    const earH = headR * (0.7 + 0.5 * b.earSize) * (esGato ? 1.25 : 1);
    const earW = headR * 0.35 * b.earSize;
    const flap = pose.earFlap * 0.04;
    add({
      id: 'earL',
      p: { x: head.x - headR * 0.15, y: head.y - headR * 0.75 - flap, z: headR * 0.55 },
      rx: earW,
      ry: earH * 0.55,
      rz: earW * 0.7,
      color: dark,
    });
    add({
      id: 'earR',
      p: { x: head.x - headR * 0.15, y: head.y - headR * 0.75 + flap, z: -headR * 0.55 },
      rx: earW,
      ry: earH * 0.55,
      rz: earW * 0.7,
      color: dark,
    });

    // Ojos (solo visibles cuando miran hacia la cámara)
    const eyeClose = pose.eyeClose;
    if (eyeClose < 0.85) {
      const eyeOpen = 1 - eyeClose;
      add({
        id: 'eyeL',
        p: {
          x: head.x + headR * 0.35 + lookX * 0.8,
          y: head.y - headR * 0.12 + lookY * 0.8,
          z: headR * 0.38,
        },
        rx: 2.2 * S * eyeOpen,
        ry: 2.6 * S * eyeOpen,
        rz: 1.2 * S,
        color: '#1A1512',
        feature: true,
      });
      add({
        id: 'eyeR',
        p: {
          x: head.x + headR * 0.35 + lookX * 0.8,
          y: head.y - headR * 0.12 + lookY * 0.8,
          z: -headR * 0.38,
        },
        rx: 2.2 * S * eyeOpen,
        ry: 2.6 * S * eyeOpen,
        rz: 1.2 * S,
        color: '#1A1512',
        feature: true,
      });
      // Brillo
      add({
        id: 'eyeShineL',
        p: {
          x: head.x + headR * 0.42,
          y: head.y - headR * 0.2,
          z: headR * 0.42,
        },
        rx: 0.9 * S * eyeOpen,
        ry: 0.9 * S * eyeOpen,
        rz: 0.5 * S,
        color: '#FFFFFF',
        feature: true,
        opacity: 0.85,
      });
    }

    // Nariz
    add({
      id: 'nose',
      p: { x: snout.x + snoutLen * 0.25, y: snout.y - 1, z: 0 },
      rx: 2.2 * S,
      ry: 1.6 * S,
      rz: 1.8 * S,
      color: b.nose,
      feature: true,
    });

    // Boca / lengua — distinto por especie
    const mouth = pose.mouthOpen;
    if (mouth > 0.08) {
      add({
        id: 'mouth',
        p: { x: snout.x + 1, y: snout.y + headR * 0.22 + mouth * 2, z: 0 },
        rx: 3.5 * S + mouth * 2,
        ry: 1.2 * S + mouth * 3.5,
        rz: 2 * S,
        color: '#3A2228',
        feature: true,
      });
      // Perro: saca la lengua al jadear / feliz. Gato: nunca.
      if (esPerro && mouth > 0.35) {
        add({
          id: 'tongue',
          p: { x: snout.x + 2, y: snout.y + headR * 0.35 + mouth * 3, z: 0 },
          rx: 2.2 * S,
          ry: 3.5 * S * mouth,
          rz: 1.4 * S,
          color: '#E8577E',
          feature: true,
        });
      }
    } else if (esPerro && pose.tailWag > 2.5) {
      // Jadeo suave en idle feliz
      add({
        id: 'tongueIdle',
        p: { x: snout.x + 1.5, y: snout.y + headR * 0.28, z: 0 },
        rx: 2 * S,
        ry: 2.8 * S,
        rz: 1.2 * S,
        color: '#E8577E',
        feature: true,
        opacity: 0.9,
      });
    }

    // Gato: bigotes sutiles (líneas cortas como elipses finas)
    if (esGato) {
      for (const side of [-1, 1]) {
        add({
          id: `whisk${side}`,
          p: { x: snout.x, y: snout.y + 1, z: side * headR * 0.55 },
          rx: 6 * S,
          ry: 0.6 * S,
          rz: 0.6 * S,
          color: shade(b.belly, -10),
          feature: true,
          opacity: 0.55,
        });
      }
    }

    return out;
  }, [b, pose, clock, lookX, lookY, squash, stretch, esGato, esPerro, esTortuga]);

  const projected = useMemo(() => {
    return parts
      .map((part) => {
        const pr = project(part.p, yaw);
        // Radios proyectados: mezclar rz/rx según ángulo
        const c = Math.abs(Math.cos(yaw));
        const s = Math.abs(Math.sin(yaw));
        const rx = part.rx * c + part.rz * s;
        const ry = part.ry;
        // Cara: ocultar ojos/boca/nariz cuando miramos la espalda.
        if (part.feature && Math.sin(yaw) < -0.2) return null;
        return {
          ...part,
          scrX: pr.x,
          scrY: pr.y,
          depth: pr.depth,
          drawRx: Math.max(1.2, rx * pr.sx),
          drawRy: Math.max(1.2, ry),
          fill: lit(part.color, pr.depth, yaw, part.p.z > 0 ? 1 : -1),
        };
      })
      .filter((p): p is NonNullable<typeof p> => p != null)
      .sort((a, b) => a.depth - b.depth);
  }, [parts, yaw]);

  // Sombra en el piso (siempre bajo las patas, no flota)
  const shadowW = 36 * b.scale * b.bodyWidth * (1 + (pose.lie ?? 0) * 0.35);
  const jump = Math.max(0, -pose.bodyY);
  const shadowOpacity = 0.28 * (1 - Math.min(1, jump / 20));
  const shadowScale = 1 - Math.min(0.35, jump / 40);

  const id = (n: string) => `${n}_${uid}`;

  return (
    <Svg width={size} height={size} viewBox="0 0 200 200">
      <Defs>
        <RadialGradient id={id('floorShadow')} cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor="#101010" stopOpacity={shadowOpacity} />
          <Stop offset="100%" stopColor="#101010" stopOpacity="0" />
        </RadialGradient>
        <LinearGradient id={id('gloss')} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.22" />
          <Stop offset="55%" stopColor="#FFFFFF" stopOpacity="0" />
        </LinearGradient>
      </Defs>

      {/* Sombra pegada al horizonte del escenario (y≈150–168). */}
      <Ellipse
        cx={CX + pose.bodyX * 0.2}
        cy={GROUND + 2}
        rx={shadowW * shadowScale}
        ry={7 * shadowScale * b.scale}
        fill={`url(#${id('floorShadow')})`}
      />

      {projected.map((p) => (
        <G key={p.id} opacity={p.opacity ?? 1}>
          <Ellipse cx={p.scrX} cy={p.scrY} rx={p.drawRx} ry={p.drawRy} fill={p.fill} />
          {!p.feature ? (
            <Ellipse
              cx={p.scrX - p.drawRx * 0.15}
              cy={p.scrY - p.drawRy * 0.25}
              rx={p.drawRx * 0.45}
              ry={p.drawRy * 0.35}
              fill={`url(#${id('gloss')})`}
            />
          ) : null}
        </G>
      ))}

      {pose.prop === 'zzz' ? <Zzz t={pose.propT} x={CX + 24} y={GROUND - 90} /> : null}
      {pose.prop === 'corazon' ? <Hearts t={pose.propT} x={CX + 10} y={GROUND - 100} clock={clock} /> : null}
      {pose.prop === 'pelota' ? (
        <Circle
          cx={CX + 40 + Math.sin(pose.propT * Math.PI * 4) * 18}
          cy={GROUND - 8 - Math.abs(Math.sin(pose.propT * Math.PI * 4)) * 22}
          r={7}
          fill="#E8577E"
        />
      ) : null}
      {pose.prop === 'plato' ? (
        <Ellipse cx={CX + 36} cy={GROUND - 2} rx={14} ry={4} fill="#D4C4A8" />
      ) : null}
      {pose.prop === 'agua' ? (
        <G>
          {Array.from({ length: 8 }, (_, i) => {
            const ang = (i / 8) * Math.PI * 2 + clock;
            return (
              <Ellipse
                key={i}
                cx={CX + Math.cos(ang) * 28}
                cy={GROUND - 40 + Math.sin(ang) * 16}
                rx={2.5}
                ry={3.2}
                fill="#9FD3EA"
                opacity={0.8}
              />
            );
          })}
        </G>
      ) : null}
      {pose.prop === 'estrellas' ? (
        <G>
          {Array.from({ length: 5 }, (_, i) => {
            const ang = (i / 5) * Math.PI * 2 + pose.propT * 3;
            return (
              <Circle
                key={i}
                cx={CX + Math.cos(ang) * (20 + pose.propT * 16)}
                cy={GROUND - 70 + Math.sin(ang) * 12}
                r={3}
                fill="#FFD65A"
                opacity={1 - pose.propT}
              />
            );
          })}
        </G>
      ) : null}
    </Svg>
  );
}

function Zzz({ t, x, y }: { t: number; x: number; y: number }) {
  return (
    <G>
      {[0, 1, 2].map((i) => {
        const f = (t * 1.2 + i * 0.33) % 1;
        const px = x + f * 12;
        const py = y - f * 28;
        const s = 5 + i;
        return (
          <Path
            key={i}
            d={`M${px} ${py} L${px + s} ${py} L${px} ${py + s} L${px + s} ${py + s}`}
            stroke="#FFFFFF"
            strokeWidth={2}
            fill="none"
            opacity={(1 - f) * 0.9}
          />
        );
      })}
    </G>
  );
}

function Hearts({ t, x, y, clock }: { t: number; x: number; y: number; clock: number }) {
  return (
    <G>
      {[0, 1, 2].map((i) => {
        const f = (t * 1.1 + i * 0.3) % 1;
        const py = y - f * 30;
        const px = x + Math.sin(clock + i) * 6;
        const s = 4.2 * (1 - f * 0.3);
        return (
          <Path
            key={i}
            d={`M${px} ${py + s} C${px - s * 1.4} ${py - s * 0.4}, ${px - s * 0.3} ${py - s * 1.3}, ${px} ${py - s * 0.35} C${px + s * 0.3} ${py - s * 1.3}, ${px + s * 1.4} ${py - s * 0.4}, ${px} ${py + s} Z`}
            fill="#E8577E"
            opacity={(1 - f) * 0.95}
          />
        );
      })}
    </G>
  );
}
