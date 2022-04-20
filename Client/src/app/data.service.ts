import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs/internal/BehaviorSubject';
import Seat from './Seat';
import Train from "./Train";
import {HttpClient} from "@angular/common/http";
import {Observable} from "rxjs";
import Coach from "./Coach";
import {number} from "mathjs";


@Injectable({
  providedIn: 'root',
})

/***
 * Created by Srvraj311 (Sourabh)
 * sourabhraj311@gmail.com
 *
 * This service stores the Matrix of Seats and provides them to components when needed,
 * Two methods to update the matrix and booked seats so that all receiving components will update in realtime
 */
export class DataService {
  private _url: string = "http://localhost:3000"
  constructor(private http : HttpClient) {
  }
  private coach!:Coach;
  private mat = new BehaviorSubject<Seat[][]>([]);
  private bookedSeat = new BehaviorSubject<Seat[]>([]);
  private availableSeats = new BehaviorSubject<number>(0);
  getMat = this.mat.asObservable();
  getBookedSeat = this.bookedSeat.asObservable();
  getAvailableSeat = this.availableSeats.asObservable();


  changeMat(mat: Seat[][]) {
    this.mat.next(mat);
    this.coach.bookingState = this.convertMatrixToBinary(mat);
  }
  updateBookedSeat(seat: Seat[]) {
    this.bookedSeat.next(seat);
  }
  updateAvailableSeats(n?: number) {
    if(n == 0 || n)
    this.availableSeats.next(n);
    else {
      this.availableSeats.next(this.coach.availableSeats);
    }
      this.coach.availableSeats = this.availableSeats.value;
  }

  getTrains():Observable<Train[]>{
    const url = `${this._url}/trains`
    return this.http.get<Train[]>(url)
  }
  getCoaches(train_no:number):Observable<Coach[]>{
    const url = `${this._url}/coach/${train_no}`;
    return this.http.get<Coach[]>(url);
  }

  setCoach(coach : Coach){
    this.coach = coach;
    this.updateAvailableSeats(this.coach.availableSeats);
    this.updateBookedSeat([]);
    if(coach.bookingState.length <= 1)
      this.resetMatrix().subscribe((res) => {
        this.changeMat(this.convertBinaryToMatrix(res.coach))
      })
    else
      this.mat.next(this.convertBinaryToMatrix(coach.bookingState));
  }
  resetMatrix(){
    const cid = this.coach.coach_id;
    const url = `${this._url}/booking/clear/${cid}`
    return this.http.get<any>(url);
  }
  generateRandom(){
    const cid = this.coach.coach_id;
    const url = `${this._url}/booking/random/${cid}`
    return this.http.get<any>(url);
  }
  convertBinaryToMatrix(mat : number[][]):Seat[][]{
    let outMat = [];
    let count = 1;
    for(let i = 0 ; i < mat.length; i++){
      const row:Seat[] = [];
      for(let j = 0; j < mat[i].length; j++){
        const seat:Seat = {
          id : count++,
          number : count,
          booked : (mat[i][j] === 1)
        }
        row.push(seat);
      }
      outMat.push(row);
    }
    return outMat;
  }
  convertMatrixToBinary(mat : Seat[][]):number[][]{
    let outMat:number[][] = [];
    for(let i = 0 ; i < mat.length; i++){
      const row:number[] = [];
      for(let j = 0; j < mat[i].length; j++){
        if(mat[i][j].booked) row.push(1);
        else row.push(0);
      }
      outMat.push(row);
    }
    return outMat;
  }

  makeBookRequest(n: number) {
    const cid = this.coach.coach_id;
    const url = `${this._url}/booking/${cid}/${n}`
    return this.http.get<any>(url)
  }
}
