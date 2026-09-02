export function useIdleAnimation() {
  return {
    getGridZ: (x, y, time) => {
      return (Math.sin(x * 1.5 + time * 2) * 0.03) + (Math.cos(y * 1.5 + time * 1.5) * 0.03);
    },
    getFloatY: (time, delay = 0, intensity = 0.1) => {
      return Math.sin(time * 1.5 + delay) * intensity;
    },
    getFloatZ: (time, delay = 0, intensity = 0.02) => {
      return Math.sin(time * 2 + delay) * intensity;
    },
    getRotX: (time, delay = 0, intensity = 0.05) => {
      return Math.sin(time * 1.5 + delay) * intensity;
    },
    getRotY: (time, delay = 0, intensity = 0.05) => {
      return Math.cos(time * 1.2 + delay) * intensity;
    },
    getRotZ: (time, delay = 0, intensity = 0.05) => {
      return Math.sin(time * 0.8 + delay) * intensity;
    },
    getPulse: (time, delay = 0, speed = 3) => {
      return (Math.sin(time * speed + delay) * 0.5 + 0.5) * 0.5 + 0.5;
    },
  };
}
