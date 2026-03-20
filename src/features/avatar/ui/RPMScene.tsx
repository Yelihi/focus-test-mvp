"use client";

import { useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import type { Avatar3DInterpolator } from "../lib/avatar3DInterpolator";
import { RPM_AVATAR_URL } from "../config/constants";

interface Props {
  interpolator: Avatar3DInterpolator;
}

export function RPMScene({ interpolator }: Props) {
  const { scene } = useGLTF(RPM_AVATAR_URL);

  // Cache Object3D lookup by name after GLB loads
  const nodes = useMemo(() => {
    const map: Record<string, THREE.Object3D> = {};
    scene.traverse((obj) => {
      if (obj.name) map[obj.name] = obj;
    });
    return map;
  }, [scene]);

  // Cache SkinnedMesh list for blendshape application
  const skinnedMeshes = useMemo(() => {
    const meshes: THREE.SkinnedMesh[] = [];
    scene.traverse((obj) => {
      if ((obj as THREE.SkinnedMesh).isSkinnedMesh) {
        meshes.push(obj as THREE.SkinnedMesh);
      }
    });
    return meshes;
  }, [scene]);

  useFrame((_, delta) => {
    interpolator.tick(delta);
    const { euler, blendshapes, isVisible } = interpolator;

    scene.visible = isVisible;
    if (!isVisible) return;

    // Apply head rotation; distribute 1/3 to neck and spine for natural motion
    const head = nodes["Head"];
    const neck = nodes["Neck"];
    const spine = nodes["Spine1"] ?? nodes["Spine"];

    if (head) head.rotation.set(euler.x, euler.y, euler.z);
    if (neck) neck.rotation.set(euler.x / 3, euler.y / 3, euler.z / 3);
    if (spine) spine.rotation.set(euler.x / 3, euler.y / 3, euler.z / 3);

    // Apply ARKit blendshapes to all SkinnedMesh morphTargets
    for (const mesh of skinnedMeshes) {
      if (!mesh.morphTargetDictionary || !mesh.morphTargetInfluences) continue;
      for (const [name, score] of blendshapes) {
        const idx = mesh.morphTargetDictionary[name];
        if (idx !== undefined) {
          mesh.morphTargetInfluences[idx] = score;
        }
      }
    }
  });

  return (
    <>
      <ambientLight intensity={1.0} />
      <directionalLight position={[0, 2, 5]} intensity={0.5} />
      {/* Offset model so head (~y=1.65 in RPM rig) is near world origin */}
      <primitive object={scene} position={[0, -1.65, 0]} scale={1} />
    </>
  );
}

useGLTF.preload(RPM_AVATAR_URL);
