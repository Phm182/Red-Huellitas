/**
 * Stage GLB (nativo): Expo GLView + mismo director que web.
 */

import React, { useEffect, useRef } from 'react';
import { GLView, ExpoWebGLRenderingContext } from 'expo-gl';
import * as THREE from 'three';
import { glbPackForSpecies } from './registry';
import { loadGlbPetPack } from './loadGlb';
import { createDirectorRuntime, disposeDirector, tickDirector } from './animDirector';
import type { GlbPetStageProps } from './GlbPetStage.web';

export type { GlbPetStageProps };

export function GlbPetStage({
  size,
  species,
  yaw,
  heldStance,
  actionTrigger,
  mood,
  actionStartedAt = null,
}: GlbPetStageProps) {
  const yawRef = useRef(yaw);
  const stanceRef = useRef(heldStance);
  const actionRef = useRef(actionTrigger);
  const moodRef = useRef(mood);
  const startedRef = useRef(actionStartedAt);
  const rafRef = useRef(0);
  const aliveRef = useRef(true);
  const directorRef = useRef<ReturnType<typeof createDirectorRuntime> | null>(null);

  yawRef.current = yaw;
  stanceRef.current = heldStance;
  actionRef.current = actionTrigger;
  moodRef.current = mood;
  startedRef.current = actionStartedAt;

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
      cancelAnimationFrame(rafRef.current);
      if (directorRef.current) disposeDirector(directorRef.current);
      directorRef.current = null;
    };
  }, []);

  const onContextCreate = async (gl: ExpoWebGLRenderingContext) => {
    const pack = glbPackForSpecies(species);
    if (!pack) return;

    const { drawingBufferWidth: w, drawingBufferHeight: h } = gl;
    const canvas = {
      width: w,
      height: h,
      style: {} as CSSStyleDeclaration,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      clientHeight: h,
      clientWidth: w,
      getContext: () => gl as unknown as WebGLRenderingContext,
    };

    const renderer = new THREE.WebGLRenderer({
      canvas: canvas as unknown as HTMLCanvasElement,
      context: gl as unknown as WebGLRenderingContext,
      alpha: true,
      antialias: true,
    });
    renderer.setSize(w, h, false);
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, w / Math.max(1, h), 0.05, 80);
    camera.position.set(0, 0.95, 3.55);
    camera.lookAt(0, 0.55, 0);
    scene.add(new THREE.HemisphereLight(0xfff2e0, 0x6a5a4a, 1.15));
    const key = new THREE.DirectionalLight(0xffffff, 1.3);
    key.position.set(2.2, 4.5, 3);
    scene.add(key);

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

    let pet: Awaited<ReturnType<typeof loadGlbPetPack>> | null = null;
    try {
      pet = await loadGlbPetPack(pack);
      if (!aliveRef.current) return;
      scene.add(pet.root);
      directorRef.current = createDirectorRuntime(pet.root, pet.clips);
    } catch (err) {
      console.warn('[GlbPetStage.native] load failed', err);
      return;
    }

    const clock = new THREE.Clock();
    const tick = () => {
      if (!aliveRef.current || !pet || !directorRef.current) return;
      const dt = Math.min(0.05, clock.getDelta());
      tickDirector(
        pet.root,
        directorRef.current,
        pet.clips,
        {
          yaw: yawRef.current,
          heldStance: stanceRef.current,
          actionTrigger: actionRef.current,
          mood: moodRef.current,
          actionStartedAt: startedRef.current,
        },
        dt,
        clock.elapsedTime
      );
      renderer.render(scene, camera);
      gl.endFrameEXP();
      rafRef.current = requestAnimationFrame(tick);
    };
    tick();
  };

  return (
    <GLView
      key={species}
      style={{ width: size, height: size, backgroundColor: 'transparent' }}
      onContextCreate={onContextCreate}
    />
  );
}
