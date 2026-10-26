import { Injectable } from '@angular/core';
import { DataService, BookingResponse } from './data.service';
import Coach from './Coach';
import { Observable, Subscription } from 'rxjs';

export const MAX_SEATS = 7;

/***
 * Created by Srvraj311 (Sourabh)
 * sourabhraj311@gmail.com
 *
 * Booking Service
 * Orchestrates every user action (load trains, pick a coach, book, reset ...)
 * and pushes the result into DataService's state.
 */
@Injectable({
  providedIn: 'root',
})
export class BookingService {
  private count = 2;
  private previewSub?: Subscription;

  constructor(private data: DataService) {}

  // Seat count chosen in the UI. Drives the "up next" preview on the map.
  setCount(n: number) {
    this.count = n;
    this.refreshPreview();
  }

  setPreviewHot(hot: boolean) {
    if (this.data.state.previewHot !== hot) this.data.patch({ previewHot: hot });
  }

  // Asks the server (same engine as the real booking) which seats the next booking would get.
  refreshPreview() {
    this.previewSub?.unsubscribe();
    const { coach, available, mat } = this.data.state;
    if (!coach || !mat.length || available < this.count || this.count < 1) {
      this.data.patch({ preview: [] });
      return;
    }
    const id = coach.coach_id;
    this.previewSub = this.data.getPreview(id, this.count).subscribe({
      next: (r) => {
        if (this.data.state.coach?.coach_id === id) this.data.patch({ preview: r.seats });
      },
      error: () => this.data.patch({ preview: [] }),
    });
  }

  loadTrains() {
    this.data.patch({ trainsLoading: true, loadError: null });
    this.data.getTrains().subscribe({
      next: (trains) => {
        this.data.patch({ trains, trainsLoading: false });
        if (trains.length && this.data.state.selectedTrain === null) this.selectTrain(trains[0].train_no);
      },
      error: (e) => this.data.patch({ trainsLoading: false, loadError: this.data.errorMessage(e) }),
    });
  }

  selectTrain(trainNo: number) {
    this.data.patch({
      selectedTrain: trainNo,
      coaches: [],
      coach: null,
      mat: [],
      bookedSeats: [],
      explain: null,
      explainOpen: false,
      preview: [],
      available: 0,
      coachesLoading: true,
      mapLoading: false,
      loadError: null,
    });
    this.data.getCoaches(trainNo).subscribe({
      next: (list) => {
        if (this.data.state.selectedTrain !== trainNo) return; // user already moved on
        const coaches = this.sort(list);
        this.data.patch({ coaches, coachesLoading: false });
        if (coaches.length) this.applyCoach(coaches[0]);
      },
      error: (e) => {
        if (this.data.state.selectedTrain !== trainNo) return;
        this.data.patch({ coachesLoading: false, loadError: this.data.errorMessage(e) });
      },
    });
  }

  // Shows the cached coach immediately, then re-fetches so the seat map is never stale.
  selectCoach(coachId: number) {
    const trainNo = this.data.state.selectedTrain;
    if (trainNo === null) return;
    const cached = this.data.state.coaches.find((c) => c.coach_id === coachId);
    if (cached) this.applyCoach(cached);
    this.data.patch({ mapLoading: true });
    this.data.getCoaches(trainNo).subscribe({
      next: (list) => {
        if (this.data.state.selectedTrain !== trainNo || this.data.state.coach?.coach_id !== coachId) return;
        const coaches = this.sort(list);
        this.data.patch({ coaches });
        const fresh = coaches.find((c) => c.coach_id === coachId);
        if (fresh) this.applyCoach(fresh);
        this.data.patch({ mapLoading: false });
      },
      error: (e) => {
        this.data.patch({ mapLoading: false });
        this.data.toast('error', this.data.errorMessage(e));
      },
    });
  }

  book(n: number) {
    const { coach, available, busy } = this.data.state;
    if (!coach || busy) return;
    if (!Number.isInteger(n) || n < 1 || n > MAX_SEATS) {
      this.data.toast('error', `Choose between 1 and ${MAX_SEATS} seats.`);
      return;
    }
    if (available === 0) return this.data.toast('error', 'This coach is full.');
    if (available < n) {
      return this.data.toast('error', `Only ${available} seat${available > 1 ? 's' : ''} left in this coach.`);
    }

    const start = performance.now();
    this.run(this.data.makeBookRequest(coach.coach_id, n), (res) => {
      this.applyResponse(res, performance.now() - start);
      const nums = res.bookedSeat.map((s) => s.number).join(', ');
      this.data.toast('success', `Booked seat${res.bookedSeat.length > 1 ? 's' : ''} ${nums}`);
    });
  }

  generateSeatsRandom() {
    const coach = this.data.state.coach;
    if (!coach) return;
    this.run(this.data.generateRandom(coach.coach_id), (res) => {
      this.applyResponse(res, null);
      this.data.toast('info', 'Coach filled with sample bookings.');
    });
  }

  resetMatrix() {
    const coach = this.data.state.coach;
    if (!coach) return;
    this.run(this.data.resetMatrix(coach.coach_id), (res) => {
      this.applyResponse(res, null);
      this.data.toast('info', 'Coach reset. All seats are available.');
    });
  }

  toggleExplain(open: boolean) {
    this.data.patch({ explainOpen: open });
  }

  private run(req: Observable<BookingResponse>, ok: (r: BookingResponse) => void) {
    this.data.patch({ busy: true });
    req.subscribe({
      next: (res) => {
        this.data.patch({ busy: false });
        ok(res);
      },
      error: (e) => {
        this.data.patch({ busy: false });
        this.data.toast('error', this.data.errorMessage(e));
      },
    });
  }

  private applyResponse(res: BookingResponse, ms: number | null) {
    const coaches = this.data.state.coaches.map((c) => (c.coach_id === res.coach.coach_id ? res.coach : c));
    this.data.patch({
      coaches,
      coach: res.coach,
      mat: this.data.convertBinaryToMatrix(res.coach.bookingState),
      bookedSeats: res.bookedSeat,
      explain: res.explain ?? null,
      explainOpen: !!res.explain,
      available: this.countFree(res.coach.bookingState),
      lastMs: ms,
      preview: [],
    });
    this.refreshPreview();
  }

  private applyCoach(c: Coach) {
    // A coach that was never initialised has no matrix yet, so generate one.
    if (c.bookingState.length <= 1) {
      this.data.patch({ coach: c, mat: [], bookedSeats: [], explain: null, explainOpen: false, preview: [], available: 0, mapLoading: true });
      this.data.resetMatrix(c.coach_id).subscribe({
        next: (res) => {
          if (this.data.state.coach?.coach_id !== c.coach_id) return;
          this.applyResponse(res, null);
          this.data.patch({ mapLoading: false });
        },
        error: (e) => {
          this.data.patch({ mapLoading: false });
          this.data.toast('error', this.data.errorMessage(e));
        },
      });
      return;
    }
    const same = this.data.state.coach?.coach_id === c.coach_id;
    this.data.patch({
      coach: c,
      mat: this.data.convertBinaryToMatrix(c.bookingState),
      bookedSeats: same ? this.data.state.bookedSeats : [],
      explain: same ? this.data.state.explain : null,
      explainOpen: same ? this.data.state.explainOpen : false,
      available: this.countFree(c.bookingState),
      lastMs: same ? this.data.state.lastMs : null,
      preview: [],
    });
    this.refreshPreview();
  }

  private sort(list: Coach[]) {
    return [...list].sort((a, b) => a.coach_id - b.coach_id);
  }

  private countFree(state: number[][]) {
    return state.reduce((sum, row) => sum + row.filter((v) => v !== 1).length, 0);
  }
}
