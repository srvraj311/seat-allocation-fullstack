import Seat from "./Seat";
export default interface Coach{
  train_no : number
  coach_id:number;
  totalSeats:number;
  seatsInRows:number;
  availableSeats:number;
  bookingState:number[][];
}
