"use client";

import { useEffect, useRef } from "react";

const COLORS = ["#D97757", "#788C5D", "#6A9BCC", "#F0B49D", "#E8C468"];

/** a one-shot pixel confetti burst on a canvas; skipped under reduced motion */
export function Confetti() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = canvas.getContext?.("2d");
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const resize = () => {
      canvas.width = canvas.offsetWidth * dpr;
      canvas.height = canvas.offsetHeight * dpr;
    };
    resize();
    const W = canvas.width;
    const parts = Array.from({ length: 140 }, () => ({
      x: W / 2 + (Math.random() - 0.5) * W * 0.2,
      y: canvas.height * 0.35,
      vx: (Math.random() - 0.5) * 14 * dpr,
      vy: (-Math.random() * 14 - 6) * dpr,
      s: (Math.random() * 5 + 4) * dpr,
      c: COLORS[Math.floor(Math.random() * COLORS.length)],
      r: Math.random() * Math.PI,
    }));
    let raf = 0;
    let frames = 0;
    const tick = () => {
      frames++;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const p of parts) {
        p.vy += 0.35 * dpr;
        p.vx *= 0.99;
        p.x += p.vx;
        p.y += p.vy;
        p.r += 0.1;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(Math.round(p.r * 2) / 2);
        ctx.fillStyle = p.c;
        ctx.globalAlpha = Math.max(0, 1 - frames / 200);
        ctx.fillRect(-p.s / 2, -p.s / 2, p.s, p.s);
        ctx.restore();
      }
      if (frames < 200) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  return <canvas ref={ref} aria-hidden className="pointer-events-none fixed inset-0 z-50 size-full" />;
}
