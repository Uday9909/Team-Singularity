import { useMemo } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export function useCameraController(cameraStates, progressRefs) {
  const { camera } = useThree();
  const posVec = useMemo(() => new THREE.Vector3(), []);
  const lookVec = useMemo(() => new THREE.Vector3(), []);
  const tempPos = useMemo(() => new THREE.Vector3(), []);
  const tempLook = useMemo(() => new THREE.Vector3(), []);

  useFrame(() => {
    if (!progressRefs?.current) return;
    const progs = progressRefs.current;
    const numStages = cameraStates.length;
    
    let activeStage = 0;
    for (let i = 0; i < numStages; i++) {
      if (progs[i] > 0.01) activeStage = i;
    }

    const p = progs[activeStage];
    const curr = cameraStates[activeStage];
    const next = cameraStates[Math.min(activeStage + 1, numStages - 1)];

    let morphT = 0;
    if (p > 0.5) {
      morphT = easeInOutCubic((p - 0.5) * 2);
    }

    posVec.set(...curr.pos);
    tempPos.set(...next.pos);
    posVec.lerp(tempPos, morphT);

    lookVec.set(...curr.lookAt);
    tempLook.set(...next.lookAt);
    lookVec.lerp(tempLook, morphT);

    camera.position.copy(posVec);
    camera.lookAt(lookVec);
  });
}
