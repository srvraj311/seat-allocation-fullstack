export default interface Coach {
  train_id: number;
  coach_id: number;
  totalSeats: number;
  seatsInRows: number;
  availableSeats: number;
  bookingState: number[][];
}
