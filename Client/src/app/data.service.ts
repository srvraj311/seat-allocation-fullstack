import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import Seat from './Seat';
import Train from './Train';
import Coach from './Coach';

export interface Explain {
  strategy: 'adjacent-exact' | 'adjacent-fit' | 'same-row-gaps' | 'multi-row';
  title: string;
  summary: string;
  steps: string[];
  seats: string;
  metrics: {
    timeMs: number;
    rowsInspected: number;
    runsInspected: number;
    windowsEvaluated: number;
    seatsIndexed: number;
    bruteForceCombinations: number;
    timeComplexity: string;
    spaceComplexity: string;
  };
}

export interface BookingResponse {
  coach: Coach;
  bookedSeat: Seat[];
  explain?: Explain | null;
}

export interface Toast {
  id: number;
  kind: 'error' | 'success' | 'info';
  text: string;
}

export interface AppState {
  trains: Train[];
  coaches: Coach[];
  selectedTrain: number | null;
  coach: Coach | null;
  mat: Seat[][];
  bookedSeats: Seat[];
  available: number;
  trainsLoading: boolean;
  coachesLoading: boolean;
  mapLoading: boolean;
  busy: boolean;
  loadError: string | null;
  lastMs: number | null;
  explain: Explain | null;
  explainOpen: boolean;
  preview: number[];
  previewHot: boolean;
}

/***
 * Created by Srvraj311 (Sourabh)
 * sourabhraj311@gmail.com
 *
 * DataService
 * Holds the whole UI state (trains, coaches, seat matrix, loading flags, toasts) in one
 * observable so every component updates in realtime, and wraps the REST calls to the backend.
 */
@Injectable({
  providedIn: 'root',
})
export class DataService {
  private _url = '';
  private toastId = 0;

  private readonly _state = new BehaviorSubject<AppState>({
    trains: [],
    coaches: [],
    selectedTrain: null,
    coach: null,
    mat: [],
    bookedSeats: [],
    available: 0,
    trainsLoading: true,
    coachesLoading: false,
    mapLoading: false,
    busy: false,
    loadError: null,
    lastMs: null,
    explain: null,
    explainOpen: false,
    preview: [],
    previewHot: false,
  });
  readonly state$ = this._state.asObservable();

  private readonly _toasts = new BehaviorSubject<Toast[]>([]);
  readonly toasts$ = this._toasts.asObservable();

  constructor(private http: HttpClient) {}

  get state(): AppState {
    return this._state.value;
  }

  patch(p: Partial<AppState>) {
    this._state.next({ ...this._state.value, ...p });
  }

  toast(kind: Toast['kind'], text: string) {
    const t: Toast = { id: ++this.toastId, kind, text };
    this._toasts.next([...this._toasts.value, t].slice(-3));
    setTimeout(() => this.dismissToast(t.id), 4500);
  }

  dismissToast(id: number) {
    this._toasts.next(this._toasts.value.filter((t) => t.id !== id));
  }

  errorMessage(e: unknown): string {
    if (e instanceof HttpErrorResponse) {
      if (e.status === 0) return 'Cannot reach the server. Check your connection and try again.';
      if (e.error && typeof e.error.error === 'string') return e.error.error;
    }
    return 'Something went wrong. Please try again.';
  }

  getTrains(): Observable<Train[]> {
    return this.http.get<Train[]>(`${this._url}/trains`);
  }

  getCoaches(train_no: number): Observable<Coach[]> {
    return this.http.get<Coach[]>(`${this._url}/coach/${train_no}`);
  }

  getPreview(coachId: number, n: number) {
    return this.http.get<{ seats: number[]; strategy: string }>(`${this._url}/booking/preview/${coachId}/${n}`);
  }

  resetMatrix(coachId: number) {
    return this.http.get<BookingResponse>(`${this._url}/booking/clear/${coachId}`);
  }

  generateRandom(coachId: number) {
    return this.http.get<BookingResponse>(`${this._url}/booking/random/${coachId}`);
  }

  makeBookRequest(coachId: number, n: number) {
    return this.http.get<BookingResponse>(`${this._url}/booking/${coachId}/${n}`);
  }

  // Seat numbers are 1-based and continue across rows.
  convertBinaryToMatrix(mat: number[][]): Seat[][] {
    let count = 1;
    return mat.map((row) =>
      row.map((cell) => {
        const seat: Seat = { id: count, number: count, booked: cell === 1 };
        count++;
        return seat;
      })
    );
  }
}
