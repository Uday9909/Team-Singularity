import { useEffect, useRef, useState, createContext } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export const StageProgressContext = createContext(null);


export function useScrollStages(numStages, containerIdPrefix) {
  const stageProgress = useRef(new Array(numStages).fill(0));
  const [hudProgress, setHudProgress] = useState(new Array(numStages).fill(0));
  const triggersRef = useRef([]);
  const throttleRef = useRef(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      const triggers = [];
      for (let i = 0; i < numStages; i++) {
        const el = document.getElementById(`${containerIdPrefix}-${i}`);
        if (!el) continue;

        const st = ScrollTrigger.create({
          trigger: el,
          start: 'top top',
          end: 'bottom top',
          scrub: 0.5,
          onUpdate: (self) => {
            stageProgress.current[i] = self.progress;

            const now = performance.now();
            if (now - throttleRef.current > 33) {
              throttleRef.current = now;
              setHudProgress([...stageProgress.current]);
            }
          },
        });
        triggers.push(st);
      }
      triggersRef.current = triggers;
    }, 150);

    return () => {
      clearTimeout(timer);
      triggersRef.current.forEach((st) => st.kill());
      triggersRef.current = [];
    };
  }, [numStages, containerIdPrefix]);

  return { stageProgress, hudProgress };
}
