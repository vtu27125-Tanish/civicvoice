import { useEffect, useState } from 'react';

// Animates a number counting up from 0 to `value` — the "counter-reports"
// effect from the Stitch dashboard mockup.
export default function AnimatedCounter({ value, duration = 900 }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (value == null) return;
    let start = null;
    const from = 0;
    const to = Number(value);

    function step(timestamp) {
      if (!start) start = timestamp;
      const progress = Math.min((timestamp - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      setDisplay(Math.round(from + (to - from) * eased));
      if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }, [value, duration]);

  return <>{value == null ? '—' : display}</>;
}