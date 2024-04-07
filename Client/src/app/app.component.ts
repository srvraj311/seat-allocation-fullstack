import { Component } from '@angular/core';
import { DataService } from './data.service';
/***
 * Created by Srvraj311 (Sourabh)
 * sourabhraj311@gmail.com
 *
 *
 * Component - App
 * This is the root componenet for the application, which acts as entry point.
 *
 */
@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent {
  constructor(private dataService: DataService) {}

  spinnerVisible = true;
  ngOnInit(): void {
   this.dataService.getSpinnerVisible().subscribe(d => this.spinnerVisible = d);
  }
  title = 'Seat Allocation System : Demo';
}
