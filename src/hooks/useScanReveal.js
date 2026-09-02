export function useScanReveal() {
  return {
    getActiveRays: (p, activeStage) => {
      const activeRays = [];
      if (activeStage === 0) {
        // Stage 1 sweep: two lines moving opposite directions
        activeRays.push(-5 + p * 10);
        activeRays.push(5 - p * 10);
      } else {
        // Other stages sweep: single line moving from left to right between p = 0.15 and 0.45
        if (p >= 0.15 && p <= 0.45) {
          const sweepT = (p - 0.15) / 0.3;
          activeRays.push(-5 + sweepT * 10);
        }
      }
      return activeRays;
    },
    getDeformZ: (x, activeRays, deformStrength) => {
      let zOffset = 0;
      if (deformStrength > 0.01) {
        for (const rayX of activeRays) {
          const dist = Math.abs(x - rayX);
          const radius = 1.0;
          if (dist < radius) {
            const t = 1.0 - (dist / radius);
            const bump = Math.sin(t * Math.PI / 2) * 0.4;
            zOffset += bump * deformStrength;
          }
        }
      }
      return zOffset;
    },
    getSweepX: (p) => {
      const sweepStart = 0.15;
      const sweepEnd = 0.45;
      if (p >= sweepStart && p <= sweepEnd) {
        const sweepT = (p - sweepStart) / (sweepEnd - sweepStart);
        return -5 + sweepT * 10;
      } else if (p > sweepEnd) {
        return 999;
      }
      return -999;
    },
    getLabelRevealPercent: (p) => {
      const sweepStart = 0.15;
      const sweepEnd = 0.45;
      if (p >= sweepStart && p <= sweepEnd) {
        return ((p - sweepStart) / (sweepEnd - sweepStart)) * 100;
      } else if (p > sweepEnd) {
        return 100;
      }
      return 0;
    }
  };
}
