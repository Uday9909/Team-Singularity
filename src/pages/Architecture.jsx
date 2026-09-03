import React, { useEffect, useRef, useMemo, createContext, useContext, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { TopBar } from '../components/layout/TopBar';
import * as THREE from 'three';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useScrollStages } from '../hooks/useScrollStages';

gsap.registerPlugin(ScrollTrigger);

// ═══════════════════════════════════════════════════════════════════════════════
// DATA
// ═══════════════════════════════════════════════════════════════════════════════

const STAGES = [
  {
    key: 'sar',
    eyebrow: 'STAGE 1',
    title: 'SAR INGESTION',
    description: 'TRITON WATCH ingests continuous C-band synthetic aperture radar (SAR) imagery from the Sentinel-1 constellation. Unlike optical sensors, SAR penetrates cloud cover and operates independent of daylight, providing a persistent global surveillance capability. The system processes raw Level-1 Ground Range Detected (GRD) scenes, continuously tiling and queuing the data for downstream analysis. By measuring surface backscatter, the radar highlights localized suppression of capillary waves—a signature "surface anomaly" indicative of oil slicks, distinct from the rougher surrounding ocean surface.',
    feeds: ['SAR FEED'],
  },
  {
    key: 'ais',
    eyebrow: 'STAGE 2',
    title: 'AIS STREAM',
    description: 'Simultaneous with radar ingestion, live vessel kinematics are streamed continuously via AISstream.io. The system processes Type 1, 2, and 3 positional reports, consuming high-frequency location, heading, and speed over ground (SOG) data for thousands of vessels globally. This telemetry is rapidly indexed into a geospatial time-series database. By maintaining a continuous sliding window of historical vessel tracks, the system prepares a ready state for retroactive time-correlation the moment a surface anomaly is detected in the SAR feed.',
    feeds: ['AIS STREAM'],
  },
  {
    key: 'detect',
    eyebrow: 'STAGE 3',
    title: 'SPILL DETECTION',
    description: 'The queued SAR tiles are passed through a U-Net convolutional neural network optimized for pixel-level semantic segmentation. The model isolates the distinctive low-backscatter signatures of oil slicks against the noisy, dynamic texture of the ocean surface, actively discriminating against look-alikes such as wind slicks, upwelling, or biogenic films. The inference engine outputs a precise, geolocated polygon mask delineating the spill boundaries, accompanied by a model confidence score, instantly flagging the anomaly for operational review.',
    feeds: ['SAR FEED'],
  },
  {
    key: 'correlate',
    eyebrow: 'STAGE 4',
    title: 'CORRELATION',
    description: 'Upon detection, the system initiates a geospatial intersection query, scoring the indexed vessel tracks against the spill\'s geometry and timestamp. The correlation engine evaluates multiple factors: the minimum distance from the spill centroid, bearing consistency relative to the spill axis, and strict time-window overlap between the spill\'s estimated origin and historical vessel positions. These metrics are weighted and fused into a single composite suspect score, probabilistically identifying the vessel responsible for the discharge.',
    feeds: ['SAR FEED', 'AIS STREAM'],
  },
  {
    key: 'dashboard',
    eyebrow: 'STAGE 5',
    title: 'REPORT COMPILED',
    description: 'The distinct data streams—SAR segmentation, AIS tracking, and algorithmic correlation—converge into a unified, actionable intelligence package. The final artifact details the spill\'s Intersection over Union (IoU) confidence, the primary suspect vessel with its match percentage, and the overall correlation latency. Structured for immediate operational deployment, the report is formatted for direct integration into Maritime Rescue Coordination Centre (MRCC) dispatch systems or export as a standardized PDF briefing.',
    feeds: ['SAR FEED', 'AIS STREAM', 'SENTINEL-1 API'],
  },
];

const WIRE_GREEN = '#39FF88';
const WIRE_GREEN_DIM = '#1a7a3d';
const SPILL_BRIGHT = '#aaffcc';
const SUSPECT_BRIGHT = '#ffffff';
const CORR_LINE_COLOR = '#FF9F43';
const CORR_LINE_DIM = '#8B6914';
const CORR_SUSPECT_COLOR = '#FFD700';

// ═══════════════════════════════════════════════════════════════════════════════
// SHARED CONTEXT
// ═══════════════════════════════════════════════════════════════════════════════

const StageProgressContext = createContext(null);

// ═══════════════════════════════════════════════════════════════════════════════
// GRID VERTEX TARGETS (33×33 = 1089 verts)
// ═══════════════════════════════════════════════════════════════════════════════

const GRID_SEG = 32;
const GRID_SIZE = 8;
const VERT_COUNT = (GRID_SEG + 1) * (GRID_SEG + 1);

function buildSARTargets() {
  const arr = new Float32Array(VERT_COUNT * 3);
  const half = GRID_SIZE / 2;
  const step = GRID_SIZE / GRID_SEG;
  let idx = 0;
  for (let iy = 0; iy <= GRID_SEG; iy++) {
    for (let ix = 0; ix <= GRID_SEG; ix++) {
      const x = -half + ix * step;
      const y = -half + iy * step;
      const scanLine = iy / GRID_SEG;
      const warp = Math.sin(scanLine * Math.PI) * 1.2 * scanLine;
      const ripple = Math.sin(ix * 0.6 + iy * 0.4) * 0.15;
      arr[idx++] = x;
      arr[idx++] = y;
      arr[idx++] = warp + ripple;
    }
  }
  return arr;
}

function buildOceanTargets() {
  const arr = new Float32Array(VERT_COUNT * 3);
  const half = GRID_SIZE / 2;
  const step = GRID_SIZE / GRID_SEG;
  let idx = 0;
  for (let iy = 0; iy <= GRID_SEG; iy++) {
    for (let ix = 0; ix <= GRID_SEG; ix++) {
      const x = -half + ix * step;
      const y = -half + iy * step;
      const wave = Math.sin(x * 0.5 + y * 0.3) * 0.08 + Math.sin(x * 0.8 - y * 0.6) * 0.05;
      arr[idx++] = x;
      arr[idx++] = y;
      arr[idx++] = wave;
    }
  }
  return arr;
}

function buildSpillTargets() {
  const arr = new Float32Array(VERT_COUNT * 3);
  const half = GRID_SIZE / 2;
  const step = GRID_SIZE / GRID_SEG;
  const spillX = 1.5, spillY = 0.5;
  const spillRadius = 2.0;
  let idx = 0;
  for (let iy = 0; iy <= GRID_SEG; iy++) {
    for (let ix = 0; ix <= GRID_SEG; ix++) {
      const x = -half + ix * step;
      const y = -half + iy * step;
      const dx = x - spillX;
      const dy = y - spillY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const wave = Math.sin(x * 0.5 + y * 0.3) * 0.08;

      if (dist < spillRadius) {
        const t = 1.0 - dist / spillRadius;
        const pull = t * t * 0.6;
        const rise = t * t * 0.8;
        arr[idx++] = x - dx * pull * 0.3;
        arr[idx++] = y - dy * pull * 0.3;
        arr[idx++] = rise + wave * 0.3;
      } else {
        arr[idx++] = x;
        arr[idx++] = y;
        arr[idx++] = wave;
      }
    }
  }
  return arr;
}

function buildCorrelationTargets() {
  return buildSpillTargets(); // same as spill
}

function buildSpillColors() {
  const arr = new Float32Array(VERT_COUNT * 3);
  const half = GRID_SIZE / 2;
  const step = GRID_SIZE / GRID_SEG;
  const spillX = 1.5, spillY = 0.5;
  const spillRadius = 2.0;
  let idx = 0;
  for (let iy = 0; iy <= GRID_SEG; iy++) {
    for (let ix = 0; ix <= GRID_SEG; ix++) {
      const x = -half + ix * step;
      const y = -half + iy * step;
      const dx = x - spillX;
      const dy = y - spillY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < spillRadius) {
        const t = 1.0 - dist / spillRadius;
        arr[idx++] = 0.22 + t * 0.78;
        arr[idx++] = 1.0;
        arr[idx++] = 0.53 + t * 0.47;
      } else {
        arr[idx++] = 0.224;
        arr[idx++] = 1.0;
        arr[idx++] = 0.533;
      }
    }
  }
  return arr;
}

function buildDefaultColors() {
  const arr = new Float32Array(VERT_COUNT * 3);
  for (let i = 0; i < VERT_COUNT; i++) {
    arr[i * 3] = 0.224;
    arr[i * 3 + 1] = 1.0;
    arr[i * 3 + 2] = 0.533;
  }
  return arr;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CAMERA PATHS
// ═══════════════════════════════════════════════════════════════════════════════

const CAMERA_STATES = [
  { pos: [0, -3, 7], lookAt: [0, 0, 0] },
  { pos: [0, -2, 10], lookAt: [0, 1, 0] },
  { pos: [1.5, -1, 5], lookAt: [1.5, 0.5, 0] },
  { pos: [0, -2, 8], lookAt: [0.5, 0.5, 0] },
  { pos: [0.5, -6, 12], lookAt: [0.5, 1, 0] }, // stage 5 pull back
];

function lerpFloatArrays(out, a, b, t) {
  for (let i = 0; i < out.length; i++) {
    out[i] = a[i] + (b[i] - a[i]) * t;
  }
}

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 3D: Scan sweep line
// ═══════════════════════════════════════════════════════════════════════════════

const SARTicks = () => {
  const groupRef = useRef();
  const progressRefs = useContext(StageProgressContext);

  const ticksGeo = useMemo(() => {
    const points = [];
    const count = 40;
    const startY = -4;
    const endY = 4;
    for (let i = 0; i < count; i++) {
      const y = startY + (i / (count - 1)) * (endY - startY);
      const length = i % 5 === 0 ? 0.4 : 0.15;
      points.push(new THREE.Vector3(-4, y, 0));
      points.push(new THREE.Vector3(-4 + length, y, 0));
    }
    const geo = new THREE.BufferGeometry().setFromPoints(points);
    return geo;
  }, []);

  useFrame(() => {
    if (!groupRef.current || !progressRefs?.current) return;
    const p = progressRefs.current[0];
    let opacity = 0;
    if (p < 0.8) {
      opacity = (1 - p / 0.8) * 0.5;
    }
    groupRef.current.visible = opacity > 0.01;
    if (groupRef.current.material) {
      groupRef.current.material.opacity = opacity;
    }
  });

  return (
    <lineSegments ref={groupRef} geometry={ticksGeo} rotation={[-Math.PI / 4, 0, 0]}>
      <lineBasicMaterial color={WIRE_GREEN_DIM} transparent depthTest={false} />
    </lineSegments>
  );
};

const IdleScanLine = () => {
  const lineRef = useRef();
  const progressRefs = useContext(StageProgressContext);

  useFrame(({ clock }) => {
    if (!lineRef.current || !progressRefs?.current) return;
    const p = progressRefs.current[0];
    
    // Only visible in stage 1
    if (p > 0.9) {
      lineRef.current.visible = false;
      return;
    }
    
    lineRef.current.visible = true;
    const time = clock.elapsedTime;
    
    // Loop from x = -4 to 4
    const cycle = (time * 0.4) % 1.0; 
    const xPos = -4 + cycle * 8;
    lineRef.current.position.set(xPos, 0, 0.5);
    
    // Fade at edges
    const edgeFade = Math.sin(cycle * Math.PI);
    const stageFade = 1 - p;
    lineRef.current.material.opacity = edgeFade * stageFade * 0.6;
  });

  return (
    <mesh ref={lineRef} rotation={[-Math.PI / 4, 0, 0]}>
      <planeGeometry args={[0.02, 8]} />
      <meshBasicMaterial color={WIRE_GREEN} transparent opacity={0} side={THREE.DoubleSide} depthTest={false} />
    </mesh>
  );
};

const ScanSweepLine = () => {
  const mesh1Ref = useRef();
  const mesh2Ref = useRef();
  const progressRefs = useContext(StageProgressContext);

  useFrame(({ clock }) => {
    if (!mesh1Ref.current || !mesh2Ref.current || !progressRefs?.current) return;
    const progs = progressRefs.current;
    let activeStage = 0;
    for (let i = 0; i < 5; i++) {
      if (progs[i] > 0.01) activeStage = i;
    }
    const p = progs[activeStage];
    const time = clock.elapsedTime;
    const pulse = (Math.sin(time * 5) * 0.5 + 0.5) * 0.4 + 0.6; // 0.6 to 1.0

    if (activeStage === 0) {
      mesh1Ref.current.visible = true;
      mesh2Ref.current.visible = true;
      mesh1Ref.current.position.set(-5 + p * 10, 0, 0.5);
      mesh2Ref.current.position.set(5 - p * 10, 0, 0.5);
      
      const edgeFade = Math.min(p / 0.1, 1) * Math.min((1 - p) / 0.1, 1);
      mesh1Ref.current.material.opacity = edgeFade * 0.8 * pulse;
      mesh2Ref.current.material.opacity = edgeFade * 0.8 * pulse;
    } else {
      mesh2Ref.current.visible = false;
      const sweepStart = 0.15;
      const sweepEnd = 0.45;
      if (p >= sweepStart && p <= sweepEnd) {
        const sweepT = (p - sweepStart) / (sweepEnd - sweepStart);
        mesh1Ref.current.visible = true;
        mesh1Ref.current.position.set(-5 + sweepT * 10, 0, 0.5);
        const edgeFade = Math.min(sweepT / 0.1, 1) * Math.min((1 - sweepT) / 0.1, 1);
        mesh1Ref.current.material.opacity = edgeFade * 0.9 * pulse;
      } else {
        mesh1Ref.current.visible = false;
      }
    }
  });

  return (
    <group rotation={[-Math.PI / 4, 0, 0]}>
      <mesh ref={mesh1Ref} visible={false}>
        <planeGeometry args={[0.03, 12]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0} side={THREE.DoubleSide} depthTest={false} />
      </mesh>
      <mesh ref={mesh2Ref} visible={false}>
        <planeGeometry args={[0.03, 12]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0} side={THREE.DoubleSide} depthTest={false} />
      </mesh>
    </group>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// 3D: Shared morphing grid with ambient animation
// ═══════════════════════════════════════════════════════════════════════════════

const SharedGrid = () => {
  const meshRef = useRef();
  const progressRefs = useContext(StageProgressContext);
  const lastP = useRef(0);
  const velocity = useRef(0);

  const targets = useMemo(() => [
    buildSARTargets(),
    buildOceanTargets(),
    buildSpillTargets(),
    buildCorrelationTargets(),
  ], []);

  const defaultColors = useMemo(() => buildDefaultColors(), []);
  const spillColors = useMemo(() => buildSpillColors(), []);
  const tempPos = useMemo(() => new Float32Array(VERT_COUNT * 3), []);
  const tempCol = useMemo(() => new Float32Array(VERT_COUNT * 3), []);

  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(GRID_SIZE, GRID_SIZE, GRID_SEG, GRID_SEG);
    geo.setAttribute('color', new THREE.BufferAttribute(buildDefaultColors(), 3));
    return geo;
  }, []);

  useFrame(({ clock }, delta) => {
    if (!meshRef.current || !progressRefs?.current) return;
    const progs = progressRefs.current;
    const time = clock.elapsedTime;

    let activeStage = 0;
    for (let i = 0; i < 4; i++) {
      if (progs[i] > 0.01) activeStage = i;
    }

    const p = progs[activeStage];
    
    const rawVel = delta > 0 ? Math.abs(p - lastP.current) / delta : 0;
    const cappedVel = Math.min(rawVel, 5.0);
    velocity.current = THREE.MathUtils.lerp(velocity.current, cappedVel, delta * 10);
    lastP.current = p;
    
    const deformStrength = Math.min(velocity.current * 1.5, 1.2);

    const activeRays = [];
    if (activeStage === 0) {
      activeRays.push(-5 + p * 10);
      activeRays.push(5 - p * 10);
    } else {
      if (p >= 0.15 && p <= 0.45) {
        const sweepT = (p - 0.15) / 0.3;
        activeRays.push(-5 + sweepT * 10);
      }
    }

    const currentTargets = targets[activeStage];
    const nextTargets = targets[Math.min(activeStage + 1, 3)];

    let morphT = 0;
    if (p > 0.5) {
      morphT = easeInOutCubic((p - 0.5) * 2);
    }
    lerpFloatArrays(tempPos, currentTargets, nextTargets, morphT);

    let colorT = 0;
    if (activeStage >= 2) {
      colorT = 1;
    } else if (activeStage === 1 && p > 0.5) {
      colorT = easeInOutCubic((p - 0.5) * 2);
    }
    lerpFloatArrays(tempCol, defaultColors, spillColors, colorT);

    const posAttr = geometry.getAttribute('position');
    const colAttr = geometry.getAttribute('color');
    for (let i = 0; i < VERT_COUNT; i++) {
      const x = tempPos[i * 3];
      const y = tempPos[i * 3 + 1];
      let z = tempPos[i * 3 + 2];

      z += (Math.sin(x * 1.5 + time * 2) * 0.03) + (Math.cos(y * 1.5 + time * 1.5) * 0.03);

      if (deformStrength > 0.01) {
        for (const rayX of activeRays) {
          const dist = Math.abs(x - rayX);
          const radius = 1.0;
          if (dist < radius) {
            const t = 1.0 - (dist / radius);
            const bump = Math.sin(t * Math.PI / 2) * 0.4;
            z += bump * deformStrength;
          }
        }
      }

      let r = tempCol[i * 3], g = tempCol[i * 3 + 1], b = tempCol[i * 3 + 2];
      
      if (activeStage >= 2) {
        const dx = x - 1.5;
        const dy = y - 0.5;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 2.0) {
          const t = 1.0 - dist / 2.0;
          z += t * Math.sin(time * 3) * 0.1;
          const pulse = Math.sin(time * 3) * 0.08;
          r = Math.min(1, r + t * pulse);
          g = Math.min(1, g + t * pulse);
          b = Math.min(1, b + t * pulse);
        }
      }

      posAttr.setXYZ(i, x, y, z);
      colAttr.setXYZ(i, r, g, b);
    }
    posAttr.needsUpdate = true;
    colAttr.needsUpdate = true;
  });

  return (
    <mesh ref={meshRef} geometry={geometry} rotation={[-Math.PI / 4, 0, 0]}>
      <meshBasicMaterial
        color="#39FF88"
        wireframe
        transparent
        opacity={1}
        vertexColors
      />
    </mesh>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// 3D: Stage 2 — Satellite hero
// ═══════════════════════════════════════════════════════════════════════════════

const SatelliteHero = () => {
  const groupRef = useRef();
  const panelsRef = useRef();
  const progressRefs = useContext(StageProgressContext);

  useFrame(({ clock }, delta) => {
    if (!groupRef.current || !progressRefs?.current) return;
    const time = clock.elapsedTime;
    const p = progressRefs.current[1];

    let opacity = 0;
    let scale = 0;
    if (p < 0.1) {
      opacity = 0; scale = 0;
    } else if (p < 0.4) {
      const t = (p - 0.1) / 0.3;
      opacity = easeInOutCubic(t) * 0.7;
      scale = easeInOutCubic(t);
    } else if (p < 0.7) {
      opacity = 0.7; scale = 1;
    } else {
      const t = (p - 0.7) / 0.3;
      opacity = (1 - easeInOutCubic(t)) * 0.7;
      scale = 1 - easeInOutCubic(t) * 0.3;
    }

    groupRef.current.visible = opacity > 0.01;
    groupRef.current.scale.setScalar(scale || 0.001);

    // Ambient floating & rotation
    groupRef.current.position.y = 3.5 + Math.sin(time * 1.5) * 0.1;
    groupRef.current.rotation.z = Math.sin(time * 0.8) * 0.05;

    groupRef.current.traverse((child) => {
      if (child.material && !child.userData.isCone) {
        child.material.opacity = opacity;
        child.material.transparent = true;
      } else if (child.material && child.userData.isCone) {
        child.material.opacity = opacity * 0.1;
      }
    });

    if (panelsRef.current) {
      panelsRef.current.rotation.y += delta * 0.2; // Continuous self-rotation
      
      const antenna = panelsRef.current.children[3];
      if (antenna) {
        antenna.material.opacity = opacity * (0.5 + 0.5 * Math.sin(time * 5));
      }
    }
  });

  return (
    <group ref={groupRef} position={[0, 3.5, 0]} visible={false}>
      <group ref={panelsRef}>
        <mesh>
          <boxGeometry args={[0.6, 0.4, 0.6]} />
          <meshBasicMaterial color={WIRE_GREEN} wireframe transparent />
        </mesh>
        <mesh position={[-1.4, 0, 0]}>
          <boxGeometry args={[1.8, 0.05, 0.8]} />
          <meshBasicMaterial color={WIRE_GREEN} wireframe transparent />
        </mesh>
        <mesh position={[1.4, 0, 0]}>
          <boxGeometry args={[1.8, 0.05, 0.8]} />
          <meshBasicMaterial color={WIRE_GREEN} wireframe transparent />
        </mesh>
        <mesh position={[0, 0.4, 0]}>
          <coneGeometry args={[0.15, 0.5, 6]} />
          <meshBasicMaterial color={WIRE_GREEN} wireframe transparent />
        </mesh>
      </group>
      <mesh position={[0, -2, 0]} rotation={[Math.PI, 0, 0]} userData={{ isCone: true }}>
        <coneGeometry args={[2.5, 4, 16]} />
        <meshBasicMaterial color={WIRE_GREEN_DIM} wireframe transparent opacity={0.1} depthWrite={false} />
      </mesh>
    </group>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// 3D: Stage 2 — Vessel ping dots
// ═══════════════════════════════════════════════════════════════════════════════

const VESSEL_PINGS = [
  { id: 'V-2741', x: -2.5, y: -1.5 },
  { id: 'V-0892', x: 1.0, y: -2.5 },
  { id: 'V-1463', x: 3.0, y: 0.5 },
  { id: 'V-0337', x: -1.0, y: 1.5 },
  { id: 'V-5519', x: 2.5, y: 2.0 },
];

const VesselPing = ({ position, delay, getOpacity }) => {
  const ref = useRef();
  const wakeRef = useRef();
  
  const wakeGeo = useMemo(() => {
    return new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, -0.1, 0)
    ]);
  }, []);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const time = clock.elapsedTime;
    const baseOpacity = getOpacity();
    if (baseOpacity < 0.01) {
      ref.current.visible = false;
      if (wakeRef.current) wakeRef.current.visible = false;
      return;
    }
    ref.current.visible = true;
    if (wakeRef.current) wakeRef.current.visible = true;
    
    // Staggered blink loop
    const blink = (Math.sin(time * 3 + delay) * 0.5 + 0.5) * 0.5 + 0.5; // 0.5 -> 1.0
    ref.current.scale.setScalar(blink);
    if (ref.current.material) {
      ref.current.material.opacity = baseOpacity * blink;
    }

    if (wakeRef.current) {
      wakeRef.current.children.forEach((child, i) => {
        const offsetDelay = time * 2 - i * 0.5;
        const wakeBlink = (Math.sin(offsetDelay) * 0.5 + 0.5);
        child.material.opacity = baseOpacity * wakeBlink * 0.5;
      });
    }
  });
  return (
    <group position={position}>
      <mesh ref={ref}>
        <circleGeometry args={[0.08, 16]} />
        <meshBasicMaterial color={WIRE_GREEN} transparent depthTest={false} />
      </mesh>
      <group ref={wakeRef} rotation={[0, 0, delay * 2]} position={[0, -0.1, 0]}>
        <lineSegments geometry={wakeGeo}>
          <lineBasicMaterial color={WIRE_GREEN_DIM} transparent depthTest={false} />
        </lineSegments>
        <lineSegments geometry={wakeGeo} position={[0, -0.15, 0]}>
          <lineBasicMaterial color={WIRE_GREEN_DIM} transparent depthTest={false} />
        </lineSegments>
      </group>
    </group>
  );
};

const VesselPings = () => {
  const groupRef = useRef();
  const progressRefs = useContext(StageProgressContext);

  const getOpacity = () => {
    if (!progressRefs?.current) return 0;
    const p = progressRefs.current[1];
    if (p > 0.3 && p < 0.9) {
      const fadeIn = Math.min((p - 0.3) / 0.15, 1);
      const fadeOut = p > 0.75 ? 1 - (p - 0.75) / 0.15 : 1;
      return fadeIn * fadeOut;
    }
    return 0;
  };

  return (
    <group ref={groupRef} rotation={[-Math.PI / 4, 0, 0]}>
      {VESSEL_PINGS.map((v, i) => (
        <VesselPing key={v.id} position={[v.x, v.y, 0.15]} delay={i} getOpacity={getOpacity} />
      ))}
    </group>
  );
};

const SatelliteBeam = () => {
  const lineRef = useRef();
  const progressRefs = useContext(StageProgressContext);

  const beamGeo = useMemo(() => {
    return new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 3.5, 0),
      new THREE.Vector3(1.0, -1.76, 1.76), // Approximate target: vessel ping V-0892
    ]);
  }, []);

  useFrame(({ clock }) => {
    if (!lineRef.current || !progressRefs?.current) return;
    const p = progressRefs.current[1];
    const time = clock.elapsedTime;
    
    let opacity = 0;
    if (p > 0.1 && p < 0.5) {
      if (p < 0.2) opacity = (p - 0.1) / 0.1;
      else if (p > 0.4) opacity = 1 - (p - 0.4) / 0.1;
      else opacity = 1;
    }
    
    lineRef.current.visible = opacity > 0.01;
    if (lineRef.current.visible) {
      lineRef.current.material.opacity = opacity * 0.4;
      lineRef.current.material.dashOffset -= 0.01;
      
      const positions = lineRef.current.geometry.attributes.position.array;
      positions[1] = 3.5 + Math.sin(time * 1.5) * 0.1;
      lineRef.current.geometry.attributes.position.needsUpdate = true;
    }
  });

  return (
    <line ref={lineRef} geometry={beamGeo}>
      <lineDashedMaterial color={WIRE_GREEN} transparent dashSize={0.2} gapSize={0.2} />
    </line>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// 3D: Stage 3 — Spill Mask Contour
// ═══════════════════════════════════════════════════════════════════════════════

const SpillMaskContour = () => {
  const lineRef = useRef();
  const progressRefs = useContext(StageProgressContext);

  const contourGeo = useMemo(() => {
    const points = [];
    const radius = 1.9; // Just inside the main deformation
    const segments = 40;
    for (let i = 0; i <= segments; i++) {
      const theta = (i / segments) * Math.PI * 2;
      const x = 1.5 + Math.cos(theta) * radius + (Math.sin(theta * 3) * 0.1);
      const y = 0.5 + Math.sin(theta) * radius + (Math.cos(theta * 4) * 0.1);
      points.push(new THREE.Vector3(x, y, 0.1));
    }
    return new THREE.BufferGeometry().setFromPoints(points);
  }, []);

  useFrame(() => {
    if (!lineRef.current || !progressRefs?.current) return;
    const p3 = progressRefs.current[2]; // Stage 3
    const p4 = progressRefs.current[3]; // Stage 4
    const p5 = progressRefs.current[4]; // Stage 5

    let opacity = 0;
    if (p5 > 0.1) {
      opacity = 0; // Hide in Stage 5, Convergence lines take over
    } else if (p4 > 0.01) {
      opacity = 0.3; // Dim in Stage 4
    } else if (p3 > 0.1) {
      opacity = Math.min((p3 - 0.1) / 0.2, 1) * 0.8; // Fade in during Stage 3
    }
    
    lineRef.current.visible = opacity > 0.01;
    if (lineRef.current.visible) {
      lineRef.current.material.opacity = opacity;
    }
  });

  return (
    <lineLoop ref={lineRef} geometry={contourGeo} rotation={[-Math.PI / 4, 0, 0]}>
      <lineBasicMaterial color={WIRE_GREEN_DIM} transparent />
    </lineLoop>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// 3D: Stage 4 — Vessel wireframes + correlation lines
// ═══════════════════════════════════════════════════════════════════════════════

const CORRELATION_VESSELS = [
  { id: 'OLYMPUS TITAN', x: -2.5, y: -2.0, distance: '12.3 nm', dt: '4h', suspect: true },
  { id: 'PETRO CROWN', x: 3.0, y: -1.5, distance: '28.7 nm', dt: '7h', suspect: false },
  { id: 'SEA ATLAS', x: -1.5, y: 2.5, distance: '41.2 nm', dt: '11h', suspect: false },
  { id: 'NORDIC SPIRIT', x: 3.5, y: 2.0, distance: '58.9 nm', dt: '14h', suspect: false },
];
const SPILL_CENTER = { x: 1.5, y: 0.5 };

const VesselHull = ({ position, suspect, delay }) => {
  const ref = useRef();
  const progressRefs = useContext(StageProgressContext);
  
  const hullGeo = useMemo(() => {
    const points = [
      new THREE.Vector3(0, 0.35, 0),
      new THREE.Vector3(0.08, 0.15, 0),
      new THREE.Vector3(0.08, -0.35, 0),
      new THREE.Vector3(-0.08, -0.35, 0),
      new THREE.Vector3(-0.08, 0.15, 0),
      new THREE.Vector3(0, 0.35, 0),
    ];
    return new THREE.BufferGeometry().setFromPoints(points);
  }, []);

  useFrame(({ clock }) => {
    if (ref.current) {
      const time = clock.elapsedTime;
      ref.current.position.z = position[2] + Math.sin(time * 2 + delay) * 0.02;
      ref.current.rotation.x = Math.sin(time * 1.5 + delay) * 0.05;
      ref.current.rotation.y = Math.cos(time * 1.2 + delay) * 0.05;
      ref.current.rotation.z = (delay * 1.2) + Math.sin(time * 0.5 + delay) * 0.05;

      const p = progressRefs?.current ? progressRefs.current[3] : 0;
      let opacity = 1;
      if (!suspect && p > 0.6) {
         opacity = Math.max(0.2, 1 - (p - 0.6) / 0.2);
      }
      
      const material = ref.current.children[0]?.material;
      if (material) {
        material.opacity = opacity;
      }
    }
  });
  
  return (
    <group ref={ref} position={position}>
      <line geometry={hullGeo}>
        <lineBasicMaterial color={suspect ? CORR_SUSPECT_COLOR : WIRE_GREEN} transparent linewidth={suspect ? 2 : 1} />
      </line>
    </group>
  );
};

const CorrelationStage = () => {
  const groupRef = useRef();
  const linesRef = useRef([]);
  const progressRefs = useContext(StageProgressContext);
  const time = useRef(0);

  const lineGeos = useMemo(() => {
    return CORRELATION_VESSELS.map((v) => {
      const points = [];
      const segments = 30;
      for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        points.push(new THREE.Vector3(
          v.x + (SPILL_CENTER.x - v.x) * t,
          v.y + (SPILL_CENTER.y - v.y) * t,
          0.1
        ));
      }
      return new THREE.BufferGeometry().setFromPoints(points);
    });
  }, []);

  const lineObjects = useMemo(() => {
    return CORRELATION_VESSELS.map((v, i) => {
      return new THREE.Line(
        lineGeos[i],
        new THREE.LineBasicMaterial({
          color: v.suspect ? CORR_SUSPECT_COLOR : CORR_LINE_COLOR,
          transparent: true,
          opacity: 0,
          linewidth: 1,
        })
      );
    });
  }, [lineGeos]);

  useFrame((_, delta) => {
    if (!groupRef.current || !progressRefs?.current) return;
    time.current += delta;

    const p = progressRefs.current[3];
    let stageOpacity = 0;
    if (p > 0.1) { // Removed fade-out at end so it persists into Stage 5
      stageOpacity = Math.min((p - 0.1) / 0.2, 1);
    }
    groupRef.current.visible = stageOpacity > 0.01;

    const sweepStart = 0.15;
    const sweepEnd = 0.45;
    let sweepX = -999;
    if (p >= sweepStart && p <= sweepEnd) {
      const sweepT = (p - sweepStart) / (sweepEnd - sweepStart);
      sweepX = -5 + sweepT * 10; 
    } else if (p > sweepEnd) {
      sweepX = 999; 
    }

    linesRef.current.forEach((line, i) => {
      if (!line) return;
      const vessel = CORRELATION_VESSELS[i];
      const geo = line.geometry;
      const totalVerts = geo.getAttribute('position').count;
      const lineDrawStart = 0.15 + i * 0.06;
      let drawProgress = 0;
      if (p > lineDrawStart) {
        drawProgress = Math.min((p - lineDrawStart) / 0.2, 1);
      }
      geo.setDrawRange(0, Math.floor(drawProgress * totalVerts));

      const vesselRevealed = vessel.x < sweepX;
      const revealFade = vesselRevealed ? 1 : 0;

      if (line.material) {
        if (vessel.suspect) {
          line.material.color.set(CORR_SUSPECT_COLOR);
          line.material.opacity = stageOpacity * revealFade * (0.7 + Math.sin(time.current * 3) * 0.3);
          line.material.linewidth = 2;
        } else {
          let dimMultiplier = 1;
          if (p > 0.6) {
             dimMultiplier = Math.max(0.15, 1 - (p - 0.6) / 0.2);
          }
          line.material.color.set(CORR_LINE_COLOR);
          line.material.opacity = stageOpacity * revealFade * 0.6 * dimMultiplier;
          line.material.linewidth = 1;
        }
      }
    });

    groupRef.current.traverse((child) => {
      if (child.isMesh && child.geometry.type === 'BoxGeometry') {
        child.material.opacity = stageOpacity * 0.8;
      }
    });
  });

  return (
    <group ref={groupRef} rotation={[-Math.PI / 4, 0, 0]} visible={false}>
      {lineObjects.map((obj, i) => (
        <primitive key={`line-${i}`} ref={(el) => { linesRef.current[i] = el; }} object={obj} />
      ))}
      {CORRELATION_VESSELS.map((v, i) => (
        <VesselHull key={v.id} position={[v.x, v.y, 0.2]} suspect={v.suspect} delay={i} />
      ))}
    </group>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// 3D: Stage 5 — Report Panel Wireframe
// ═══════════════════════════════════════════════════════════════════════════════

const ReportPanel3D = () => {
  const panelRef = useRef();
  const strutRef = useRef();
  const progressRefs = useContext(StageProgressContext);
  
  useFrame(({ clock }) => {
    if (!panelRef.current || !progressRefs?.current) return;
    const p = progressRefs.current[4];
    
    let opacity = 0;
    let rise = 0;
    if (p > 0.1) {
      const t = Math.min((p - 0.1) / 0.4, 1);
      const ease = easeInOutCubic(t);
      opacity = ease;
      rise = ease;
    }
    // Safety clamp: if progress is past halfway, ensure fully risen
    if (p >= 0.5) {
      rise = 1;
      opacity = 1;
    }
    
    const isVisible = opacity > 0.01;
    panelRef.current.visible = isVisible;
    if (strutRef.current) strutRef.current.visible = isVisible;
    
    const time = clock.elapsedTime;
    const zPos = -1.0 + (rise * 3.5) + Math.sin(time * 1.5) * 0.1;
    
    panelRef.current.position.z = zPos;
    panelRef.current.rotation.z = Math.sin(time * 0.8) * 0.02; 
    
    panelRef.current.traverse((child) => {
      if (child.isLine || child.isMesh) {
        if (child.material) {
           child.material.opacity = opacity * (child.userData.dim ? 0.2 : 1);
        }
      }
    });

    if (strutRef.current) {
      strutRef.current.material.opacity = opacity * 0.4;
      const positions = strutRef.current.geometry.attributes.position.array;
      positions[2] = 0; 
      positions[5] = zPos; 
      strutRef.current.geometry.attributes.position.needsUpdate = true;
    }
  });

  const cornerGeo = useMemo(() => {
    const points = [];
    const w = 3.5;
    const h = 2.25;
    const cl = 0.5;
    points.push(new THREE.Vector3(-w, h - cl, 0), new THREE.Vector3(-w, h, 0), new THREE.Vector3(-w, h, 0), new THREE.Vector3(-w + cl, h, 0));
    points.push(new THREE.Vector3(w - cl, h, 0), new THREE.Vector3(w, h, 0), new THREE.Vector3(w, h, 0), new THREE.Vector3(w, h - cl, 0));
    points.push(new THREE.Vector3(w, -h + cl, 0), new THREE.Vector3(w, -h, 0), new THREE.Vector3(w, -h, 0), new THREE.Vector3(w - cl, -h, 0));
    points.push(new THREE.Vector3(-w + cl, -h, 0), new THREE.Vector3(-w, -h, 0), new THREE.Vector3(-w, -h, 0), new THREE.Vector3(-w, -h + cl, 0));
    return new THREE.BufferGeometry().setFromPoints(points);
  }, []);

  const strutGeo = useMemo(() => {
    return new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, 1),
    ]);
  }, []);

  return (
    <group position={[1.5, 0.5, 0]} rotation={[-Math.PI / 4, 0, 0]}>
      <line ref={strutRef} geometry={strutGeo}>
        <lineBasicMaterial color={WIRE_GREEN} transparent opacity={0} />
      </line>
      <group ref={panelRef} visible={false}>
        <lineSegments geometry={cornerGeo}>
          <lineBasicMaterial color={WIRE_GREEN} transparent opacity={0} linewidth={2} />
        </lineSegments>
        <mesh userData={{ dim: true }}>
           <planeGeometry args={[7, 4.5, 2, 2]} />
           <meshBasicMaterial color={WIRE_GREEN} wireframe transparent opacity={0} />
        </mesh>
      </group>
    </group>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// 3D: Stage 5 — Convergence Lines
// ═══════════════════════════════════════════════════════════════════════════════

const ConvergenceLines = () => {
  const groupRef = useRef();
  const progressRefs = useContext(StageProgressContext);
  
  const lineGeo1 = useMemo(() => {
    return new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(1.5, 0.5, 0.1),
      new THREE.Vector3(1.5, 0.5, 2.0),
    ]);
  }, []);
  
  const lineGeo2 = useMemo(() => {
    return new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-2.5, -2.0, 0.2),
      new THREE.Vector3(1.5, 0.5, 2.0),
    ]);
  }, []);

  useFrame(() => {
    if (!groupRef.current || !progressRefs?.current) return;
    const p = progressRefs.current[4];
    
    let opacity = 0;
    let dashOffset = 0;
    
    if (p > 0.1 && p < 0.4) {
      const t = (p - 0.1) / 0.3; // 0 to 1
      opacity = Math.sin(t * Math.PI); // Fades in then out
      dashOffset = -t * 5;
    }
    
    groupRef.current.visible = opacity > 0.01;
    if (groupRef.current.visible) {
      groupRef.current.children.forEach(child => {
        child.material.opacity = opacity * 0.8;
        child.material.dashOffset = dashOffset;
      });
    }
  });

  return (
    <group ref={groupRef} rotation={[-Math.PI / 4, 0, 0]} visible={false}>
      <line geometry={lineGeo1}>
        <lineDashedMaterial color={WIRE_GREEN} transparent dashSize={0.2} gapSize={0.2} />
      </line>
      <line geometry={lineGeo2}>
        <lineDashedMaterial color={CORR_SUSPECT_COLOR} transparent dashSize={0.2} gapSize={0.2} />
      </line>
    </group>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// 3D: Camera controller
// ═══════════════════════════════════════════════════════════════════════════════

const CameraController = () => {
  const { camera } = useThree();
  const progressRefs = useContext(StageProgressContext);
  const posVec = useMemo(() => new THREE.Vector3(), []);
  const lookVec = useMemo(() => new THREE.Vector3(), []);
  const tempPos = useMemo(() => new THREE.Vector3(), []);
  const tempLook = useMemo(() => new THREE.Vector3(), []);

  useFrame(() => {
    if (!progressRefs?.current) return;
    const progs = progressRefs.current;

    let activeStage = 0;
    for (let i = 0; i < 5; i++) {
      if (progs[i] > 0.01) activeStage = i;
    }

    const p = progs[activeStage];
    const curr = CAMERA_STATES[activeStage];
    const next = CAMERA_STATES[Math.min(activeStage + 1, 4)];

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
  return null;
};

// ═══════════════════════════════════════════════════════════════════════════════
// DOM: Scan-reveal CSS overlay labels
// ═══════════════════════════════════════════════════════════════════════════════

const SpillMaskLabel = ({ stageProgress }) => {
  const p3 = stageProgress[2] || 0;
  const p4 = stageProgress[3] || 0;
  
  let opacity = 0;
  if (p4 > 0.01) {
    opacity = 0.4;
  } else if (p3 > 0.4) {
    opacity = Math.min((p3 - 0.4) / 0.2, 1);
  }
  
  if (opacity < 0.01) return null;

  return (
    <div
      style={{
        position: 'fixed',
        left: '55%',
        top: '38%',
        zIndex: 12,
        opacity,
        fontFamily: 'var(--font-mono)',
        color: WIRE_GREEN,
        textShadow: '0 0 10px rgba(0,0,0,0.9), 0 1px 4px rgba(0,0,0,0.8)',
        pointerEvents: 'none',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        transform: `scale(${0.95 + opacity * 0.05})`,
        transition: 'opacity 0.2s ease, transform 0.2s ease'
      }}
    >
      <div style={{ fontSize: '0.65rem', letterSpacing: '0.1em', opacity: 0.8 }}>ANOMALY_MASK_01</div>
      <div style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>[ CONF: 94.2% ]</div>
      <div style={{ fontSize: '0.6rem', opacity: 0.6 }}>24° 18' N, 88° 03' E</div>
    </div>
  );
};

const VESSEL_LABEL_POSITIONS = [
  { id: 'V-2741', left: '22%', top: '68%' },
  { id: 'V-0892', left: '48%', top: '76%' },
  { id: 'V-1463', left: '68%', top: '52%' },
  { id: 'V-0337', left: '38%', top: '48%' },
  { id: 'V-5519', left: '62%', top: '42%' },
];

const CORR_LABEL_POSITIONS = [
  { id: 'OLYMPUS TITAN', label: '12.3 nm · Δt 4h', left: '24%', top: '66%', suspect: true },
  { id: 'PETRO CROWN', label: '28.7 nm · Δt 7h', left: '66%', top: '62%', suspect: false },
  { id: 'SEA ATLAS', label: '41.2 nm · Δt 11h', left: '30%', top: '38%', suspect: false },
  { id: 'NORDIC SPIRIT', label: '58.9 nm · Δt 14h', left: '70%', top: '40%', suspect: false },
];

const ScanRevealLabels = ({ stageProgress, type }) => {
  const stageIdx = type === 'vessel' ? 1 : 3;
  const p = stageProgress[stageIdx] || 0;
  const items = type === 'vessel' ? VESSEL_LABEL_POSITIONS : CORR_LABEL_POSITIONS;

  const sweepStart = 0.15;
  const sweepEnd = 0.45;
  let sweepPercent = 0; 
  if (p >= sweepStart && p <= sweepEnd) {
    sweepPercent = ((p - sweepStart) / (sweepEnd - sweepStart)) * 100;
  } else if (p > sweepEnd) {
    sweepPercent = 100;
  }

  let stageFade = 0;
  if (p > 0.2 && p < 0.85) {
    const fadeIn = Math.min((p - 0.2) / 0.1, 1);
    const fadeOut = p > 0.7 ? 1 - (p - 0.7) / 0.15 : 1;
    stageFade = fadeIn * fadeOut;
  }

  if (stageFade < 0.01) return null;

  return (
    <>
      {items.map((item) => {
        const leftNum = parseFloat(item.left);
        const revealed = sweepPercent > leftNum;
        let labelOpacity = revealed ? stageFade : 0;
        
        if (!item.suspect && type === 'correlation' && p > 0.6) {
          labelOpacity *= Math.max(0.2, 1 - (p - 0.6) / 0.2);
        }

        return (
          <div
            key={item.id}
            style={{
              position: 'fixed',
              left: item.left,
              top: item.top,
              zIndex: 12,
              opacity: labelOpacity,
              transform: `translateY(${revealed ? 0 : 8}px)`,
              transition: 'opacity 0.4s ease, transform 0.4s ease',
              pointerEvents: 'none',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.6rem',
              letterSpacing: '0.08em',
              color: item.suspect ? CORR_SUSPECT_COLOR : 'var(--bone)',
              textShadow: '0 0 8px rgba(0,0,0,0.9), 0 1px 4px rgba(0,0,0,0.8)',
              whiteSpace: 'nowrap',
            }}
          >
            {type === 'vessel' ? item.id : item.label}
          </div>
        );
      })}
    </>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// DOM: HUD text block overlay (TOP-LEFT, below topbar)
// ═══════════════════════════════════════════════════════════════════════════════

const STAGE5_STATS = [
  { label: 'IOU SCORE', value: '0.847' },
  { label: 'VESSELS SCANNED', value: '5' },
  { label: 'CORRELATION LATENCY', value: '2.3s' },
  { label: 'MATCHED VESSEL', value: 'OLYMPUS TITAN (98%)', highlight: true },
];

const StageHUD = ({ stageProgress }) => {
  let activeStage = 0;
  for (let i = 0; i < 5; i++) {
    if (stageProgress[i] > 0.01) activeStage = i;
  }

  const stage = STAGES[activeStage];
  const p = stageProgress[activeStage];

  let textOpacity = 0;
  let textY = 20;
  if (p < 0.15) {
    textOpacity = p / 0.15;
    textY = 20 * (1 - textOpacity);
  } else if (p > 0.85 && activeStage < 4) { // Stage 5 HUD doesn't fade out at end
    textOpacity = (1 - p) / 0.15;
    textY = -20 * (1 - textOpacity);
  } else {
    textOpacity = 1;
    textY = 0;
  }

  // Stage 5 stats fade in slightly after the HUD text
  let statsOpacity = 0;
  if (activeStage === 4 && p > 0.3) {
    statsOpacity = easeInOutCubic(Math.min((p - 0.3) / 0.3, 1));
  }

  return (
    <div
      className="fixed z-10 w-[90%] max-w-[420px] left-4 sm:left-10"
      style={{
        top: '60px',
        opacity: textOpacity,
        transform: `translateY(${textY}px)`,
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          color: 'var(--phosphor)',
          fontFamily: 'var(--font-mono)',
          fontSize: '0.8rem',
          letterSpacing: '0.15em',
          marginBottom: '8px',
        }}
      >
        {stage.eyebrow}
      </div>
      <h2
        style={{
          fontSize: 'clamp(1.8rem, 4vw, 3rem)',
          fontWeight: 700,
          margin: '0 0 12px 0',
          fontFamily: 'var(--font-mono)',
          letterSpacing: '-0.02em',
          lineHeight: 1,
          color: 'var(--bone)',
          textTransform: 'uppercase',
        }}
      >
        {stage.title}
      </h2>
      <p
        style={{
          fontSize: '0.85rem',
          opacity: 0.7,
          margin: 0,
          fontFamily: 'var(--font-mono)',
          lineHeight: 1.6,
          color: 'var(--bone)',
        }}
      >
        {stage.description}
      </p>

      {/* Stage 5 inline stat readout */}
      {activeStage === 4 && statsOpacity > 0.01 && (
        <div
          style={{
            marginTop: '20px',
            opacity: statsOpacity,
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            borderTop: '1px solid rgba(57,255,136,0.15)',
            paddingTop: '16px',
          }}
        >
          {STAGE5_STATS.map((stat) => (
            <div
              key={stat.label}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.75rem',
                letterSpacing: '0.08em',
              }}
            >
              <span style={{ color: 'var(--bone)', opacity: 0.5 }}>{stat.label}</span>
              <span
                style={{
                  color: stat.highlight ? '#FFD700' : 'var(--phosphor)',
                  fontWeight: stat.highlight ? 'bold' : 'normal',
                  textShadow: stat.highlight ? '0 0 10px rgba(255,215,0,0.4)' : 'none',
                }}
              >
                {stat.value}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};



// ═══════════════════════════════════════════════════════════════════════════════
// DOM: Footer status ticker
// ═══════════════════════════════════════════════════════════════════════════════

const ALL_FEEDS = ['SAR FEED', 'AIS STREAM', 'SENTINEL-1 API'];

const ArchFooterTicker = ({ activeFeeds }) => (
  <div
    className="flex flex-wrap items-center justify-center gap-3 sm:gap-6 px-4 sm:px-6 py-2"
    style={{
      position: 'fixed',
      bottom: 0, left: 0, right: 0,
      zIndex: 15,
      background: 'rgba(5,8,5,0.92)',
      backdropFilter: 'blur(16px)',
      borderTop: '1px solid rgba(57,255,136,0.08)',
    }}
  >
    {ALL_FEEDS.map((feed) => {
      const isActive = activeFeeds.includes(feed);
      return (
        <div key={feed} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              fontFamily: 'var(--font-mono)', fontSize: '0.65rem', letterSpacing: '0.1em',
              color: 'var(--bone)', opacity: isActive ? 0.7 : 0.25,
              transition: 'opacity 0.5s ease',
            }}
          >
            {feed}
          </span>
          <span
            style={{
              display: 'inline-block',
              width: isActive ? 7 : 5, height: isActive ? 7 : 5,
              borderRadius: '50%', backgroundColor: '#39FF88',
              boxShadow: isActive ? '0 0 10px rgba(57,255,136,0.8), 0 0 28px rgba(57,255,136,0.4)' : 'none',
              opacity: isActive ? 1 : 0.2,
              transition: 'all 0.5s ease',
              animation: isActive ? 'status-blink 1.5s ease-in-out infinite' : 'none',
            }}
          />
        </div>
      );
    })}
  </div>
);

// ═══════════════════════════════════════════════════════════════════════════════
// DOM: Scan sweep line overlay
// ═══════════════════════════════════════════════════════════════════════════════

function getOverlayStyle(leftPercent, edgeFade) {
  return {
    position: 'fixed',
    top: 0,
    bottom: 0,
    left: `${leftPercent}%`,
    width: '2px',
    zIndex: 11,
    background: `linear-gradient(180deg, transparent 10%, rgba(255,255,255,${edgeFade * 0.6}) 30%, rgba(255,255,255,${edgeFade * 0.9}) 50%, rgba(255,255,255,${edgeFade * 0.6}) 70%, transparent 90%)`,
    boxShadow: `0 0 12px rgba(255,255,255,${edgeFade * 0.4}), 0 0 30px rgba(57,255,136,${edgeFade * 0.2})`,
    pointerEvents: 'none',
  };
}

const ScanSweepOverlay = ({ stageProgress }) => {
  let activeStage = 0;
  for (let i = 0; i < 5; i++) {
    if (stageProgress[i] > 0.01) activeStage = i;
  }
  const p = stageProgress[activeStage] || 0;

  if (activeStage === 0) {
    const left1 = p * 100;
    const left2 = (1 - p) * 100;
    const edgeFade = Math.min(p / 0.1, 1) * Math.min((1 - p) / 0.1, 1);
    return (
      <>
        <div style={getOverlayStyle(left1, edgeFade)} />
        <div style={getOverlayStyle(left2, edgeFade)} />
      </>
    );
  } else {
    const sweepStart = 0.15;
    const sweepEnd = 0.45;
    if (p >= sweepStart && p <= sweepEnd) {
      const sweepT = (p - sweepStart) / (sweepEnd - sweepStart);
      const leftPercent = sweepT * 100;
      const edgeFade = Math.min(sweepT / 0.1, 1) * Math.min((1 - sweepT) / 0.1, 1);
      return <div style={getOverlayStyle(leftPercent, edgeFade)} />;
    }
  }
  return null;
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export default function Architecture() {
  const { stageProgress, hudProgress } = useScrollStages(5, 'arch-stage');

  let activeStage = 0;
  for (let i = 0; i < 5; i++) {
    if (hudProgress[i] > 0.01) activeStage = i;
  }
  const activeFeeds = STAGES[activeStage].feeds;

  return (
    <div style={{ background: '#050805', minHeight: '100vh', color: '#e0e5df' }}>
      {/* ── Top bar ── */}
      <div>
        <TopBar />
      </div>

      {/* ── Fixed 3D canvas (Now persistent through stage 5) ── */}
      <div
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          zIndex: 0, pointerEvents: 'none',
        }}
      >
        <StageProgressContext.Provider value={stageProgress}>
          <Canvas camera={{ position: [0, -3, 7], fov: 45 }}>
            <ambientLight intensity={0.3} />
            <SharedGrid />
            <SARTicks />
            <IdleScanLine />
            <SatelliteHero />
            <SatelliteBeam />
            <VesselPings />
            <SpillMaskContour />
            <CorrelationStage />
            <ReportPanel3D />
            <ConvergenceLines />
            <ScanSweepLine />
            <CameraController />
          </Canvas>
        </StageProgressContext.Provider>
      </div>

      {/* ── DOM scan sweep overlay ── */}
      <ScanSweepOverlay stageProgress={hudProgress} />

      {/* ── Scan-reveal labels ── */}
      <SpillMaskLabel stageProgress={hudProgress} />
      <ScanRevealLabels stageProgress={hudProgress} type="vessel" />
      <ScanRevealLabels stageProgress={hudProgress} type="correlation" />

      {/* ── HUD: stage text block ── */}
      <div>
        <StageHUD stageProgress={hudProgress} />
      </div>

      {/* ── Footer ticker ── */}
      <div>
        <ArchFooterTicker activeFeeds={activeFeeds} />
      </div>

      {/* ── Scroll trigger sections ── */}
      <div style={{ position: 'relative', zIndex: 1 }}>
        {STAGES.map((_, i) => (
          <div
            key={i}
            id={`arch-stage-${i}`}
            style={{ height: '100vh', position: 'relative' }}
          />
        ))}
        <div style={{ height: '50vh' }} />
      </div>
    </div>
  );
}
