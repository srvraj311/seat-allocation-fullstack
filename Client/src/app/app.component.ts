import { Component, OnInit } from '@angular/core';
import { DataService } from './data.service';
import { BookingService } from './booking.service';

/***
 * Created by Srvraj311 (Sourabh)
 * sourabhraj311@gmail.com
 *
 * Component - App
 * This is the root component for the application, which acts as entry point.
 * It renders the navigation bar, the page layout, toasts and the top progress bar.
 */
@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent implements OnInit {
  state$ = this.dataService.state$;
  theme: 'dark' | 'light' = document.documentElement.dataset['theme'] === 'light' ? 'light' : 'dark';
  toasts$ = this.dataService.toasts$;

  constructor(
    private dataService: DataService,
    private bookingService: BookingService
  ) {}

  ngOnInit(): void {
    this.bookingService.loadTrains();
  }

  toggleTheme() {
    this.theme = this.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', this.theme);
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', this.theme === 'dark' ? '#000000' : '#f5f5f7');
    try {
      localStorage.setItem('theme', this.theme);
    } catch {
      // private mode: the choice just will not persist
    }
  }

  dismiss(id: number) {
    this.dataService.dismissToast(id);
  }
}
