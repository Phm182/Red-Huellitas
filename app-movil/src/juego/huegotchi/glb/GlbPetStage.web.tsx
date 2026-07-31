/**
 * Stage GLB (web): mesh skinned + AnimationMixer + poses por huesos.
 */

import React, { useEffect, useRef } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import * as THREE from 'three';
import { HueSpecies } from '../domain/types';
import { HeldStance } from '../domain/poses';
import { glbPackForSpecies } from './registry';
import { loadGlbPetPack, LoadedGlbPet } from './loadGlb';
import { createDirectorRuntime, disposeDirector, DirectorRuntime, tickDirector } from './animDirector';

export type GlbPetStageProps = {
  size: number;
  species: HueSpecies;
  yaw: number;
  heldStance: HeldStance;
  actionTrigger: string | null;
  mood: string;
  animGen?: number;
  actionStartedAt?: number | null;
};

type Runtime = {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  pet: LoadedGlbPet | null;
  director: DirectorRuntime | null;
  raf: number;
  alive: boolean;
  clock: THREE.Clock;
};

export function GlbPetStage({
  size,
  species,
  yaw,
  heldStance,
  actionTrigger,
  mood,
  actionStartedAt = null,
}: GlbPetStageProps) {
  const hostRef = useRef<View>(null);
  const rtRef = useRef<Runtime | null>(null);
  const yawRef = useRef(yaw);
  const stanceRef = useRef(heldStance);
  const actionRef = useRef(actionTrigger);
  const moodRef = useRef(mood);
  const startedRef = useRef(actionStartedAt);

  yawRef.current = yaw;
  stanceRef.current = heldStance;
  actionRef.current = actionTrigger;
  moodRef.current = mood;
  startedRef.current = actionStartedAt;

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    const host = hostRef.current as unknown as HTMLElement | null;
    if (!host) return;

    const pack = glbPackForSpecies(species);
    if (!pack) return;

    const canvas = document.createElement('canvas');
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.display = 'block';
    canvas.style.touchAction = 'none';
    host.appendChild(canvas);

    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(size, size, false);
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, 1, 0.05, 80);
    // Cámara un poco más baja: el perro se lee apoyado en el piso.
    camera.position.set(0, 0.95, 3.55);
    camera.lookAt(0, 0.55, 0);

    scene.add(new THREE.HemisphereLight(0xfff2e0, 0x6a5a4a, 1.15));
    const key = new THREE.DirectionalLight(0xffffff, 1.3);
    key.position.set(2.2, 4.5, 3);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xffd8c0, 0.45);
    fill.position.set(-2.5, 1.5, -1.5);
    scene.add(fill);

    // Piso sutil (contacto visual).
    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(1.35, 48),
      new THREE.MeshStandardMaterial({
        color: 0xd8c4a8,
        roughness: 0.92,
        metalness: 0,
        transparent: true,
        opacity: 0.35,
      })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0.001;
    scene.add(floor);

    const rt: Runtime = {
      renderer,
      scene,
      camera,
      pet: null,
      director: null,
      raf: 0,
      alive: true,
      clock: new THREE.Clock(),
    };
    rtRef.current = rt;

    let cancelled = false;
    void loadGlbPetPack(pack)
      .then((pet) => {
        if (cancelled || !rt.alive) return;
        rt.pet = pet;
        scene.add(pet.root);
        rt.director = createDirectorRuntime(pet.root, pet.clips);
        if (__DEV__) {
          console.log('[GlbPetStage]', species, 'clips', Object.keys(pet.clips), 'skel', !!pet.root.userData.hasSkeleton);
        }
      })
      .catch((err) => console.warn('[GlbPetStage] load failed', err));

    const tick = () => {
      if (!rt.alive) return;
      const dt = Math.min(0.05, rt.clock.getDelta());
      const time = rt.clock.elapsedTime;

      if (rt.pet && rt.director) {
        tickDirector(
          rt.pet.root,
          rt.director,
          rt.pet.clips,
          {
            yaw: yawRef.current,
            heldStance: stanceRef.current,
            actionTrigger: actionRef.current,
            mood: moodRef.current,
            actionStartedAt: startedRef.current,
          },
          dt,
          time
        );
      }

      rt.renderer.render(rt.scene, rt.camera);
      rt.raf = requestAnimationFrame(tick);
    };
    rt.raf = requestAnimationFrame(tick);

    return () => {
      cancelled = true;
      rt.alive = false;
      cancelAnimationFrame(rt.raf);
      if (rt.director) disposeDirector(rt.director);
      if (rt.pet) {
        scene.remove(rt.pet.root);
        rt.pet.root.traverse((o) => {
          const m = o as THREE.Mesh;
          if (m.isMesh) {
            m.geometry?.dispose();
            const mat = m.material;
            if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
            else mat?.dispose?.();
          }
        });
      }
      floor.geometry.dispose();
      (floor.material as THREE.Material).dispose();
      renderer.dispose();
      rtRef.current = null;
      if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [species]);

  useEffect(() => {
    rtRef.current?.renderer.setSize(size, size, false);
  }, [size]);

  return <View ref={hostRef} style={[styles.host, { width: size, height: size }]} collapsable={false} />;
}

const styles = StyleSheet.create({
  host: { backgroundColor: 'transparent' },
});
