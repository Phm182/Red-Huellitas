/**
 * Mascota chibi 3D — anatomía DISTINTA por especie.
 *
 * Perro: cuerpo alargado, hocico largo, orejas según raza, cola colgante.
 * Gato: cabeza grande, hocico corto, orejas puntiagudas, cola curva alta.
 * Nada de “dos bolas apiladas” genéricas.
 */

import * as THREE from 'three';
import { ResolvedBreed } from '../domain/breeds';
import { Pose } from '../domain/poses';

export type ChibiPetHandle = {
  root: THREE.Group;
  applyPose: (pose: Pose) => void;
  applyBreed: (breed: ResolvedBreed) => void;
  dispose: () => void;
};

type Mats = {
  fur: THREE.MeshStandardMaterial;
  furDark: THREE.MeshStandardMaterial;
  belly: THREE.MeshStandardMaterial;
  accent: THREE.MeshStandardMaterial;
  pink: THREE.MeshStandardMaterial;
  nose: THREE.MeshStandardMaterial;
  line: THREE.MeshStandardMaterial;
  white: THREE.MeshStandardMaterial;
  tongue: THREE.MeshStandardMaterial;
};

const OUTLINE = 0x3a2418;

function hex(c: string): number {
  const h = c.replace('#', '');
  const full = h.length === 3 ? h.split('').map((x) => x + x).join('') : h;
  const n = parseInt(full, 16);
  return Number.isFinite(n) ? n : 0xc99b6a;
}

function shadeHex(c: string, amount: number): string {
  const n = hex(c);
  const r = Math.max(0, Math.min(255, ((n >> 16) & 255) + amount));
  const g = Math.max(0, Math.min(255, ((n >> 8) & 255) + amount));
  const b = Math.max(0, Math.min(255, (n & 255) + amount));
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

function std(color: string, rough = 0.7) {
  return new THREE.MeshStandardMaterial({
    color: hex(color),
    roughness: rough,
    metalness: 0.04,
  });
}

function outline(geo: THREE.BufferGeometry, s = 1.045) {
  const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: OUTLINE, side: THREE.BackSide }));
  m.scale.setScalar(s);
  return m;
}

function makeMats(breed: ResolvedBreed): Mats {
  return {
    fur: std(breed.base),
    furDark: std(shadeHex(breed.base, -28)),
    belly: std(breed.belly || '#F2E4CE', 0.78),
    accent: std(breed.accent),
    pink: std('#F4A7B9', 0.62),
    nose: std(breed.nose || '#2B1A14', 0.5),
    line: std('#1A1210', 0.45),
    white: std('#FFF8F0', 0.8),
    tongue: std('#E8577E', 0.55),
  };
}

function paint(mats: Mats, breed: ResolvedBreed) {
  mats.fur.color.setHex(hex(breed.base));
  mats.furDark.color.setHex(hex(shadeHex(breed.base, -28)));
  mats.belly.color.setHex(hex(breed.belly || '#F2E4CE'));
  mats.accent.color.setHex(hex(breed.accent));
  mats.nose.color.setHex(hex(breed.nose || '#2B1A14'));
}

function tubeTail(pts: THREE.Vector3[], radius: number, mat: THREE.Material) {
  const curve = new THREE.CatmullRomCurve3(pts);
  const geo = new THREE.TubeGeometry(curve, 40, radius, 10, false);
  const mesh = new THREE.Mesh(geo, mat);
  const g = new THREE.Group();
  g.add(outline(geo, 1.07), mesh);
  return g;
}

function happyArc(mat: THREE.Material) {
  const curve = new THREE.QuadraticBezierCurve3(
    new THREE.Vector3(-0.06, 0, 0),
    new THREE.Vector3(0, 0.045, 0),
    new THREE.Vector3(0.06, 0, 0)
  );
  return new THREE.Mesh(new THREE.TubeGeometry(curve, 8, 0.012, 5, false), mat);
}

type Refs = {
  bodyG: THREE.Group;
  headG: THREE.Group;
  snoutG: THREE.Group;
  tail: THREE.Group;
  earL: THREE.Object3D;
  earR: THREE.Object3D;
  eyeOpenL: THREE.Mesh;
  eyeOpenR: THREE.Mesh;
  eyeHappyL: THREE.Mesh;
  eyeHappyR: THREE.Mesh;
  mouthClosed: THREE.Mesh;
  mouthOpen: THREE.Mesh;
  tongue: THREE.Mesh;
  pawFL: THREE.Mesh;
  shadow: THREE.Mesh;
  /** true = anatomía de perro (ojos abiertos por defecto). */
  isDog: boolean;
};

export function buildChibiPet(breed: ResolvedBreed): ChibiPetHandle {
  const mats = makeMats(breed);
  if (breed.species === 'tortuga') return buildTurtle(breed, mats);
  if (breed.species === 'perro') return buildDog(breed, mats);
  return buildCat(breed, mats);
}

function buildTurtle(breed: ResolvedBreed, mats: Mats): ChibiPetHandle {
  const root = new THREE.Group();
  const puppet = new THREE.Group();
  root.add(puppet);
  const shadow = floorShadow();
  root.add(shadow);
  root.scale.setScalar(0.7);

  const shellGeo = new THREE.SphereGeometry(0.4, 24, 18);
  const shell = new THREE.Mesh(shellGeo, mats.fur);
  shell.scale.set(1.3, 0.65, 1.15);
  shell.position.y = 0.35;
  const belly = new THREE.Mesh(new THREE.SphereGeometry(0.3, 18, 12), mats.belly);
  belly.scale.set(1.25, 0.32, 1.1);
  belly.position.y = 0.18;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 12), mats.fur);
  head.position.set(0.42, 0.38, 0.05);
  const neck = new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 0.12, 4, 8), mats.fur);
  neck.rotation.z = -Math.PI / 2;
  neck.position.set(0.28, 0.36, 0.04);
  puppet.add(outline(shellGeo), shell, belly, neck, head);
  for (const [x, z] of [
    [-0.28, -0.28],
    [-0.28, 0.28],
    [0.2, -0.32],
    [0.2, 0.32],
  ] as const) {
    const p = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.04, 3, 8), mats.furDark);
    p.rotation.x = Math.PI / 2;
    p.position.set(x, 0.1, z);
    puppet.add(p);
  }
  return makeHandle(root, puppet, null, mats, breed, shadow);
}

/** PERRO: se tiene que leer “perro” de frente y de perfil. */
function buildDog(breed: ResolvedBreed, mats: Mats): ChibiPetHandle {
  const root = new THREE.Group();
  const puppet = new THREE.Group();
  root.add(puppet);
  const shadow = floorShadow();
  root.add(shadow);
  root.scale.setScalar(0.68 * (0.95 + breed.scale * 0.1));

  const bodyG = new THREE.Group();
  bodyG.position.set(0, 0.42, 0);
  puppet.add(bodyG);

  // Cuerpo ALARGADO horizontal (sentado: pecho alto, grupa atrás-abajo)
  const torsoGeo = new THREE.CapsuleGeometry(0.28, 0.45, 8, 18);
  const torso = new THREE.Mesh(torsoGeo, mats.fur);
  torso.rotation.z = Math.PI / 2;
  torso.rotation.x = -0.25;
  torso.scale.set(1, 1.05, 1.15);
  torso.position.set(0, 0.02, -0.02);
  bodyG.add(outline(torsoGeo, 1.04), torso);

  // Pecho / pechera
  const chest = new THREE.Mesh(new THREE.SphereGeometry(0.26, 18, 14), mats.belly);
  chest.position.set(0, -0.02, 0.22);
  chest.scale.set(1.05, 1.1, 0.75);
  bodyG.add(chest);

  // Patas: cápsulas verticales que llegan al piso
  const legGeo = new THREE.CapsuleGeometry(0.07, 0.16, 4, 10);
  const makeLeg = (x: number, z: number, mat: THREE.Material, len = 1) => {
    const leg = new THREE.Mesh(legGeo, mat);
    leg.position.set(x, -0.32, z);
    leg.scale.set(1.1, len, 1.15);
    bodyG.add(outline(legGeo, 1.05), leg);
    // Almohadilla
    const pad = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 10), mat);
    pad.scale.set(1.2, 0.55, 1.3);
    pad.position.set(x, -0.48, z);
    bodyG.add(pad);
    return leg;
  };
  const pawFL = makeLeg(-0.16, 0.22, mats.belly, 0.95);
  makeLeg(0.16, 0.22, mats.belly, 0.95);
  makeLeg(-0.22, -0.2, mats.fur, 0.85);
  makeLeg(0.22, -0.2, mats.fur, 0.85);

  // Cola de perro: tubo que SALE de la grupa y cuelga / se curva
  const tailLen = Math.max(0.35, breed.tailLength);
  const tail = tubeTail(
    [
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0.05, 0.12, -0.15),
      new THREE.Vector3(0.08, 0.08, -0.35 * tailLen),
      new THREE.Vector3(0.12, -0.05, -0.5 * tailLen),
    ],
    0.055,
    mats.fur
  );
  tail.position.set(0, 0.12, -0.38);
  bodyG.add(tail);

  // Cabeza + HOCICO LARGO (clave para que sea perro)
  const headG = new THREE.Group();
  headG.position.set(0, 0.38, 0.28);
  bodyG.add(headG);

  const headGeo = new THREE.SphereGeometry(0.28, 24, 18);
  const head = new THREE.Mesh(headGeo, mats.fur);
  head.scale.set(1.05, 1, 0.95);
  headG.add(outline(headGeo, 1.04), head);

  const snoutG = new THREE.Group();
  snoutG.position.set(0, -0.04, 0.2);
  headG.add(snoutG);

  // Hocico: cápsula hacia adelante (largo según snoutLength)
  const snoutLen = 0.18 + breed.snoutLength * 0.28;
  const snoutGeo = new THREE.CapsuleGeometry(0.1, snoutLen, 6, 12);
  const snout = new THREE.Mesh(snoutGeo, mats.fur);
  snout.rotation.x = Math.PI / 2;
  snout.position.z = snoutLen * 0.35;
  snoutG.add(outline(snoutGeo, 1.04), snout);

  // Puente / parte inferior más clara
  const chin = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, snoutLen * 0.7, 4, 10), mats.belly);
  chin.rotation.x = Math.PI / 2;
  chin.position.set(0, -0.06, snoutLen * 0.3);
  snoutG.add(chin);

  // Nariz al final del hocico
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.055, 12, 10), mats.nose);
  nose.position.set(0, 0.02, snoutLen * 0.75 + 0.08);
  nose.scale.set(1.15, 0.9, 0.85);
  snoutG.add(nose);

  // Boca
  const mouthClosed = new THREE.Mesh(new THREE.CapsuleGeometry(0.02, 0.06, 2, 6), mats.line);
  mouthClosed.rotation.z = Math.PI / 2;
  mouthClosed.position.set(0, -0.08, snoutLen * 0.55);
  mouthClosed.name = 'mouthClosed';
  const mouthOpen = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), mats.line);
  mouthOpen.position.set(0, -0.1, snoutLen * 0.5);
  mouthOpen.name = 'mouthOpen';
  mouthOpen.visible = false;
  const tongue = new THREE.Mesh(new THREE.CapsuleGeometry(0.03, 0.08, 3, 8), mats.tongue);
  tongue.position.set(0, -0.14, snoutLen * 0.45);
  tongue.name = 'tongue';
  tongue.visible = false;
  snoutG.add(mouthClosed, mouthOpen, tongue);

  // Orejas de perro
  const earL = buildDogEar(breed, mats, -1);
  const earR = buildDogEar(breed, mats, 1);
  headG.add(earL, earR);

  // Ojos de perro (más redondos, abiertos por defecto)
  const face = new THREE.Group();
  face.position.set(0, 0.06, 0.2);
  headG.add(face);

  const eyeOpenL = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 10), mats.line);
  eyeOpenL.position.set(-0.11, 0, 0.08);
  eyeOpenL.scale.set(1, 1.15, 0.7);
  eyeOpenL.name = 'eyeOpen';
  const eyeOpenR = eyeOpenL.clone();
  eyeOpenR.position.x = 0.11;
  eyeOpenR.name = 'eyeOpen';
  const shine = new THREE.Mesh(new THREE.SphereGeometry(0.015, 8, 6), mats.white);
  shine.position.set(0.012, 0.012, 0.03);
  eyeOpenL.add(shine.clone());
  eyeOpenR.add(shine);

  const eyeHappyL = happyArc(mats.line);
  eyeHappyL.position.set(-0.11, 0, 0.09);
  eyeHappyL.name = 'eyeHappy';
  eyeHappyL.visible = false;
  const eyeHappyR = happyArc(mats.line);
  eyeHappyR.position.set(0.11, 0, 0.09);
  eyeHappyR.name = 'eyeHappy';
  eyeHappyR.visible = false;
  face.add(eyeOpenL, eyeOpenR, eyeHappyL, eyeHappyR);

  const refs: Refs = {
    bodyG,
    headG,
    snoutG,
    tail,
    earL,
    earR,
    eyeOpenL,
    eyeOpenR,
    eyeHappyL,
    eyeHappyR,
    mouthClosed,
    mouthOpen,
    tongue,
    pawFL,
    shadow,
    isDog: true,
  };
  return makeHandle(root, puppet, refs, mats, breed, shadow);
}

function buildDogEar(breed: ResolvedBreed, mats: Mats, side: number): THREE.Group {
  const g = new THREE.Group();
  const floppy = breed.earStyle === 'caida' || breed.earStyle === 'semi';
  if (floppy) {
    // Oreja caída: cápsula que cuelga
    const geo = new THREE.CapsuleGeometry(0.09, 0.18, 5, 10);
    const ear = new THREE.Mesh(geo, mats.fur);
    ear.scale.set(0.75, 1, 0.45);
    g.add(outline(geo, 1.05), ear);
    g.position.set(side * 0.22, 0.12, 0.02);
    g.rotation.z = side * 0.9;
    g.rotation.x = 0.35;
  } else {
    // Erecta (pastor, etc.)
    const geo = new THREE.ConeGeometry(0.11, 0.28, 5);
    geo.translate(0, 0.14, 0);
    const ear = new THREE.Mesh(geo, mats.fur);
    const inner = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.16, 5), mats.pink);
    inner.geometry.translate(0, 0.1, 0);
    inner.position.z = 0.025;
    g.add(outline(geo, 1.06), ear, inner);
    g.position.set(side * 0.2, 0.2, 0);
    g.rotation.z = side * 0.25;
    g.rotation.x = -0.15;
  }
  return g;
}

/** GATO: cabeza grande, hocico corto, cola alta. */
function buildCat(breed: ResolvedBreed, mats: Mats): ChibiPetHandle {
  const root = new THREE.Group();
  const puppet = new THREE.Group();
  root.add(puppet);
  const shadow = floorShadow();
  root.add(shadow);
  root.scale.setScalar(0.7 * (0.95 + breed.scale * 0.1));

  const bodyG = new THREE.Group();
  bodyG.position.set(0, 0.4, 0);
  puppet.add(bodyG);

  // Cuerpo sentado más compacto / vertical
  const torsoGeo = new THREE.CapsuleGeometry(0.32, 0.2, 8, 18);
  const torso = new THREE.Mesh(torsoGeo, mats.fur);
  torso.scale.set(1.05, 1.05, 0.95);
  bodyG.add(outline(torsoGeo, 1.04), torso);

  const chest = new THREE.Mesh(new THREE.SphereGeometry(0.24, 16, 12), mats.belly);
  chest.position.set(0, -0.06, 0.2);
  chest.scale.set(1.1, 1.05, 0.65);
  bodyG.add(chest);

  const legGeo = new THREE.CapsuleGeometry(0.075, 0.12, 4, 10);
  const makeLeg = (x: number, z: number, mat: THREE.Material) => {
    const leg = new THREE.Mesh(legGeo, mat);
    leg.position.set(x, -0.36, z);
    bodyG.add(outline(legGeo, 1.05), leg);
    const pad = new THREE.Mesh(new THREE.SphereGeometry(0.075, 10, 8), mat);
    pad.scale.set(1.15, 0.5, 1.25);
    pad.position.set(x, -0.48, z);
    bodyG.add(pad);
    return leg;
  };
  const pawFL = makeLeg(-0.16, 0.22, mats.belly);
  makeLeg(0.16, 0.22, mats.belly);
  makeLeg(-0.22, -0.12, mats.fur);
  makeLeg(0.22, -0.12, mats.fur);

  // Cola de gato: curva ALTA entera
  const tail = tubeTail(
    [
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0.12, 0.15, -0.1),
      new THREE.Vector3(0.28, 0.42, 0.02),
      new THREE.Vector3(0.22, 0.55, 0.2),
      new THREE.Vector3(0.08, 0.4, 0.32),
    ],
    0.055,
    mats.fur
  );
  tail.position.set(0.28, 0.05, -0.22);
  bodyG.add(tail);

  const headG = new THREE.Group();
  headG.position.set(0, 0.42, 0.1);
  bodyG.add(headG);

  const headGeo = new THREE.SphereGeometry(0.34, 26, 20);
  const head = new THREE.Mesh(headGeo, mats.fur);
  headG.add(outline(headGeo, 1.04), head);

  // Hocico CORTO
  const snoutG = new THREE.Group();
  snoutG.position.set(0, -0.1, 0.26);
  headG.add(snoutG);
  const muz = new THREE.Mesh(new THREE.SphereGeometry(0.14, 16, 12), mats.belly);
  muz.scale.set(1.15, 0.85, 0.9);
  snoutG.add(outline(muz.geometry, 1.03), muz);
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 8), mats.nose);
  nose.position.set(0, 0.02, 0.12);
  snoutG.add(nose);

  const mouthClosed = new THREE.Mesh(new THREE.CapsuleGeometry(0.015, 0.04, 2, 6), mats.line);
  mouthClosed.rotation.z = Math.PI / 2;
  mouthClosed.position.set(0, -0.05, 0.1);
  mouthClosed.name = 'mouthClosed';
  const mouthOpen = new THREE.Mesh(new THREE.SphereGeometry(0.04, 10, 8), mats.line);
  mouthOpen.position.set(0, -0.06, 0.1);
  mouthOpen.name = 'mouthOpen';
  mouthOpen.visible = false;
  const tongue = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), mats.tongue);
  tongue.position.set(0, -0.1, 0.08);
  tongue.name = 'tongue';
  tongue.visible = false;
  snoutG.add(mouthClosed, mouthOpen, tongue);

  // Orejas puntiagudas
  const earGeo = new THREE.ConeGeometry(0.12, 0.28, 5);
  earGeo.translate(0, 0.14, 0);
  const makeEar = (side: number) => {
    const g = new THREE.Group();
    const ear = new THREE.Mesh(earGeo, mats.fur);
    const inner = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.18, 5), mats.pink);
    inner.geometry.translate(0, 0.1, 0);
    inner.position.z = 0.025;
    g.add(outline(earGeo, 1.06), ear, inner);
    g.position.set(side * 0.22, 0.24, 0.02);
    g.rotation.z = side * 0.3;
    g.rotation.x = -0.2;
    return g;
  };
  const earL = makeEar(-1);
  const earR = makeEar(1);
  headG.add(earL, earR);

  // Rayas frente
  if (breed.pattern === 'rayado' || breed.pattern === 'manchado' || breed.pattern === 'tricolor') {
    for (const ox of [-0.07, 0, 0.07]) {
      const s = new THREE.Mesh(new THREE.CapsuleGeometry(0.015, 0.08, 2, 6), mats.furDark);
      s.position.set(ox, 0.18, 0.28);
      headG.add(s);
    }
  }

  const face = new THREE.Group();
  face.position.set(0, 0.04, 0.3);
  headG.add(face);
  const browL = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), mats.white);
  browL.position.set(-0.12, 0.08, 0.04);
  const browR = browL.clone();
  browR.position.x = 0.12;
  face.add(browL, browR);

  const eyeOpenL = new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 10), mats.line);
  eyeOpenL.position.set(-0.12, 0, 0.05);
  eyeOpenL.scale.set(1, 1.2, 0.65);
  eyeOpenL.name = 'eyeOpen';
  eyeOpenL.visible = false;
  const eyeOpenR = eyeOpenL.clone();
  eyeOpenR.position.x = 0.12;
  eyeOpenR.name = 'eyeOpen';
  eyeOpenR.visible = false;
  const eyeHappyL = happyArc(mats.line);
  eyeHappyL.position.set(-0.12, 0, 0.06);
  eyeHappyL.name = 'eyeHappy';
  const eyeHappyR = happyArc(mats.line);
  eyeHappyR.position.set(0.12, 0, 0.06);
  eyeHappyR.name = 'eyeHappy';
  face.add(eyeOpenL, eyeOpenR, eyeHappyL, eyeHappyR);

  const refs: Refs = {
    bodyG,
    headG,
    snoutG,
    tail,
    earL,
    earR,
    eyeOpenL,
    eyeOpenR,
    eyeHappyL,
    eyeHappyR,
    mouthClosed,
    mouthOpen,
    tongue,
    pawFL,
    shadow,
    isDog: false,
  };
  return makeHandle(root, puppet, refs, mats, breed, shadow);
}

function floorShadow() {
  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.55, 28),
    new THREE.MeshBasicMaterial({ color: 0x4a3a68, transparent: true, opacity: 0.2 })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.01;
  return shadow;
}

function makeHandle(
  root: THREE.Group,
  puppet: THREE.Group,
  refs: Refs | null,
  mats: Mats,
  initial: ResolvedBreed,
  shadow: THREE.Mesh
): ChibiPetHandle {
  let breed = initial;
  const bodyY0 = refs?.bodyG.position.y ?? 0.4;
  const headY0 = refs?.headG.position.y ?? 0.4;

  return {
    root,
    applyBreed(b) {
      breed = b;
      paint(mats, b);
      const base = b.species === 'perro' ? 0.68 : 0.7;
      root.scale.setScalar(base * (0.95 + b.scale * 0.1));
    },
    applyPose(pose) {
      const sit = pose.sit;
      const lie = pose.lie ?? 0;
      const t = typeof performance !== 'undefined' ? performance.now() / 1000 : 0;

      puppet.position.y = Math.max(0, -pose.bodyY * 0.012);
      puppet.rotation.z = lie * 0.7;
      puppet.position.x = lie * 0.08;

      if (!refs) return;

      refs.bodyG.position.y = bodyY0 - sit * 0.03 - lie * 0.12;
      refs.headG.position.y = headY0 - lie * 0.04;
      refs.headG.rotation.x = ((pose.headRot * Math.PI) / 180) * 0.3;
      refs.headG.rotation.y = pose.headX * 0.025;

      const wag = Math.sin(t * 5 * Math.max(0.2, pose.tailWag)) * 0.25 * Math.min(2, pose.tailWag);
      refs.tail.rotation.y = wag;
      refs.tail.rotation.z = wag * 0.12;

      // Orejas: no acumular rotación cada frame
      const flap = ((pose.earFlap * Math.PI) / 180) * 0.25;
      if (refs.isDog) {
        // se mantiene la pose base de buildDogEar; sólo un temblor leve
        refs.earL.rotation.x = flap * 0.15;
        refs.earR.rotation.x = flap * 0.15;
      } else {
        refs.earL.rotation.z = -0.3 + flap;
        refs.earR.rotation.z = 0.3 - flap;
      }

      // Perro: ojos abiertos salvo dormir/muy cerrados. Gato: arcos felices.
      const happy = refs.isDog ? pose.eyeClose > 0.8 : pose.eyeClose > 0.45;
      refs.eyeHappyL.visible = happy;
      refs.eyeHappyR.visible = happy;
      refs.eyeOpenL.visible = !happy;
      refs.eyeOpenR.visible = !happy;

      const mo = pose.mouthOpen;
      refs.mouthClosed.visible = mo < 0.25;
      refs.mouthOpen.visible = mo >= 0.25;
      refs.tongue.visible = refs.isDog && mo > 0.4;

      refs.pawFL.position.y = -0.32 + pose.pawLift * 0.3;

      const jump = Math.max(0, -pose.bodyY);
      shadow.scale.setScalar(1 - Math.min(0.3, jump / 28));
    },
    dispose() {
      root.traverse((obj) => {
        const m = obj as THREE.Mesh;
        if (m.geometry) m.geometry.dispose();
        const mat = m.material;
        if (!mat) return;
        if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
        else mat.dispose();
      });
    },
  };
}
