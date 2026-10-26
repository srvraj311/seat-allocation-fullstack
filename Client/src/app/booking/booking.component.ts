import { Component, OnDestroy } from '@angular/core';
import { BookingService, MAX_SEATS } from '../booking.service';
import { DataService } from '../data.service';

/***
 * Created by Srvraj311 (Sourabh)
 * sourabhraj311@gmail.com
 *
 * BOOKING COMPONENT
 * Train / coach pickers, the seat-count control and the booking actions.
 * Most of the user actions start here and are handled by BookingService.
 */
@Component({
  selector: 'app-booking',
  templateUrl: './booking.component.html',
  styleUrls: ['./booking.component.css'],
})
export class BookingComponent implements OnDestroy {
  state$ = this.dataService.state$;
  options = Array.from({ length: MAX_SEATS }, (_, i) => i + 1);
  noOfSeats = 2;
  confirmReset = false;
  skeletons = [1, 2, 3];
  private resetTimer?: ReturnType<typeof setTimeout>;

  constructor(
    private bookingService: BookingService,
    private dataService: DataService
  ) {}

  ngOnDestroy() {
    this.bookingService.setPreviewHot(false);
    clearTimeout(this.resetTimer);
  }

  setCount(n: number) {
    this.noOfSeats = n;
    this.bookingService.setCount(n);
  }

  hot(on: boolean) {
    this.bookingService.setPreviewHot(on);
  }

  book() {
    this.bookingService.book(this.noOfSeats);
  }

  generateRandom() {
    this.bookingService.generateSeatsRandom();
  }

  // Resetting wipes every booking, so it takes a second tap to confirm.
  clearSeats() {
    if (!this.confirmReset) {
      this.confirmReset = true;
      this.resetTimer = setTimeout(() => (this.confirmReset = false), 3500);
      return;
    }
    clearTimeout(this.resetTimer);
    this.confirmReset = false;
    this.bookingService.resetMatrix();
  }

  selectTrain(no: number, current: number | null) {
    if (no !== current) this.bookingService.selectTrain(no);
  }

  selectCoach(id: number, current: number | undefined) {
    if (id !== current) this.bookingService.selectCoach(id);
  }

  showWhy() {
    this.bookingService.toggleExplain(true);
  }

  retry() {
    this.bookingService.loadTrains();
  }
}
