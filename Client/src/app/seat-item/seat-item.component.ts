import { Component, Input } from '@angular/core';
import Seat from '../Seat';

/***
 * Created by Srvraj311 (Sourabh)
 * sourabhraj311@gmail.com
 *
 * Seat-Item
 * Takes an array of seats from the parent and renders each one.
 * Grey = booked, outlined = available, blue = seats you just booked.
 */
@Component({
  selector: 'app-seat-item',
  templateUrl: './seat-item.component.html',
  styleUrls: ['./seat-item.component.css'],
})
export class SeatItemComponent {
  @Input() seatArr: Seat[] = [];
  @Input() mine: Set<number | string> = new Set();
  @Input() rowLabel: number | null = null;
  @Input() cols = 0;
  @Input() preview: Set<number | string> = new Set();
  @Input() hot = false;

  // Coaches with few seats per row get bigger seats.
  get size() {
    const c = this.cols || this.seatArr.length;
    return c <= 4 ? 64 : c <= 6 ? 54 : 46;
  }

  isMine(seat: Seat) {
    return this.mine.has(seat.number);
  }

  label(seat: Seat) {
    const state = this.isMine(seat) ? 'your seat' : seat.booked ? 'booked' : this.preview.has(seat.number) ? 'available, next in line' : 'available';
    return `Seat ${seat.number}, ${state}`;
  }

  trackSeat(_: number, seat: Seat) {
    return seat.number;
  }
}
