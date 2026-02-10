import { useEffect, useMemo, useRef } from 'react';

export type MatrixClockProps = {
  dotSize?: number;
  gap?: number;
  brightness?: number; // 0..1-ish
  className?: string;
};

/**
 * Canvas-based dot-matrix digital clock (HH:MM:SS).
 * Designed as a drop-in replacement for WaveMatrix.
 */
export function MatrixClock({ dotSize = 12, gap = 6, brightness = 1, className }: MatrixClockProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const spacing = useMemo(() => Math.max(1, dotSize + gap), [dotSize, gap]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      const dpr = Math.max(1, Math.floor(window.devicePixelRatio || 1));
      const parent = canvas.parentElement;
      const w = parent?.clientWidth ?? 520;
      const h = parent?.clientHeight ?? 260;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const draw = () => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      ctx.clearRect(0, 0, w, h);

      const cols = Math.max(1, Math.floor(w / spacing));
      const rows = Math.max(1, Math.floor(h / spacing));

      const offsetX = spacing / 2;
      const offsetY = spacing / 2;

      // Background matrix: subtle, deterministic noise per cell.
      const seed = Math.floor(Date.now() / 1000);
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const n = pseudoNoise(x, y, seed);
          const intensity = (0.02 + 0.10 * n) * (0.7 + 0.6 * brightness);
          if (intensity < 0.03) continue;

          const px = offsetX + x * spacing;
          const py = offsetY + y * spacing;
          const s = dotSize * (0.30 + 0.20 * n);
          const a = Math.min(0.12, intensity);
          ctx.fillStyle = `rgba(230, 242, 255, ${a})`;
          const rCorner = Math.max(2, s * 0.28);
          roundRect(ctx, px - s / 2, py - s / 2, s, s, rCorner);
          ctx.fill();
        }
      }

      // Foreground: time as HH:MM:SS in a 3x5 dot font.
      const now = new Date();
      const time = `${pad2(now.getHours())}:${pad2(now.getMinutes())}:${pad2(now.getSeconds())}`;

      const glyphH = 5;
      const charGap = 1;
      const widths = Array.from(time, (ch) => GLYPHS_3X5[ch]?.[0]?.length ?? 3);
      const totalCells =
        widths.reduce((acc, w0) => acc + w0, 0) + (time.length - 1) * charGap;

      const totalSpanX = (Math.max(1, totalCells) - 1) * spacing;
      const totalSpanY = (glyphH - 1) * spacing;
      const firstCenterX = Math.max(spacing / 2, (w - totalSpanX) / 2);
      const firstCenterY = Math.max(spacing / 2, (h - totalSpanY) / 2);

      let cursor = 0;
      for (let i = 0; i < time.length; i++) {
        const ch = time[i] ?? ' ';
        const glyph = GLYPHS_3X5[ch] ?? GLYPHS_3X5[' ']!;
        const gw = glyph[0]?.length ?? 3;

        for (let gy = 0; gy < glyphH; gy++) {
          const row = glyph[gy] ?? '';
          for (let gx = 0; gx < gw; gx++) {
            if (row[gx] !== '1') continue;

            const px = firstCenterX + (cursor + gx) * spacing;
            const py = firstCenterY + gy * spacing;
            const s = dotSize * 0.88;

            const a = 0.55 + 0.45 * Math.min(1, Math.max(0, brightness));
            ctx.fillStyle = `rgba(230, 242, 255, ${a})`;
            const rCorner = Math.max(2, s * 0.28);
            roundRect(ctx, px - s / 2, py - s / 2, s, s, rCorner);
            ctx.fill();
          }
        }

        cursor += gw + charGap;
      }
    };

    resize();
    draw();

    window.addEventListener('resize', resize);

    let timeoutId: number | undefined;
    let intervalId: number | undefined;

    const start = () => {
      const delay = 1000 - (Date.now() % 1000);
      timeoutId = window.setTimeout(() => {
        draw();
        intervalId = window.setInterval(draw, 1000);
      }, delay);
    };

    start();

    return () => {
      window.removeEventListener('resize', resize);
      if (timeoutId) window.clearTimeout(timeoutId);
      if (intervalId) window.clearInterval(intervalId);
    };
  }, [brightness, dotSize, spacing]);

  return (
    <div className={className} style={{ width: 520, height: 260 }}>
      <canvas ref={canvasRef} className="block" aria-label="Digital dot-matrix clock" />
    </div>
  );
}

const GLYPHS_3X5: Record<string, string[]> = {
  '0': ['111', '101', '101', '101', '111'],
  '1': ['010', '110', '010', '010', '111'],
  '2': ['111', '001', '111', '100', '111'],
  '3': ['111', '001', '111', '001', '111'],
  '4': ['101', '101', '111', '001', '001'],
  '5': ['111', '100', '111', '001', '111'],
  '6': ['111', '100', '111', '101', '111'],
  '7': ['111', '001', '001', '001', '001'],
  '8': ['111', '101', '111', '101', '111'],
  '9': ['111', '101', '111', '001', '111'],
  ':': ['0', '1', '0', '1', '0'],
  ' ': ['000', '000', '000', '000', '000']
};

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

function pseudoNoise(x: number, y: number, seed: number) {
  const s = Math.sin(x * 127.1 + y * 311.7 + seed * 0.013) * 43758.5453;
  return s - Math.floor(s);
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
