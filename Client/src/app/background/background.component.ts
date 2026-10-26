import { Component, ElementRef, NgZone, OnDestroy, OnInit, ViewChild } from '@angular/core';

interface Dot {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
}

interface Orb {
  x: number;
  y: number;
  r: number;
  hue: string;
  phase: number;
  speed: number;
}

/***
 * Created by Srvraj311 (Sourabh)
 * sourabhraj311@gmail.com
 *
 * Background
 * A particles.js-style canvas: slowly drifting glow orbs for depth and small dots that link up
 * when close and gently move away from the cursor. Runs outside Angular's zone, pauses when the tab
 * is hidden and renders a single still frame for users who prefer reduced motion.
 */
@Component({
  selector: 'app-background',
  template: '<canvas #c aria-hidden="true"></canvas>',
  styles: [
    ':host{position:fixed;inset:0;z-index:0;pointer-events:none;overflow:hidden}canvas{display:block;width:100%;height:100%}',
  ],
})
export class BackgroundComponent implements OnInit, OnDestroy {
  @ViewChild('c', { static: true }) canvas!: ElementRef<HTMLCanvasElement>;

  private ctx!: CanvasRenderingContext2D;
  private w = 0;
  private h = 0;
  private dpr = 1;
  private dots: Dot[] = [];
  private orbs: Orb[] = [];
  private mouse = { x: -9999, y: -9999 };
  private raf = 0;
  private dark = false;
  private reduced = false;
  private mo?: MutationObserver;
  private mqMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  constructor(private zone: NgZone) {}

  ngOnInit() {
    this.ctx = this.canvas.nativeElement.getContext('2d')!;
    this.dark = document.documentElement.dataset['theme'] !== 'light';
    this.reduced = this.mqMotion.matches;
    this.resize();
    window.addEventListener('resize', this.onResize);
    window.addEventListener('mousemove', this.onMove, { passive: true });
    window.addEventListener('mouseleave', this.onLeave);
    document.addEventListener('visibilitychange', this.onVisibility);
    this.mo = new MutationObserver(this.onScheme);
    this.mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    this.mqMotion.addEventListener('change', this.onMotion);
    this.start();
  }

  ngOnDestroy() {
    this.stop();
    window.removeEventListener('resize', this.onResize);
    window.removeEventListener('mousemove', this.onMove);
    window.removeEventListener('mouseleave', this.onLeave);
    document.removeEventListener('visibilitychange', this.onVisibility);
    this.mo?.disconnect();
    this.mqMotion.removeEventListener('change', this.onMotion);
  }

  private onResize = () => this.resize();
  private onMove = (e: MouseEvent) => {
    this.mouse.x = e.clientX;
    this.mouse.y = e.clientY;
  };
  private onLeave = () => (this.mouse.x = this.mouse.y = -9999);
  private onVisibility = () => (document.hidden ? this.stop() : this.start());
  private onScheme = () => {
    this.dark = document.documentElement.dataset['theme'] !== 'light';
    if (this.reduced) this.draw();
  };
  private onMotion = (e: MediaQueryListEvent) => {
    this.reduced = e.matches;
    this.stop();
    this.start();
  };

  private start() {
    if (this.raf) return;
    if (this.reduced) return this.draw();
    this.zone.runOutsideAngular(() => {
      const loop = () => {
        this.step();
        this.draw();
        this.raf = requestAnimationFrame(loop);
      };
      this.raf = requestAnimationFrame(loop);
    });
  }

  private stop() {
    cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  private resize() {
    const el = this.canvas.nativeElement;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.w = window.innerWidth;
    this.h = window.innerHeight;
    el.width = this.w * this.dpr;
    el.height = this.h * this.dpr;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    const count = Math.min(90, Math.round((this.w * this.h) / 17000));
    this.dots = Array.from({ length: count }, () => ({
      x: Math.random() * this.w,
      y: Math.random() * this.h,
      vx: (Math.random() - 0.5) * 0.35,
      vy: (Math.random() - 0.5) * 0.35,
      r: 1 + Math.random() * 1.8,
    }));
    const base = Math.max(this.w, this.h);
    const hues = ['#0a84ff', '#bf5af2', '#30d158', '#ff9f0a', '#64d2ff'];
    this.orbs = hues.map((hue, i) => ({
      x: Math.random() * this.w,
      y: Math.random() * this.h,
      r: base * (0.22 + Math.random() * 0.14),
      hue,
      phase: Math.random() * Math.PI * 2,
      speed: 0.00012 + Math.random() * 0.00012 + i * 0.00002,
    }));
    if (this.reduced) this.draw();
  }

  private step() {
    const t = performance.now();
    for (const o of this.orbs) {
      o.x += Math.cos(t * o.speed + o.phase) * 0.35;
      o.y += Math.sin(t * o.speed * 1.3 + o.phase) * 0.35;
    }
    for (const d of this.dots) {
      const dx = d.x - this.mouse.x;
      const dy = d.y - this.mouse.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 140 && dist > 0) {
        const f = (140 - dist) / 140;
        d.vx += (dx / dist) * f * 0.06;
        d.vy += (dy / dist) * f * 0.06;
      }
      d.vx *= 0.985;
      d.vy *= 0.985;
      // keep a minimum drift so dots never freeze
      if (Math.abs(d.vx) + Math.abs(d.vy) < 0.1) {
        d.vx += (Math.random() - 0.5) * 0.05;
        d.vy += (Math.random() - 0.5) * 0.05;
      }
      d.x += d.vx;
      d.y += d.vy;
      if (d.x < -10) d.x = this.w + 10;
      else if (d.x > this.w + 10) d.x = -10;
      if (d.y < -10) d.y = this.h + 10;
      else if (d.y > this.h + 10) d.y = -10;
    }
  }

  private draw() {
    const { ctx, w, h } = this;
    ctx.clearRect(0, 0, w, h);

    const orbAlpha = this.dark ? '38' : '30';
    for (const o of this.orbs) {
      const g = ctx.createRadialGradient(o.x, o.y, 0, o.x, o.y, o.r);
      g.addColorStop(0, o.hue + orbAlpha);
      g.addColorStop(1, o.hue + '00');
      ctx.fillStyle = g;
      ctx.fillRect(o.x - o.r, o.y - o.r, o.r * 2, o.r * 2);
    }

    const rgb = this.dark ? '160,205,255' : '0,113,227';
    const link = 120;
    for (let i = 0; i < this.dots.length; i++) {
      const a = this.dots[i];
      for (let j = i + 1; j < this.dots.length; j++) {
        const b = this.dots[j];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (d < link) {
          ctx.strokeStyle = `rgba(${rgb},${(1 - d / link) * 0.28})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
      ctx.fillStyle = `rgba(${rgb},0.55)`;
      ctx.beginPath();
      ctx.arc(a.x, a.y, a.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
