/**
 * Stage Three.js (web): canvas WebGL + mascota chibi.
 * Transparente para que se vea el SceneBackdrop detrás.
 */

import React, { useEffect, useRef } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import * as THREE from 'three';
import { ResolvedBreed } from '../domain/breeds';
import { Pose } from '../domain/poses';
import { buildChibiPet, ChibiPetHandle } from './buildChibiPet';

export type ChibiPetStageProps = {
  size: number;
  breed: ResolvedBreed;
  pose: Pose;
  yaw: number;
};

type Runtime = {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  pet: ChibiPetHandle;
  raf: number;
  alive: boolean;
};

export function ChibiPetStage({ size, breed, pose, yaw }: ChibiPetStageProps) {
  const hostRef = useRef<View>(null);
  const rtRef = useRef<Runtime | null>(null);
  const yawRef = useRef(yaw);
  const poseRef = useRef(pose);

  yawRef.current = yaw;
  poseRef.current = pose;

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;

    const host = hostRef.current as unknown as HTMLElement | null;
    if (!host) return;

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
    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 40);
    // Más lejos + mirando el centro del chibi chico para que no se corte
    camera.position.set(0, 0.85, 4.4);
    camera.lookAt(0, 0.7, 0);

    const hemi = new THREE.HemisphereLight(0xfff2e0, 0x8a7a68, 1.05);
    const key = new THREE.DirectionalLight(0xffffff, 1.15);
    key.position.set(2.5, 5, 3);
    const fill = new THREE.DirectionalLight(0xffe0c8, 0.45);
    fill.position.set(-3, 2, -1);
    scene.add(hemi, key, fill);

    const pet = buildChibiPet(breed);
    scene.add(pet.root);

    const rt: Runtime = { renderer, scene, camera, pet, raf: 0, alive: true };
    rtRef.current = rt;

    const tick = () => {
      if (!rt.alive) return;
      rt.pet.root.rotation.y = yawRef.current;
      rt.pet.applyPose(poseRef.current);
      rt.renderer.render(rt.scene, rt.camera);
      rt.raf = requestAnimationFrame(tick);
    };
    rt.raf = requestAnimationFrame(tick);

    return () => {
      rt.alive = false;
      cancelAnimationFrame(rt.raf);
      rt.pet.dispose();
      rt.renderer.dispose();
      rtRef.current = null;
      if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
    };
    // Montaje único: breed/size se actualizan abajo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const rt = rtRef.current;
    if (!rt) return;
    rt.renderer.setSize(size, size, false);
  }, [size]);

  useEffect(() => {
    rtRef.current?.pet.applyBreed(breed);
  }, [breed]);

  return <View ref={hostRef} style={[styles.host, { width: size, height: size }]} collapsable={false} />;
}

const styles = StyleSheet.create({
  host: { backgroundColor: 'transparent' },
});
