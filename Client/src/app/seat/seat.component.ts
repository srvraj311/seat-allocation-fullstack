import { ChangeDetectorRef, Component, ElementRef, HostListener, OnDestroy, ViewChild } from '@angular/core';
import { map } from 'rxjs/operators';
import { Subscription } from 'rxjs';
import { DataService, Explain } from '../data.service';
import { BookingService } from '../booking.service';

const BADGES: Record<Explain['strategy'], string> = {
  'adjacent-exact': 'Side by side',
  'adjacent-fit': 'Side by side',
  'same-row-gaps': 'Same row',
  'multi-row': 'Across rows',
};

/***
 * Created by Srvraj311 (Sourabh)
 * sourabhraj311@gmail.com
 *
 * Seat Component, responsible for showing the live seat map of the selected coach.
 * It reads everything from the shared state, so it updates in realtime after each booking.
 * After a booking it also shows a popover, anchored over the booked seats, that explains
 * which algorithm picked them and how much work it took compared to brute force.
 */
@Component({
  selector: 'app-seat',
  templateUrl: './seat.component.html',
  styleUrls: ['./seat.component.css'],
})
export class SeatComponent implements OnDestroy {
  @ViewChild('card') card?: ElementRef<HTMLElement>;
  @ViewChild('pop') pop?: ElementRef<HTMLElement>;

  pos: { top: number; left: number; arrow: number; below: boolean } | null = null;
  badges = BADGES;

  vm$ = this.dataService.state$.pipe(
    map((s) => {
      const m = s.explain?.metrics;
      const checked = m ? m.rowsInspected + m.windowsEvaluated : 0;
      return {
        ...s,
        mine: new Set<number | string>(s.bookedSeats.map((b) => b.number)),
        next: new Set<number | string>(s.preview),
        trainName: s.trains.find((t) => t.train_no === s.selectedTrain)?.name ?? '',
        total: s.coach?.totalSeats ?? 0,
        booked: (s.coach?.totalSeats ?? 0) - s.available,
        skeletonRows: Array.from({ length: 9 }),
        checked,
        ratio: m && checked ? Math.round(m.bruteForceCombinations / checked) : 0,
      };
    })
  );

  private sub: Subscription;
  private lastKey = '';

  constructor(
    private dataService: DataService,
    private bookingService: BookingService,
    private cdr: ChangeDetectorRef
  ) {
    // Re-anchor the popover whenever a new explanation arrives or it is reopened.
    this.sub = this.dataService.state$.subscribe((s) => {
      const key = s.explainOpen && s.explain ? s.bookedSeats.map((b) => b.number).join(',') + s.explain.metrics.timeMs : '';
      if (key === this.lastKey) return;
      this.lastKey = key;
      this.pos = null;
      if (key) setTimeout(() => this.place(true), 60);
    });
  }

  ngOnDestroy() {
    this.sub.unsubscribe();
  }

  @HostListener('document:keydown.escape')
  close() {
    if (this.dataService.state.explainOpen) this.bookingService.toggleExplain(false);
  }

  @HostListener('window:resize')
  onResize() {
    if (this.dataService.state.explainOpen) this.place(false);
  }

  trackRow(i: number) {
    return i;
  }

  // Position the popover above (or below) the group of booked seats, with an arrow to its centre.
  private place(scroll: boolean) {
    const card = this.card?.nativeElement;
    const pop = this.pop?.nativeElement;
    const state = this.dataService.state;
    if (!card || !pop) return;
    const els = state.bookedSeats
      .map((b) => card.querySelector<HTMLElement>(`[data-seat="${b.number}"]`))
      .filter((e): e is HTMLElement => !!e);
    if (!els.length) return;

    if (scroll) {
      els[0].scrollIntoView({ block: 'center', behavior: 'smooth' });
      // wait for the scroll so we can pick above / below from the final viewport position
      setTimeout(() => this.measure(card, pop, els), 420);
    } else {
      this.measure(card, pop, els);
    }
  }

  private measure(card: HTMLElement, pop: HTMLElement, els: HTMLElement[]) {
    const c = card.getBoundingClientRect();
    const rects = els.map((e) => e.getBoundingClientRect());
    const top = Math.min(...rects.map((r) => r.top));
    const bottom = Math.max(...rects.map((r) => r.bottom));
    const centre = (Math.min(...rects.map((r) => r.left)) + Math.max(...rects.map((r) => r.right))) / 2;
    const w = pop.offsetWidth;
    const h = pop.offsetHeight;
    const gap = 12;
    const above = top - 64 >= h + gap || top - 64 > window.innerHeight - bottom;
    const left = Math.min(Math.max(centre - c.left - w / 2, 8), c.width - w - 8);
    this.pos = {
      top: above ? top - c.top - h - gap : bottom - c.top + gap,
      left,
      arrow: Math.min(Math.max(centre - c.left - left, 22), w - 22),
      below: !above,
    };
    this.cdr.detectChanges();
  }
}
