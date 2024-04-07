import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { AppComponent } from './app.component';
import { SeatComponent } from './seat/seat.component';
import { SeatItemComponent } from './seat-item/seat-item.component';
import { BookingComponent } from './booking/booking.component';
import { FormsModule } from '@angular/forms';
import { HttpClientModule} from "@angular/common/http";
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { MatProgressSpinnerModule  } from '@angular/material/progress-spinner'

@NgModule({
  declarations: [
    AppComponent,
    SeatComponent,
    SeatItemComponent,
    BookingComponent,
  ],
  imports: [BrowserModule, FormsModule , HttpClientModule, MatProgressSpinnerModule],
  providers: [
    provideAnimationsAsync()
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}
