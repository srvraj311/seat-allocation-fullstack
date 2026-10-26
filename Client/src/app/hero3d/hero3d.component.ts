import { AfterViewInit, Component, ElementRef, NgZone, OnDestroy, ViewChild } from '@angular/core';
import type * as ThreeNS from 'three';
import { Subscription } from 'rxjs';
import { DataService, Explain } from '../data.service';

/***
 * Created by Srvraj311 (Sourabh)
 * sourabhraj311@gmail.com
 *
 * Hero3D
 * Three glossy 3D seats rendered with three.js, one per seat state used in the app:
 * available (green), yours (blue) and booked (black).
 *  - idle: seats float and turn slowly, and follow the pointer
 *  - while a booking request is in flight: the seats shake, like the "up next" seats on the map
 *  - when a booking succeeds: your (blue) seat spins a full turn, hops, and confetti bursts out
 * three.js is loaded lazily so it never blocks the first paint. Rendering pauses when the tab is
 * hidden or the canvas is off screen, and reduced-motion users get a single still frame.
 */
@Component({
  selector: 'app-hero3d',
  template: '<canvas #c aria-hidden="true"></canvas>',
  styles: [':host{display:block;position:relative}canvas{display:block;width:100%;height:100%;outline:none}'],
})
export class Hero3dComponent implements AfterViewInit, OnDestroy {
  @ViewChild('c', { static: true }) canvas!: ElementRef<HTMLCanvasElement>;

  private sub?: Subscription;
  private raf = 0;
  private dispose?: () => void;
  private destroyed = false;
  private busy = false;
  private burst?: () => void;
  private lastExplain: Explain | null = null;

  constructor(
    private host: ElementRef<HTMLElement>,
    private zone: NgZone,
    private data: DataService
  ) {}

  ngAfterViewInit() {
    this.sub = this.data.state$.subscribe((s) => {
      this.busy = s.busy;
      if (s.explain && s.explain !== this.lastExplain) this.burst?.();
      this.lastExplain = s.explain;
    });
    this.zone.runOutsideAngular(() => this.init().catch(() => (this.host.nativeElement.style.display = 'none')));
  }

  ngOnDestroy() {
    this.destroyed = true;
    this.sub?.unsubscribe();
    cancelAnimationFrame(this.raf);
    this.dispose?.();
  }

  private async init() {
    const THREE = await import('three');
    const { RoundedBoxGeometry } = await import('three/examples/jsm/geometries/RoundedBoxGeometry.js');
    if (this.destroyed) return;

    const canvas = this.canvas.nativeElement;
    const host = this.host.nativeElement;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 50);
    camera.position.set(0, 1.5, 7.4);
    camera.lookAt(0, 0.8, 0);

    scene.add(new THREE.HemisphereLight(0xffffff, 0x8899bb, 1.2));
    const sun = new THREE.DirectionalLight(0xffffff, 2.4);
    sun.position.set(3, 6, 5);
    scene.add(sun);
    const rim = new THREE.DirectionalLight(0x9cc2ff, 1.3);
    rim.position.set(-4, 3, -3);
    scene.add(rim);

    const geos: ThreeNS.BufferGeometry[] = [];
    const box = (w: number, h: number, d: number, r: number) => {
      const g = new RoundedBoxGeometry(w, h, d, 4, r);
      geos.push(g);
      return g;
    };

    // A seat built from rounded boxes, same silhouette as the 2D seat icons.
    const makeSeat = (color: number, label: string) => {
      const g = new THREE.Group();
      const mat = new THREE.MeshPhysicalMaterial({ color, roughness: 0.3, metalness: 0.1, clearcoat: 1, clearcoatRoughness: 0.12 });
      const shade = new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(color).multiplyScalar(0.72),
        roughness: 0.35,
        clearcoat: 0.8,
      });
      const add = (geo: ThreeNS.BufferGeometry, m: ThreeNS.Material, x: number, y: number, z: number) => {
        const mesh = new THREE.Mesh(geo, m);
        mesh.position.set(x, y, z);
        g.add(mesh);
        return mesh;
      };
      add(box(1.0, 1.2, 0.32, 0.13), mat, 0, 1.0, -0.4); // backrest
      add(box(0.55, 0.24, 0.22, 0.09), shade, 0, 1.75, -0.4); // headrest
      add(box(1.0, 0.3, 1.0, 0.13), shade, 0, 0.38, 0); // cushion
      add(box(0.17, 0.52, 0.9, 0.08), mat, -0.6, 0.66, -0.02); // armrests
      add(box(0.17, 0.52, 0.9, 0.08), mat, 0.6, 0.66, -0.02);
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.14, 0.3, 16), new THREE.MeshStandardMaterial({ color: 0x2c2c2e, metalness: 0.7, roughness: 0.4 }));
      post.position.set(0, 0.07, 0);
      geos.push(post.geometry);
      g.add(post);

      // seat number printed on the backrest
      const cv = document.createElement('canvas');
      cv.width = cv.height = 128;
      const cx = cv.getContext('2d')!;
      cx.fillStyle = '#fff';
      cx.font = '700 78px -apple-system, "Segoe UI", sans-serif';
      cx.textAlign = 'center';
      cx.textBaseline = 'middle';
      cx.fillText(label, 64, 68);
      const tex = new THREE.CanvasTexture(cv);
      const plate = new THREE.Mesh(
        new THREE.PlaneGeometry(0.62, 0.62),
        new THREE.MeshBasicMaterial({ map: tex, transparent: true })
      );
      geos.push(plate.geometry);
      plate.position.set(0, 1.02, -0.235);
      g.add(plate);
      return g;
    };

    const seats = [
      { g: makeSeat(0x34c759, '12'), x: -1.7, phase: 0 },
      { g: makeSeat(0x5e5ce6, '13'), x: 0, phase: 1.6 },
      { g: makeSeat(0x1c1c1e, '14'), x: 1.7, phase: 3.1 },
    ];
    const shadows: ThreeNS.Mesh[] = [];
    for (const s of seats) {
      s.g.position.x = s.x;
      scene.add(s.g);
      const sh = new THREE.Mesh(
        new THREE.CircleGeometry(0.7, 28),
        new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.14 })
      );
      geos.push(sh.geometry);
      sh.rotation.x = -Math.PI / 2;
      sh.position.set(s.x, -0.06, 0);
      scene.add(sh);
      shadows.push(sh);
    }
    const yours = seats[1];

    // Confetti, coloured like the seats
    const palette = [0x5ac8fa, 0x5e5ce6, 0x34c759, 0xff9f0a, 0xbf5af2, 0x1c1c1e];
    type Piece = { m: ThreeNS.Mesh; v: ThreeNS.Vector3; spin: ThreeNS.Vector3; life: number };
    const pieces: Piece[] = [];
    const pieceGeo = new THREE.BoxGeometry(0.1, 0.1, 0.1);
    let spin = 0;
    this.burst = () => {
      if (reduced) return;
      spin = 1;
      for (let i = 0; i < 46; i++) {
        const m = new THREE.Mesh(
          pieceGeo,
          new THREE.MeshStandardMaterial({ color: palette[i % palette.length], roughness: 0.4, transparent: true })
        );
        m.position.set((Math.random() - 0.5) * 1.2, 1.6, (Math.random() - 0.5) * 0.8);
        scene.add(m);
        pieces.push({
          m,
          v: new THREE.Vector3((Math.random() - 0.5) * 0.09, 0.05 + Math.random() * 0.07, (Math.random() - 0.5) * 0.05),
          spin: new THREE.Vector3(Math.random() * 0.2, Math.random() * 0.2, Math.random() * 0.2),
          life: 1,
        });
      }
    };

    // Pointer parallax
    let px = 0;
    let py = 0;
    const onMove = (e: PointerEvent) => {
      px = (e.clientX / window.innerWidth) * 2 - 1;
      py = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener('pointermove', onMove, { passive: true });

    const resize = () => {
      const w = host.clientWidth || 300;
      const h = host.clientHeight || 160;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      // keep all three seats in frame on narrow screens
      camera.position.z = w / h < 2 ? 9.4 : 7.4;
      camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(host);
    resize();

    let visible = true;
    const io = new IntersectionObserver((e) => (visible = e[0].isIntersecting));
    io.observe(host);

    let t = 0;
    const frame = () => {
      this.raf = requestAnimationFrame(frame);
      if (!visible || document.hidden) return;
      t += 0.016;
      spin *= 0.95;

      seats.forEach((s, i) => {
        const bob = Math.sin(t * 1.3 + s.phase) * 0.07;
        const shake = this.busy ? Math.sin(t * 70 + i) * 0.03 : 0;
        s.g.position.x = s.x + shake;
        s.g.position.y = 0.1 + bob;
        s.g.rotation.y = Math.sin(t * 0.55 + s.phase) * 0.38 + px * 0.5;
        s.g.rotation.x = py * 0.1;
        s.g.rotation.z = this.busy ? Math.sin(t * 55 + i * 2) * 0.05 : 0;
        const sh = shadows[i];
        const k = 1 - bob * 1.2;
        sh.scale.set(k, k, k);
      });
      // your seat does a full turn and a hop when a booking lands
      const turn = (1 - Math.pow(spin, 0.5)) * Math.PI * 2;
      if (spin > 0.0004) {
        yours.g.rotation.y += turn;
        yours.g.position.y += Math.sin(Math.min(spin, 1) * Math.PI) * 0.45;
      }

      for (let i = pieces.length - 1; i >= 0; i--) {
        const p = pieces[i];
        p.v.y -= 0.0032;
        p.m.position.add(p.v);
        p.m.rotation.x += p.spin.x;
        p.m.rotation.y += p.spin.y;
        p.life -= 0.012;
        (p.m.material as ThreeNS.MeshStandardMaterial).opacity = Math.max(p.life, 0);
        if (p.life <= 0) {
          scene.remove(p.m);
          (p.m.material as ThreeNS.Material).dispose();
          pieces.splice(i, 1);
        }
      }
      renderer.render(scene, camera);
    };

    if (reduced) {
      seats.forEach((s) => {
        s.g.position.y = 0.1;
        s.g.rotation.y = -0.3;
      });
      renderer.render(scene, camera);
    } else {
      frame();
    }

    this.dispose = () => {
      window.removeEventListener('pointermove', onMove);
      ro.disconnect();
      io.disconnect();
      geos.forEach((g) => g.dispose());
      renderer.dispose();
    };
  }
}
