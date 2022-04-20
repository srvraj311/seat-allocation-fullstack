import {Injectable} from '@angular/core';
import {e, max, number} from 'mathjs';
import {BehaviorSubject} from 'rxjs';
import {DataService} from './data.service';
import Seat from './Seat';

@Injectable({
  providedIn: 'root',
})
/***
 * Created by Srvraj311 (Sourabh)
 * sourabhraj311@gmail.com
 *
 * Booking Service
 * This service provides all the functionalities for booking
 * All the logic are includes in this service itself.
 */

export class BookingService {
  availableSeats!:number;
  constructor(private dataService: DataService) {
    this.dataService.getAvailableSeat.subscribe((a) => this.availableSeats = a);
  }

  // Function to book seats
  // parameters : n -> Number of seats needed to book
  bookSeat(n: number) {
    if (this.availableSeats === 0) {
      alert('Seats are Full');
      return;
    } else if (this.availableSeats < n) {
      alert('Selected amount of seats is not available to book, try less');
      return;
    } else {
      this.dataService.makeBookRequest(n).subscribe((res) => {
        this.dataService.changeMat(this.dataService.convertBinaryToMatrix(res.coach.bookingState))
        this.dataService.updateBookedSeat(res.bookedSeat);
        this.dataService.updateAvailableSeats(res.coach.availableSeats);

      })
      return;
    }
  }
  generateSeatsRandom(){
    this.dataService.generateRandom().subscribe((res) => {
      this.dataService.changeMat(this.dataService.convertBinaryToMatrix(res.coach.bookingState))
      this.dataService.updateBookedSeat(res.bookedSeat);
      this.dataService.updateAvailableSeats(res.coach.availableSeats);
    })
  }
  resetMatrix(){
    this.dataService.resetMatrix().subscribe((res) => {
      this.dataService.changeMat(this.dataService.convertBinaryToMatrix(res.coach.bookingState))
      this.dataService.updateBookedSeat(res.bookedSeat);
      this.dataService.updateAvailableSeats(res.coach.totalSeats);
    })
  }
}
