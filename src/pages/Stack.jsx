import React, { useMemo, useRef, useContext } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { TopBar } from '../components/layout/TopBar';
import * as THREE from 'three';
import { useScrollStages, StageProgressContext } from '../hooks/useScrollStages';
import { useIdleAnimation } from '../hooks/useIdleAnimation';
import { useScanReveal } from '../hooks/useScanReveal';
import { useCameraController } from '../hooks/useThreeScene';
import { ScanSweepLine, ScanSweepOverlay, StageHUD, ArchFooterTicker, WIRE_GREEN } from '../components/hero/SharedArchitectureMechanics';

// ═══════════════════════════════════════════════════════════════════════════════
// DATA
// ═══════════════════════════════════════════════════════════════════════════════

const STAGES = [
  {
    key: 'vaibhav',
    eyebrow: 'SAR DATA ENGINEER',
    title: 'VAIBHAV',
    contextBullets: [
      'Sourced and verified the SOS dataset, image/mask pairs checked for alignment',
      'Built the train/val/test split and augmentation pipeline',
      'Handed off a clean, documented dataset the model could train against directly'
    ],
    tags: ['Sentinel-1 SAR', 'SOS Dataset (Zenodo)', 'DARTIS', 'Python', 'NumPy', 'Augmentation Pipeline'],
    feeds: ['VAIBHAV'],
    equations: [
      { name: 'RADAR RANGE EQ', snippet: 'Pr = (Pt * G^2 * λ^2 * σ) / ((4π)^3 * R^4)' },
      { name: 'SPECKLE NOISE', snippet: 'I = I_ideal * n,  n ~ Γ(L, 1/L)' },
      { name: 'BACKSCATTER CAL', snippet: 'σ° = 10·log10(DN²) + CF' },
      { name: 'AFFINE REGISTRATION', snippet: 'p\' = A·p + t' },
      { name: 'ROTATION AUGMENT', snippet: `[cos θ  -sin θ]
[sin θ   cos θ]` }
    ]
  },
  {
    key: 'anant',
    eyebrow: 'ML ENGINEER',
    title: 'ANANT',
    contextBullets: [
      'Trained a U-Net against Dice and BCE loss on Kaggle GPU',
      'Iterated against IoU/F1 on held-out data until spill masks were reliable',
      'Exported the final model to ONNX so inference doesn\'t depend on the training environment'
    ],
    tags: ['PyTorch', 'segmentation-models-pytorch', 'U-Net', 'Kaggle GPU', 'ONNX / TorchScript'],
    feeds: ['ANANT'],
    equations: [
      { name: 'DICE LOSS', snippet: 'L_dice = 1 - (2|X ∩ Y|) / (|X| + |Y|)' },
      { name: 'IoU METRIC', snippet: 'J(A,B) = |A ∩ B| / |A ∪ B|' },
      { name: 'BCE LOSS', snippet: 'L = -[y·log(p) + (1-y)·log(1-p)]' },
      { name: 'F1 SCORE', snippet: 'F1 = 2TP / (2TP + FP + FN)' },
      { name: 'ADAM UPDATE', snippet: 'θ = θ - (α / (√v + ε)) * m' }
    ]
  },
  {
    key: 'anany',
    eyebrow: 'AIS DATA ENGINEER',
    title: 'ANANY',
    contextBullets: [
      'Maintains a live WebSocket connection to AISstream.io',
      'Persists incoming vessel positions and builds the near-point/time-window query',
      'Flags anomalies — speed drops, erratic course changes — that feed correlation'
    ],
    tags: ['AISstream.io', 'WebSocket', 'Python', 'Vessel DB', 'DB — confirm'],
    feeds: ['ANANY'],
    equations: [
      { name: 'HAVERSINE DIST', snippet: 'd = 2r·arcsin(√(sin²(Δφ/2) + cos φ1·cos φ2·sin²(Δλ/2)))' },
      { name: 'ANOMALY Z-SCORE', snippet: 'z = (v - μ) / σ' },
      { name: 'BEARING', snippet: 'θ = atan2(sin Δλ · cos φ2, cos φ1 · sin φ2 - sin φ1 · cos φ2 · cos Δλ)' },
      { name: 'SPEED OVER GROUND', snippet: 'SOG = d / Δt' },
      { name: 'COURSE CHANGE RATE', snippet: 'ω = Δθ / Δt' }
    ]
  },
  {
    key: 'uday',
    eyebrow: 'BACKEND',
    title: 'UDAY',
    contextBullets: [
      'Built the FastAPI layer connecting detection, AIS query, and correlation',
      'Replaced every mock endpoint with real data end-to-end',
      'Owns the scoring logic and keeping the API stable under repeated calls'
    ],
    tags: ['FastAPI', 'uvicorn', 'Python', 'Correlation Engine', 'PDF Gen — confirm'],
    feeds: ['UDAY'],
    equations: [
      { name: 'CORRELATION SCORE', snippet: 'S = (1/d) * (1/Δt) * f_anomaly' },
      { name: 'QUEUE STABILITY', snippet: 'λ < μ' },
      { name: 'LITTLE\'S LAW', snippet: 'L = λW' },
      { name: 'M/M/1 WAIT TIME', snippet: 'W = 1 / (μ - λ)' },
      { name: 'WEIGHTED VARIANT', snippet: 'S_w = w1*dist + w2*time + w3*anom' }
    ]
  },
  {
    key: 'dhruv',
    eyebrow: 'FRONTEND',
    title: 'DHRUV',
    contextBullets: [
      'Built the React/Three.js dashboard and this entire scrollytelling site',
      'Every model here runs the same model-view-projection pipeline per frame, scroll-driven instead of running on a game loop',
      'Wrote the vector math behind the grid deformation, camera lerp, and scan-ray sweep you\'re looking at right now'
    ],
    tags: ['React', 'Vite', 'Three.js', 'Mapbox GL JS', 'Tailwind CSS v4', 'GSAP ScrollTrigger'],
    feeds: ['DHRUV'],
    equations: [
      { name: 'PROJECTION MATRIX', snippet: `[2n/(r-l)  0        (r+l)/(r-l)  0       ]
[0         2n/(t-b) (t+b)/(t-b)  0       ]
[0         0        -(f+n)/(f-n) -2fn/(f-n)]
[0         0        -1           0       ]` },
      { name: 'MVP TRANSFORM', snippet: 'clip = P · V · M · local' },
      { name: 'LINEAR LERP', snippet: 'v(t) = a + (b - a) * t' },
      { name: 'VECTOR NORMALIZE', snippet: 'n̂ = n / |n|' },
      { name: 'SCROLL VELOCITY', snippet: 'v = Δscroll / Δt' }
    ]
  },
  {
    key: 'vaibhavi',
    eyebrow: 'INTEGRATION & PPT',
    title: 'VAIBHAVI',
    contextBullets: [
      'Keeps five independently-built pipelines compatible on a daily cadence',
      'Owns docker-compose — the whole system runs with one command',
      'Responsible for this shipping as one coherent system, not five demos'
    ],
    tags: ['GitHub', 'docker-compose', 'Branch Workflow'],
    feeds: ['VAIBHAVI'],
    equations: [
      { name: 'CRITICAL PATH', snippet: 'T_total = max_paths(Σ w_i)' },
      { name: 'TEAM THROUGHPUT', snippet: 'Speedup = 1 / ((1 - P) + P/N)' },
      { name: 'MERGE CADENCE', snippet: 'V_merge = commits / Δt' },
      { name: 'COUPLING RISK', snippet: 'C = 1 - (modules_independent / modules_total)' },
      { name: 'BUS FACTOR', snippet: 'B = min(team_members(component_knowledge))' }
    ]
  }
];

const CAMERA_STATES = [
  { pos: [0, -4.0, 4.5], lookAt: [0, 1.0, 0] },  // Stage 1
  { pos: [2.5, -3.0, 5.0], lookAt: [0.5, 0, 0] }, // Stage 2
  { pos: [-3.0, -2.5, 4.0], lookAt: [0, -0.5, 0] }, // Stage 3
  { pos: [0, -5.0, 6.0], lookAt: [0, 1.5, 0] },   // Stage 4
  { pos: [3.5, -1.0, 3.5], lookAt: [1.0, 0, 0] }, // Stage 5
  { pos: [0, -4.5, 5.0], lookAt: [0, 0, 0] },     // Stage 6
];

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════

const EquationCallouts = ({ equations, stageProgress, stageIdx }) => {
  const { getLabelRevealPercent } = useScanReveal();
  const p = stageProgress[stageIdx] || 0;
  const isVisible = p > 0.05 && p < 0.95;

  return (
    <div className="hidden md:block" style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      pointerEvents: 'none', zIndex: 12,
      opacity: isVisible ? 1 : 0, transition: 'opacity 0.3s'
    }}>
      <svg width="100%" height="100%" className="absolute top-0 left-0">
        {equations.map((eq, i) => {
          const revealP = getLabelRevealPercent(p, stageIdx);
          const seqReveal = Math.max(0, Math.min(1, (revealP - i*0.1) * 2));
          return (
            <line 
              key={i}
              id={`eq-line-${stageIdx}-${i}`}
              x1="0" y1="0" x2="68%" y2={`${20 + i * 15}%`}
              stroke="var(--phosphor)" strokeWidth="1"
              opacity={seqReveal * 0.5}
            />
          );
        })}
      </svg>

      {equations.map((eq, i) => {
        const revealP = getLabelRevealPercent(p, stageIdx);
        const seqReveal = Math.max(0, Math.min(1, (revealP - i*0.1) * 2));
        
        return (
          <div
            key={i}
            className="left-[5%] md:left-[68%] max-w-[90%] md:max-w-[350px]"
            style={{
              position: 'absolute',
              top: `${20 + i * 15}%`,
              transform: `translateY(-50%) translateX(${20 * (1-seqReveal)}px)`,
              opacity: seqReveal,
              fontFamily: 'var(--font-mono)',
              color: 'var(--phosphor)',
              background: 'rgba(5,8,5,0.85)',
              border: '1px solid rgba(57,255,136,0.2)',
              padding: '12px 16px',
            }}
          >
            <div style={{ fontSize: '0.65rem', letterSpacing: '0.1em', opacity: 0.7, marginBottom: '6px' }}>
              {eq.name}
            </div>
            <div style={{ fontSize: '0.8rem', whiteSpace: 'pre-wrap' }}>
              {eq.snippet}
            </div>
          </div>
        );
      })}
    </div>
  );
};

const SharedGrid = () => {
  const meshRef = useRef();
  const progressRefs = useContext(StageProgressContext);
  const { getGridZ } = useIdleAnimation();
  const { getActiveRays, getDeformZ } = useScanReveal();

  const gridGeo = useMemo(() => {
    const geo = new THREE.PlaneGeometry(30, 20, 60, 40);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      pos.setZ(i, 0);
    }
    return geo;
  }, []);

  useFrame(({ clock }) => {
    if (!meshRef.current || !progressRefs?.current) return;
    const time = clock.elapsedTime;
    const progs = progressRefs.current;
    
    let activeStage = 0;
    for (let i = 0; i < STAGES.length; i++) {
      if (progs[i] > 0.01) activeStage = i;
    }
    const p = progs[activeStage];
    
    const activeRays = getActiveRays(p, activeStage);
    const pos = meshRef.current.geometry.attributes.position;
    
    let deformStrength = 0;
    if (activeStage === 0) {
      if (p < 0.1) deformStrength = p / 0.1;
      else if (p > 0.9) deformStrength = (1 - p) / 0.1;
      else deformStrength = 1.0;
    } else {
      if (p >= 0.15 && p <= 0.45) {
        deformStrength = Math.min((p - 0.15) / 0.1, 1) * Math.min((0.45 - p) / 0.1, 1);
      }
    }

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      let z = getGridZ(x, y, time);
      z += getDeformZ(x, activeRays, deformStrength);
      pos.setZ(i, z);
    }
    pos.needsUpdate = true;
  });

  return (
    <mesh ref={meshRef} position={[0, 0, -1]}>
      <primitive object={gridGeo} attach="geometry" />
      <meshBasicMaterial color={WIRE_GREEN} wireframe transparent opacity={0.15} />
    </mesh>
  );
};


// --- EQUATION ANCHORS HOOK ---
import { useThree } from '@react-three/fiber';

const useEquationAnchors = (stageIdx, refsArray) => {
  const { camera } = useThree();
  const tempV = useRef(new THREE.Vector3());
  
  useFrame(() => {
    refsArray.forEach((ref, i) => {
      if (ref && ref.current) {
        ref.current.getWorldPosition(tempV.current);
        tempV.current.project(camera);
        const sx = (tempV.current.x * 0.5 + 0.5) * window.innerWidth;
        const sy = -(tempV.current.y * 0.5 - 0.5) * window.innerHeight;
        
        const line = document.getElementById(`eq-line-${stageIdx}-${i}`);
        if (line) {
          line.setAttribute('x1', sx);
          line.setAttribute('y1', sy);
        }
      }
    });
  });
};

// --- HERO MODELS ---

const SarAntenna = ({ stageIdx }) => {
  const ref = useRef();
  const progressRefs = useContext(StageProgressContext);
  const { getFloatY } = useIdleAnimation();
  
  const anchors = Array(5).fill(0).map(() => useRef());
  useEquationAnchors(stageIdx, anchors);

  useFrame(({ clock }) => {
    if (!ref.current || !progressRefs?.current) return;
    const p = progressRefs.current[stageIdx];
    ref.current.visible = p > 0.01;
    if (!ref.current.visible) return;
    ref.current.position.y = getFloatY(clock.elapsedTime, 0, 0.15);
    ref.current.rotation.y = Math.sin(clock.elapsedTime * 0.5) * 0.2;
    ref.current.rotation.x = -Math.PI / 6;
  });

  return (
    <group ref={ref} position={[0, 0, 1]}>
      <mesh>
        <planeGeometry args={[2.5, 1.5, 3, 2]} />
        <meshBasicMaterial color={WIRE_GREEN} wireframe transparent opacity={0.8} />
      </mesh>
      <group ref={anchors[0]} position={[-1.25, 0.75, 0]} />
      <group ref={anchors[1]} position={[1.25, 0.75, 0]} />
      <group ref={anchors[2]} position={[-1.25, -0.75, 0]} />
      <group ref={anchors[3]} position={[1.25, -0.75, 0]} />
      <group ref={anchors[4]} position={[0, 0, 0]} />
    </group>
  );
};

const MLUNet = ({ stageIdx }) => {
  const ref = useRef();
  const progressRefs = useContext(StageProgressContext);
  const { getFloatY } = useIdleAnimation();
  
  const nodes = [
    [-1.2, 1, 0], [-1.2, -0.5, 0], [-0.4, -1, 0],
    [0.4, -1, 0], [1.2, -0.5, 0], [1.2, 1, 0]
  ];
  
  const edges = [
    [0, 1], [1, 2], [2, 3], [3, 4], [4, 5],
    [0, 5], [1, 4]
  ];

  const lineGeo = useMemo(() => {
    const pts = [];
    edges.forEach(([a, b]) => {
      pts.push(new THREE.Vector3(...nodes[a]));
      pts.push(new THREE.Vector3(...nodes[b]));
    });
    return new THREE.BufferGeometry().setFromPoints(pts);
  }, []);

  const anchors = Array(5).fill(0).map(() => useRef());
  useEquationAnchors(stageIdx, anchors);

  useFrame(({ clock }) => {
    if (!ref.current || !progressRefs?.current) return;
    const p = progressRefs.current[stageIdx];
    ref.current.visible = p > 0.01;
    if (!ref.current.visible) return;
    ref.current.position.y = getFloatY(clock.elapsedTime, 0, 0.1);
    ref.current.rotation.y = Math.sin(clock.elapsedTime * 0.5) * 0.2;
  });

  return (
    <group ref={ref} position={[0, 0, 1]}>
      <lineSegments geometry={lineGeo}>
        <lineBasicMaterial color={WIRE_GREEN} transparent opacity={0.4} />
      </lineSegments>
      {nodes.map((pos, i) => (
        <mesh key={i} position={pos}>
          <tetrahedronGeometry args={[0.15]} />
          <meshBasicMaterial color={WIRE_GREEN} wireframe transparent opacity={0.8} />
          {i < 5 && <group ref={anchors[i]} />}
        </mesh>
      ))}
    </group>
  );
};

const GlobeArcs = ({ stageIdx }) => {
  const ref = useRef();
  const progressRefs = useContext(StageProgressContext);
  const { getFloatY } = useIdleAnimation();
  
  const anchors = Array(5).fill(0).map(() => useRef());
  useEquationAnchors(stageIdx, anchors);

  const arcGeo = useMemo(() => {
    const curve = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(-1.2, 0, 0.5),
      new THREE.Vector3(0, 1.5, 1.5),
      new THREE.Vector3(1.2, 0, 0.5)
    );
    return new THREE.BufferGeometry().setFromPoints(curve.getPoints(10));
  }, []);

  useFrame(({ clock }) => {
    if (!ref.current || !progressRefs?.current) return;
    const p = progressRefs.current[stageIdx];
    ref.current.visible = p > 0.01;
    if (!ref.current.visible) return;
    ref.current.position.y = getFloatY(clock.elapsedTime, 0, 0.1);
    ref.current.rotation.y = clock.elapsedTime * 0.2;
    ref.current.rotation.x = clock.elapsedTime * 0.1;
  });

  return (
    <group ref={ref} position={[0, 0, 1]}>
      <mesh>
        <icosahedronGeometry args={[1.2, 0]} />
        <meshBasicMaterial color={WIRE_GREEN} wireframe transparent opacity={0.5} />
      </mesh>
      <group ref={anchors[0]} position={[0, 1.2, 0]} />
      <group ref={anchors[1]} position={[1.2, 0, 0]} />
      <group ref={anchors[2]} position={[-1.2, 0, 0]} />
      <group ref={anchors[3]} position={[0, 0, 1.2]} />
      <group ref={anchors[4]} position={[0, -1.2, 0]} />
      
      <line geometry={arcGeo}>
        <lineBasicMaterial color={WIRE_GREEN} transparent opacity={0.8} />
      </line>
      <mesh position={[0.6, 0.75, 1]}>
        <tetrahedronGeometry args={[0.08]} />
        <meshBasicMaterial color={WIRE_GREEN} wireframe />
      </mesh>
    </group>
  );
};

const ServerNodes = ({ stageIdx }) => {
  const ref = useRef();
  const progressRefs = useContext(StageProgressContext);
  const { getFloatY } = useIdleAnimation();
  
  const anchors = Array(5).fill(0).map(() => useRef());
  useEquationAnchors(stageIdx, anchors);

  useFrame(({ clock }) => {
    if (!ref.current || !progressRefs?.current) return;
    const p = progressRefs.current[stageIdx];
    ref.current.visible = p > 0.01;
    if (!ref.current.visible) return;
    ref.current.position.y = getFloatY(clock.elapsedTime, 0, 0.1);
    ref.current.rotation.y = clock.elapsedTime * -0.2;
    ref.current.rotation.x = Math.sin(clock.elapsedTime * 0.3) * 0.1;
  });

  const spokes = useMemo(() => {
    return [0, 1, 2, 3, 4].map(i => {
      const angle = (i * Math.PI * 2) / 5;
      const r = 1.8;
      const pts = [new THREE.Vector3(0,0,0), new THREE.Vector3(Math.cos(angle)*r, Math.sin(angle)*r, 0)];
      return {
        geo: new THREE.BufferGeometry().setFromPoints(pts),
        pos: [Math.cos(angle)*r, Math.sin(angle)*r, 0]
      };
    });
  }, []);

  return (
    <group ref={ref} position={[0, 0, 1]}>
      <mesh>
        <tetrahedronGeometry args={[0.3]} />
        <meshBasicMaterial color={WIRE_GREEN} wireframe transparent opacity={0.9} />
      </mesh>
      
      {spokes.map((spoke, i) => (
        <group key={i}>
          <line geometry={spoke.geo}>
            <lineBasicMaterial color={WIRE_GREEN} transparent opacity={0.4} />
          </line>
          <mesh position={spoke.pos}>
            <tetrahedronGeometry args={[0.2]} />
            <meshBasicMaterial color={WIRE_GREEN} wireframe transparent opacity={0.7} />
            <group ref={anchors[i]} />
          </mesh>
        </group>
      ))}
    </group>
  );
};

const CameraFrustum = ({ stageIdx }) => {
  const ref = useRef();
  const progressRefs = useContext(StageProgressContext);
  const { getFloatY } = useIdleAnimation();
  
  const anchors = Array(5).fill(0).map(() => useRef());
  useEquationAnchors(stageIdx, anchors);

  const frustumGeo = useMemo(() => {
    const pts = [
      new THREE.Vector3(0, 1, 0), new THREE.Vector3(-1, -1, 1.5),
      new THREE.Vector3(0, 1, 0), new THREE.Vector3(1, -1, 1.5),
      new THREE.Vector3(0, 1, 0), new THREE.Vector3(1, -1, -1.5),
      new THREE.Vector3(0, 1, 0), new THREE.Vector3(-1, -1, -1.5),
      new THREE.Vector3(-1, -1, 1.5), new THREE.Vector3(1, -1, 1.5),
      new THREE.Vector3(1, -1, 1.5), new THREE.Vector3(1, -1, -1.5),
      new THREE.Vector3(1, -1, -1.5), new THREE.Vector3(-1, -1, -1.5),
      new THREE.Vector3(-1, -1, -1.5), new THREE.Vector3(-1, -1, 1.5)
    ];
    return new THREE.BufferGeometry().setFromPoints(pts);
  }, []);

  useFrame(({ clock }) => {
    if (!ref.current || !progressRefs?.current) return;
    const p = progressRefs.current[stageIdx];
    ref.current.visible = p > 0.01;
    if (!ref.current.visible) return;
    ref.current.position.y = getFloatY(clock.elapsedTime, 0, 0.1);
    ref.current.rotation.y = Math.sin(clock.elapsedTime * 0.5) * 0.1;
  });

  return (
    <group ref={ref} position={[0, 0.5, 1]}>
      <lineSegments geometry={frustumGeo}>
        <lineBasicMaterial color={WIRE_GREEN} transparent opacity={0.6} />
      </lineSegments>
      <group ref={anchors[0]} position={[0, 1, 0]} />
      <group ref={anchors[1]} position={[-1, -1, 1.5]} />
      <group ref={anchors[2]} position={[1, -1, 1.5]} />
      <group ref={anchors[3]} position={[1, -1, -1.5]} />
      <group ref={anchors[4]} position={[-1, -1, -1.5]} />
    </group>
  );
};

const IntegrationHub = ({ stageIdx }) => {
  const ref = useRef();
  const progressRefs = useContext(StageProgressContext);
  const { getFloatY } = useIdleAnimation();
  
  const anchors = Array(5).fill(0).map(() => useRef());
  useEquationAnchors(stageIdx, anchors);

  const linesGeo = useMemo(() => {
    const pts = [];
    for(let i=0; i<5; i++) {
      const angle = (i * Math.PI * 2) / 5;
      pts.push(new THREE.Vector3(0,0,0));
      pts.push(new THREE.Vector3(Math.cos(angle)*5, Math.sin(angle)*5, Math.sin(angle*2)*2));
    }
    return new THREE.BufferGeometry().setFromPoints(pts);
  }, []);

  useFrame(({ clock }) => {
    if (!ref.current || !progressRefs?.current) return;
    const p = progressRefs.current[stageIdx];
    ref.current.visible = p > 0.01;
    if (!ref.current.visible) return;
    ref.current.position.y = getFloatY(clock.elapsedTime, 0, 0.1);
    ref.current.rotation.z = clock.elapsedTime * 0.1;
  });

  return (
    <group ref={ref} position={[0, 0, 1]} rotation={[-Math.PI/6, 0, 0]}>
      <mesh>
        <tetrahedronGeometry args={[0.2]} />
        <meshBasicMaterial color={WIRE_GREEN} wireframe transparent opacity={0.9} />
      </mesh>
      <lineSegments geometry={linesGeo}>
        <lineBasicMaterial color={WIRE_GREEN} transparent opacity={0.5} />
      </lineSegments>
      {[0, 1, 2, 3, 4].map(i => {
        const angle = (i * Math.PI * 2) / 5;
        return <group key={i} ref={anchors[i]} position={[Math.cos(angle)*1.5, Math.sin(angle)*1.5, 0]} />
      })}
    </group>
  );
};

const CameraController = () => {
  const progressRefs = useContext(StageProgressContext);
  useCameraController(CAMERA_STATES, progressRefs);
  return null;
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════════

export default function Stack() {
  const { stageProgress, hudProgress } = useScrollStages(STAGES.length, 'stack-stage');
  
  let activeStage = 0;
  for (let i = 0; i < STAGES.length; i++) {
    if (hudProgress[i] > 0.01) activeStage = i;
  }

  return (
    <div style={{ backgroundColor: '#050805', minHeight: '100vh', color: '#fff', position: 'relative' }}>
      <TopBar />
      
      {/* 3D Background */}
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 0, pointerEvents: 'none' }}>
        <StageProgressContext.Provider value={stageProgress}>
          <Canvas camera={{ position: [0, -4.0, 4.5], fov: 45 }}>
            <ambientLight intensity={0.5} />
            <SharedGrid />
            <ScanSweepLine activeStageIdx={activeStage} totalStages={STAGES.length} />
            
            <SarAntenna stageIdx={0} />
            <MLUNet stageIdx={1} />
            <GlobeArcs stageIdx={2} />
            <ServerNodes stageIdx={3} />
            <CameraFrustum stageIdx={4} />
            <IntegrationHub stageIdx={5} />
            
            <CameraController />
          </Canvas>
        </StageProgressContext.Provider>
      </div>

      <ScanSweepOverlay stageProgress={hudProgress} totalStages={STAGES.length} />
      <StageHUD stageProgress={hudProgress} stagesConfig={STAGES} />
      
      {STAGES.map((s, i) => (
        <EquationCallouts key={`eq-${i}`} equations={s.equations} stageProgress={hudProgress} stageIdx={i} />
      ))}

      <ArchFooterTicker labels={STAGES.map(s => s.feeds[0])} activeIndex={activeStage} />

      {/* Scroll Spacers */}
      <div style={{ position: 'relative', zIndex: 1 }}>
        {STAGES.map((s, i) => (
          <div key={`stack-stage-${i}`} id={`stack-stage-${i}`} style={{ height: '100vh', pointerEvents: 'none' }} />
        ))}
      </div>
      
      <div style={{ height: '30vh' }} />
    </div>
  );
}
