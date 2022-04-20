import {
  Component,
  Input,
  OnInit,
  OnChanges,
  SimpleChange,
} from '@angular/core';
import Seat from '../Seat';
/***
 * Created by Srvraj311 (Sourabh)
 * sourabhraj311@gmail.com
 *
 * Seat-Item
 * This component takes an array from parent as @Input and then displays the information stored in each seat
 * Red for booked , White for available
 */
@Component({
  selector: 'app-seat-item',
  templateUrl: './seat-item.component.html',
  styleUrls: ['./seat-item.component.css'],
})
export class SeatItemComponent implements OnInit {
  @Input() seatArr: Seat[] = [];
  constructor() {}
  ngOnInit(): void {}
}
