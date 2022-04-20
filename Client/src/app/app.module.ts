import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { AppComponent } from './app.component';
import { SeatComponent } from './seat/seat.component';
import { SeatItemComponent } from './seat-item/seat-item.component';
import { BookingComponent } from './booking/booking.component';
import { FormsModule } from '@angular/forms';
import { HttpClientModule} from "@angular/common/http";

@NgModule({
  declarations: [
    AppComponent,
    SeatComponent,
    SeatItemComponent,
    BookingComponent,
  ],
  imports: [BrowserModule, FormsModule , HttpClientModule ],
  providers: [],
  bootstrap: [AppComponent],
})
export class AppModule {}
