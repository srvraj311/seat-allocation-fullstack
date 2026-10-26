import { Directive, ElementRef, NgZone, OnDestroy, OnInit } from '@angular/core';

/***
 * Created by Srvraj311 (Sourabh)
 * sourabhraj311@gmail.com
 *
 * Tilt
 * Tilts the host element in 3D towards the pointer by setting --rx / --ry (degrees).
 * The CSS decides what to do with them. Seats lifted with translateZ inside a tilted
 * container show real depth. Disabled for touch pointers and reduced motion.
 */
@Directive({ selector: '[appTilt]' })
export class TiltDirective implements OnInit, OnDestroy {
  private max = 7;
  private off = false;

  constructor(
    private el: ElementRef<HTMLElement>,
    private zone: NgZone
  ) {}

  ngOnInit() {
    this.off =
      window.matchMedia('(prefers-reduced-motion: reduce)').matches || window.matchMedia('(pointer: coarse)').matches;
    if (this.off) return;
    this.zone.runOutsideAngular(() => {
      const n = this.el.nativeElement;
      n.addEventListener('pointermove', this.move);
      n.addEventListener('pointerleave', this.leave);
    });
  }

  ngOnDestroy() {
    const n = this.el.nativeElement;
    n.removeEventListener('pointermove', this.move);
    n.removeEventListener('pointerleave', this.leave);
  }

  private move = (e: PointerEvent) => {
    const n = this.el.nativeElement;
    const r = n.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    n.style.setProperty('--rx', `${(-y * this.max).toFixed(2)}deg`);
    n.style.setProperty('--ry', `${(x * this.max).toFixed(2)}deg`);
  };

  private leave = () => {
    const n = this.el.nativeElement;
    n.style.setProperty('--rx', '0deg');
    n.style.setProperty('--ry', '0deg');
  };
}
