import { useEffect, useRef, useState, createContext } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ScrollToPlugin } from 'gsap/ScrollToPlugin';

gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);

export const StageProgressContext = createContext(null);


export function useScrollStages(numStages, containerIdPrefix) {
  const stageProgress = useRef(new Array(numStages).fill(0));
  const [hudProgress, setHudProgress] = useState(new Array(numStages).fill(0));
  const triggersRef = useRef([]);
  const throttleRef = useRef(0);
  const currentStageRef = useRef(0);
  const isTransitioningRef = useRef(false);
  const transitionTimerRef = useRef(null);

  useEffect(() => {
    // ── ScrollTrigger setup ────────────────────────────────────────────────
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

            // Track current active stage from scroll
            let active = 0;
            for (let j = 0; j < numStages; j++) {
              if (stageProgress.current[j] > 0.01) active = j;
            }
            currentStageRef.current = active;

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

    // ── Keyboard navigation ────────────────────────────────────────────────
    const handleKeyDown = (e) => {
      const key = e.key;
      const isNext = key === 'ArrowDown' || key === 'ArrowRight';
      const isPrev = key === 'ArrowUp' || key === 'ArrowLeft';

      if (!isNext && !isPrev) return;

      // Don't hijack keys if user is typing in an input/textarea
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) return;

      e.preventDefault();

      // Debounce: ignore while a transition is in progress
      if (isTransitioningRef.current) return;

      const current = currentStageRef.current;
      let targetIndex;
      if (isNext) {
        targetIndex = Math.min(current + 1, numStages - 1);
      } else {
        targetIndex = Math.max(current - 1, 0);
      }

      // Don't animate if already at the boundary
      if (targetIndex === current) return;

      const targetEl = document.getElementById(`${containerIdPrefix}-${targetIndex}`);
      if (!targetEl) return;

      // Lock input
      isTransitioningRef.current = true;
      currentStageRef.current = targetIndex;

      // GSAP ScrollTo tween — 400ms, easeInOutCubic
      // targetIndex === 0 scrolls to the absolute top.
      // Other stages scroll past the top by 50vh, so progress lands exactly at p=0.5
      // where the text is fully revealed and the sweep animation has completed.
      gsap.to(window, {
        scrollTo: { 
          y: targetEl, 
          offsetY: targetIndex === 0 ? 0 : -window.innerHeight * 0.5 
        },
        duration: 0.4,
        ease: 'power2.inOut',
        onComplete: () => {
          // Release lock after a small buffer
          transitionTimerRef.current = setTimeout(() => {
            isTransitioningRef.current = false;
          }, 50);
        },
      });
    };

    window.addEventListener('keydown', handleKeyDown);

    // ── Cleanup ────────────────────────────────────────────────────────────
    return () => {
      clearTimeout(timer);
      if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
      triggersRef.current.forEach((st) => st.kill());
      triggersRef.current = [];
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [numStages, containerIdPrefix]);

  return { stageProgress, hudProgress, currentStageRef };
}
