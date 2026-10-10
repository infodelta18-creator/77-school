import { useEffect, useRef, useState } from "react";

export function Counter({ value, suffix = "" }: { value: number; suffix?: string }) {
  const [n, setN] = useState(value);
  const ref = useRef<HTMLSpanElement>(null);
  const isIntersectingRef = useRef(false);

  useEffect(() => {
    setN(value);
  }, [value]);

  useEffect(() => {
    if (!ref.current) return;
    let animFrame: number;

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting && !isIntersectingRef.current) {
            isIntersectingRef.current = true;
            const duration = 1200;
            const start = performance.now();
            const step = (t: number) => {
              const p = Math.min(1, (t - start) / duration);
              const eased = 1 - Math.pow(1 - p, 3);
              setN(Math.round(eased * value));
              if (p < 1) {
                animFrame = requestAnimationFrame(step);
              }
            };
            animFrame = requestAnimationFrame(step);
          }
        });
      },
      { threshold: 0.2 }
    );

    io.observe(ref.current);

    return () => {
      io.disconnect();
      if (animFrame) cancelAnimationFrame(animFrame);
    };
  }, [value]);

  return (
    <span ref={ref}>
      {n.toLocaleString("uz-UZ")}
      {suffix}
    </span>
  );
}
