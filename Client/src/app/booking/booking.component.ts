import {Component, OnInit} from '@angular/core';
import {BookingService} from '../booking.service';
import {DataService} from '../data.service';
import Seat from '../Seat';
import Train from "../Train";
import Coach from "../Coach";

/***
 * Created by Srvraj311 (Sourabh)
 * sourabhraj311@gmail.com
 *
 * BOOKING COMPONENT
 * the following component is responsible for all the booking functionalities
 * Most of the function calls initiate from this class
 */
@Component({
  selector: 'app-booking',
  templateUrl: './booking.component.html',
  styleUrls: ['./booking.component.css'],
})
export class BookingComponent implements OnInit {
  // variable to take input from user, number of seats user wants to book
  noOfSeats!: number;
  availableSeats!: number;
  bookedSeat: Seat[] = [];
  timeTakenToBook = '0';
  trainArr!: Train[];
  selectedTrain!: number;
  coachArr!: Coach[];
  selectedCoach!: number;

  // Injecting Booking Service : Responsible for booking
  // DataService : Responsible for live changes to be updated on screen
  constructor(
    private bookingService: BookingService,
    private dataService: DataService,
  ) {
    this.dataService.getTrains().subscribe((trains) => this.trainArr = trains)
    this.dataService.getAvailableSeat.subscribe((a) => this.availableSeats = a);
  }

  ngOnInit(): void {
  }

  isAvailable() {
    return this.availableSeats === 0;
  }

  clearSeats() {
    this.bookingService.resetMatrix();
    this.bookedSeat = [];
  }

  // perform Booking operation with user input value.
  book() {
    const start = performance.now(); // For time calculation of algorithm
    let end;
    if (this.noOfSeats <= 7 && this.noOfSeats >= 1) {
      this.bookingService.bookSeat(this.noOfSeats);
      end = performance.now(); // For time calculation of algorithm
      this.dataService.getBookedSeat.subscribe((newBookedSeats) => {
        this.bookedSeat = newBookedSeats;
      });
      const timeTaken = end - start;
      this.timeTakenToBook = (Math.round(timeTaken * 10000) / 10000).toFixed(4);
    } else alert('Only 1-7 Seats are allowed to book');
  }

  // Fill the UI with Random state of booking
  generateRandom() {
    this.bookingService.generateSeatsRandom();
    this.dataService.getAvailableSeat.subscribe((s) => this.availableSeats = s);
  }

  selectTrain(train_num: number) {
    this.selectedTrain = train_num;
    this.dataService.getCoaches(train_num).subscribe((coach) => this.coachArr = coach);
    // this.selectedCoach = -1;
  }

  selectCoach(coach_id: number) {
    // UI
    this.selectedCoach = coach_id;
    // Network
    for (let c of this.coachArr) {
      if (c.coach_id == coach_id) {
        this.dataService.setCoach(c);
        return;
      }
    }
  }
}
