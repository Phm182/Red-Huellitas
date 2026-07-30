/**
 * Stage Three.js (nativo): Expo GLView.
 * Fallback simple si el contexto GL no acepta el canvas shim de three.
 */

import React, { useEffect, useRef } from 'react';
import { GLView, ExpoWebGLRenderingContext } from 'expo-gl';
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

export function ChibiPetStage({ size, breed, pose, yaw }: ChibiPetStageProps) {
  const handleRef = useRef<ChibiPetHandle | null>(null);
  const yawRef = useRef(yaw);
  const poseRef = useRef(pose);
  const breedRef = useRef(breed);
  const rafRef = useRef(0);

  yawRef.current = yaw;
  poseRef.current = pose;
  breedRef.current = breed;

  useEffect(() => {
    handleRef.current?.applyBreed(breed);
  }, [breed]);

  useEffect(() => {
    return () => {
      cancelAnimationFrame(rafRef.current);
      handleRef.current?.dispose();
      handleRef.current = null;
    };
  }, []);

  const onContextCreate = async (gl: ExpoWebGLRenderingContext) => {
    const { drawingBufferWidth: w, drawingBufferHeight: h } = gl;

    // Shim mínimo que Three acepta como canvas en RN.
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
    const camera = new THREE.PerspectiveCamera(32, w / Math.max(1, h), 0.1, 40);
    camera.position.set(0, 0.85, 4.4);
    camera.lookAt(0, 0.7, 0);

    scene.add(new THREE.HemisphereLight(0xfff2e0, 0x8a7a68, 1.05));
    const key = new THREE.DirectionalLight(0xffffff, 1.15);
    key.position.set(2.5, 5, 3);
    scene.add(key);

    const pet = buildChibiPet(breedRef.current);
    handleRef.current = pet;
    scene.add(pet.root);

    const tick = () => {
      const hnd = handleRef.current;
      if (hnd) {
        hnd.root.rotation.y = yawRef.current;
        hnd.applyPose(poseRef.current);
      }
      renderer.render(scene, camera);
      gl.endFrameEXP();
      rafRef.current = requestAnimationFrame(tick);
    };
    tick();
  };

  return (
    <GLView
      style={{ width: size, height: size, backgroundColor: 'transparent' }}
      onContextCreate={onContextCreate}
    />
  );
}
