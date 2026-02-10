import { useEffect, useMemo, useRef } from 'react';

export type WaveMatrixProps = {
  dotSize?: number;
  gap?: number;
  brightness?: number; // 0..1-ish
  className?: string;
};

/**
 * A lightweight animated dot-matrix "clock" feel.
 * Canvas-based to keep DOM small and smooth.
 */
export function WaveMatrix({ dotSize = 12, gap = 6, brightness = 1, className }: WaveMatrixProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);

  const spacing = useMemo(() => Math.max(1, dotSize + gap), [dotSize, gap]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      const dpr = Math.max(1, Math.floor(window.devicePixelRatio || 1));
      const parent = canvas.parentElement;
      const w = parent?.clientWidth ?? 480;
      const h = parent?.clientHeight ?? 240;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    window.addEventListener('resize', resize);

    const render = (_t: number) => {

      const w = canvas.clientWidth;
      const h = canvas.clientHeight;

      // Background
      ctx.clearRect(0, 0, w, h);

      // Time-based phase so it feels "clock-like" without showing digits.
      const now = new Date();
      const seconds = now.getSeconds() + now.getMilliseconds() / 1000;
      const minutes = now.getMinutes() + seconds / 60;
      const hours = (now.getHours() % 12) + minutes / 60;

      const phase = seconds * 0.9 + minutes * 0.12 + hours * 0.03;

      const cols = Math.floor(w / spacing);
      const rows = Math.floor(h / spacing);

      const cx = cols / 2;
      const cy = rows / 2;

      for (let y = 0; y <= rows; y++) {
        for (let x = 0; x <= cols; x++) {
          const dx = x - cx;
          const dy = y - cy;
          const r = Math.sqrt(dx * dx + dy * dy);

          // A couple of waves layered + radial falloff.
          const wave1 = Math.sin(r * 0.55 - phase * 2.2);
          const wave2 = Math.sin((dx * 0.6 + dy * 0.25) - phase * 1.4);
          const v = 0.55 * wave1 + 0.45 * wave2;

          const falloff = Math.exp(-r * 0.065);
          const intensity = Math.min(1, Math.max(0, (0.55 + 0.45 * v) * falloff * (0.9 + 0.4 * brightness)));

          if (intensity < 0.02) continue;

          const px = x * spacing;
          const py = y * spacing;
          const s = dotSize * (0.65 + 0.45 * intensity);

          // Color: white with slight blue tint.
          const a = 0.10 + 0.85 * intensity;
          ctx.fillStyle = `rgba(230, 242, 255, ${a})`;

          // Draw dot (rounded square is faster than arc at this density)
          const rCorner = Math.max(2, s * 0.28);
          roundRect(ctx, px - s / 2, py - s / 2, s, s, rCorner);
          ctx.fill();
        }
      }

      rafRef.current = requestAnimationFrame(render);
    };

    rafRef.current = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', resize);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [brightness, dotSize, spacing]);

  return (
    <div className={className} style={{ width: 520, height: 260 }}>
      <canvas ref={canvasRef} className="block" aria-label="Animated wave matrix" />
    </div>
  );
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}
