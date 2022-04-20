import {Component, OnInit} from '@angular/core';
import {zeros} from 'mathjs';
import {BookingService} from '../booking.service';
import {DataService} from '../data.service';
import Seat from '../Seat';
import Train from '../Train'
import Coach from '../Coach'

/***
 * Created by Srvraj311 (Sourabh)
 * sourabhraj311@gmail.com
 *
 * Seat Component, This component is responsible for showing current booking details to user.
 * Two Services are injected to this component
 * 1. dataService - Responsible to get realtime updates of booking and display them onto screen
 * 2. bookingService - To initially initiate the booking service responibl for all the functionalities
 */

@Component({
  selector: 'app-seat',
  templateUrl: './seat.component.html',
  styleUrls: ['./seat.component.css'],
})
export class SeatComponent implements OnInit {
  mat!: Seat[][];
  constructor(
    private dataService: DataService
  ) {
    this.dataService.getMat.subscribe((mat) => {
      this.mat = mat;
    });
  }

  ngOnInit(): void {
    if (!this.mat) {
      this.dataService.getMat.subscribe((mat) => {
        this.mat = mat;
      });
    }
  }
}
