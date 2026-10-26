import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { AppComponent } from './app.component';
import { SeatComponent } from './seat/seat.component';
import { SeatItemComponent } from './seat-item/seat-item.component';
import { BookingComponent } from './booking/booking.component';
import { FormsModule } from '@angular/forms';
import { BackgroundComponent } from './background/background.component';
import { Hero3dComponent } from './hero3d/hero3d.component';
import { TiltDirective } from './tilt.directive';
import { HttpClientModule } from '@angular/common/http';

@NgModule({
  declarations: [AppComponent, SeatComponent, SeatItemComponent, BookingComponent, BackgroundComponent, Hero3dComponent, TiltDirective],
  imports: [BrowserModule, FormsModule, HttpClientModule],
  bootstrap: [AppComponent],
})
export class AppModule {}
