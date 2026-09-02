import React, { useContext, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { StageProgressContext } from '../../hooks/useScrollStages';
import { useScanReveal } from '../../hooks/useScanReveal';

export const WIRE_GREEN = '#39FF88';
export const CORR_SUSPECT_COLOR = '#FFD700';

export const ScanSweepLine = ({ activeStageIdx, totalStages = 5 }) => {
  const mesh1Ref = useRef();
  const mesh2Ref = useRef();
  const progressRefs = useContext(StageProgressContext);
  const { getSweepX } = useScanReveal();

  useFrame(() => {
    if (!mesh1Ref.current || !mesh2Ref.current || !progressRefs?.current) return;
    const progs = progressRefs.current;
    
    let activeStage = 0;
    for (let i = 0; i < totalStages; i++) {
      if (progs[i] > 0.01) activeStage = i;
    }
    const p = progs[activeStage];

    if (activeStage === 0) {
      mesh1Ref.current.visible = true;
      mesh2Ref.current.visible = true;
      mesh1Ref.current.position.set(-5 + p * 10, 0, 0.5);
      mesh2Ref.current.position.set(5 - p * 10, 0, 0.5);
      
      const edgeFade = Math.min(p / 0.1, 1) * Math.min((1 - p) / 0.1, 1);
      mesh1Ref.current.material.opacity = edgeFade * 0.8;
      mesh2Ref.current.material.opacity = edgeFade * 0.8;
    } else {
      mesh2Ref.current.visible = false;
      const sweepStart = 0.15;
      const sweepEnd = 0.45;
      if (p >= sweepStart && p <= sweepEnd) {
        const sweepT = (p - sweepStart) / (sweepEnd - sweepStart);
        mesh1Ref.current.visible = true;
        mesh1Ref.current.position.set(-5 + sweepT * 10, 0, 0.5);
        const edgeFade = Math.min(sweepT / 0.1, 1) * Math.min((1 - sweepT) / 0.1, 1);
        mesh1Ref.current.material.opacity = edgeFade * 0.9;
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

export const ScanSweepOverlay = ({ stageProgress, totalStages = 5 }) => {
  let activeStage = 0;
  for (let i = 0; i < totalStages; i++) {
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

export const StageHUD = ({ stageProgress, stagesConfig, persistentStages = [] }) => {
  let activeStage = 0;
  for (let i = 0; i < stagesConfig.length; i++) {
    if (stageProgress[i] > 0.01) activeStage = i;
  }

  const stage = stagesConfig[activeStage];
  const p = stageProgress[activeStage];

  let textOpacity = 0;
  let textY = 20;
  if (p < 0.15) {
    textOpacity = p / 0.15;
    textY = 20 * (1 - textOpacity);
  } else if (p > 0.85 && !persistentStages.includes(activeStage)) {
    textOpacity = (1 - p) / 0.15;
    textY = -20 * (1 - textOpacity);
  } else {
    textOpacity = 1;
    textY = 0;
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
      {stage.contextBullets && (
        <ul
          style={{
            fontSize: '0.85rem',
            opacity: 0.7,
            margin: '0 0 16px 0',
            paddingLeft: '20px',
            fontFamily: 'var(--font-mono)',
            lineHeight: 1.6,
            color: 'var(--bone)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}
        >
          {stage.contextBullets.map((bullet, i) => (
            <li key={i}>{bullet}</li>
          ))}
        </ul>
      )}
      {stage.tags && (
        <div
          style={{
            marginTop: '16px',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '8px',
          }}
        >
          {stage.tags.map((tag, i) => (
            <span
              key={i}
              style={{
                fontSize: '0.7rem',
                fontFamily: 'var(--font-mono)',
                color: 'var(--phosphor)',
                background: 'rgba(57, 255, 136, 0.05)',
                border: '1px solid rgba(57, 255, 136, 0.2)',
                padding: '4px 8px',
                borderRadius: '2px',
                whiteSpace: 'nowrap'
              }}
            >
              [ {tag} ]
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

export const ArchFooterTicker = ({ labels, activeIndex }) => (
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
    {labels.map((label, idx) => {
      const isActive = idx === activeIndex;
      return (
        <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              fontFamily: 'var(--font-mono)', fontSize: '0.65rem', letterSpacing: '0.1em',
              color: 'var(--bone)', opacity: isActive ? 0.7 : 0.25,
              transition: 'opacity 0.5s ease',
            }}
          >
            {label}
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
