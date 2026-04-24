import { useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Heart } from "lucide-react";

/** Simulated ECG strip drawn on canvas with smooth scrolling waveform. */
export const EcgStrip = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    const dpr = window.devicePixelRatio || 1;

    const resize = () => {
      const { width, height } = canvas.getBoundingClientRect();
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.scale(dpr, dpr);
    };
    resize();
    window.addEventListener("resize", resize);

    // Generate one heartbeat shape (PQRST) sampled across 0..1
    const beat = (x: number) => {
      // x in [0,1)
      if (x < 0.1) return Math.sin(x * Math.PI * 10) * 0.05; // P
      if (x < 0.18) return 0;
      if (x < 0.22) return -0.1; // Q
      if (x < 0.26) return 1.0;  // R
      if (x < 0.30) return -0.35;// S
      if (x < 0.55) return Math.sin((x - 0.30) * Math.PI / 0.25) * 0.25; // T
      return 0;
    };

    const draw = () => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      ctx.clearRect(0, 0, w, h);

      // grid
      ctx.strokeStyle = "hsla(196, 30%, 25%, 0.4)";
      ctx.lineWidth = 1;
      for (let x = 0; x < w; x += 18) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
      }
      for (let y = 0; y < h; y += 18) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
      }

      // waveform
      tRef.current += 0.012;
      const period = 1.0; // one beat per "period" units of t
      const mid = h / 2;
      const amp = h * 0.38;

      ctx.strokeStyle = "hsl(354 85% 62%)";
      ctx.shadowColor = "hsl(354 85% 62%)";
      ctx.shadowBlur = 8;
      ctx.lineWidth = 2;
      ctx.beginPath();

      const samples = 220;
      for (let i = 0; i < samples; i++) {
        const px = (i / samples) * w;
        const u = (i / samples) * 3 + tRef.current; // 3 beats across the strip
        const phase = (u % period) / period;
        const y = mid - beat(phase) * amp;
        if (i === 0) ctx.moveTo(px, y);
        else ctx.lineTo(px, y);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;

      raf = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <Card className="glass-card overflow-hidden">
      <div className="flex items-center justify-between p-5 pb-3">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-vital/15 text-vital flex items-center justify-center">
            <Heart className="h-4 w-4 heartbeat" />
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Live ECG</div>
            <div className="text-sm">Lead I · Sinus rhythm</div>
          </div>
        </div>
        <div className="text-xs font-mono text-muted-foreground">250 Hz</div>
      </div>
      <div className="px-2 pb-2">
        <canvas ref={canvasRef} className="w-full h-40 rounded-xl bg-background/40" />
      </div>
    </Card>
  );
};