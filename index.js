const express = require("express");
const path = require("path");
const logger = require("morgan"); // For logging requests
const mongoose = require("mongoose"); // For connecting to mongodb
const cors = require("cors"); // For cross-origin policy

const port = process.env.PORT || 3000;
const app = express();

//const connectionUrl = `mongodb://localhost:27017/d2c`
const connectionUrl =process.env.MONGO_URI;


handleWrongParams = (res, ...args) => {
  let out = '';
  for(let values of args){
      out += values + " is required in param"
  }
  res.json({error : out})
}
handleFindError = (res, err, data) => {
  if (err) {
      res.status(500).json({"error": "Internal Server Error", "body": err.toString()})
  } else if (!data) {
      res.status(404).json({"error": "Not Found or Empty"})
  } else {
      res.status(200).json(data);
  }
}

class BookingService {
  rowMap = new Map;
  constructor(coach) {
      this.coach = coach;
      this.mat = this.convertBinaryToMatrix(coach.bookingState)
      this.generateRowMap();
      this.totalSeats = coach.totalSeats
      this.availableSeats = coach.availableSeats
      this.noOfSeatsInRow = coach.seatsInRows
  }
  convertMatrixToBinary(mat){
      let outMat = [];
      for(let i = 0 ; i < mat.length; i++){
          const row = [];
          for(let j = 0; j < mat[i].length; j++){
              if(mat[i][j].booked) row.push(1);
              else row.push(0);
          }
          outMat.push(row);
      }
      return outMat;
  }
  convertBinaryToMatrix(mat){
      let outMat = [];
      let count = 1;
      for(let i = 0 ; i < mat.length; i++){
          const row = [];
          for(let j = 0; j < mat[i].length; j++){
              const seat = {
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
  // Generates a Matrix of Seat Object
  // Empty Coach
  generateMatrix(){
      let counter = 1;
      const tempMat = [];
      while (counter <= this.totalSeats) {
          const row = [];
          for (let j = 0; j < this.noOfSeatsInRow; j++) {
              if (counter === this.totalSeats + 1) {
                  break;
              }
              let seat = {
                  number: counter++,
                  id: counter,
                  booked: false,
              };
              row.push(seat);
          }
          tempMat.push(row);
      }
      this.mat = tempMat
      return this.displayBookedSeat(0, [], 0);
  }

  bookIfAvailableAdjacent(count) {
      let rowExact = new Map;
      let rowGreaterThan = [];
      let rowSumGreaterThan = [];

      // Getting rows with the largest available seats;
      let maxAdjacentSection = -1;
      let rowMaxAt = -1;

      // Rows with available seats greater than n, maximised
      let maxSeatsInRow = -1;
      let rowMaxSeatsAt = -1;

      // Row where first seat is available
      let rowFirstSeatAvailable = -1;

      for (let i = 0; i < this.rowMap.size; i++) {
          // @ts-ignore
          if (this.rowMap.get(i).length > 0 && rowFirstSeatAvailable === -1) {
              rowFirstSeatAvailable = i;
          }
          let sum = 0;
          // @ts-ignore
          for (let elem of this.rowMap.get(i)) {
              // case 1

              if (elem === count) {
                  let s = 0;
                  for(let j =  0; j < this.rowMap.get(i).length; j++){
                      s += this.rowMap.get(i)[j];
                  }
                  rowExact.set(i , s);
                  break;
              }
              // case 2
              if (elem > count) {
                  rowGreaterThan.push(i);
                  if (elem > maxAdjacentSection) {
                      maxAdjacentSection = elem;
                      rowMaxAt = i;
                  }
              }
              // case 3
              sum += elem;
              // Find all rows having empty section greater than n;
          }
          if (sum >= count) {
              rowSumGreaterThan.push(i);
              if (sum >= maxSeatsInRow) {
                  maxSeatsInRow = sum;
                  rowMaxSeatsAt = i;
              }
          }
          // Find all rows having empty seats greater than n;
      }
      if(rowExact.size > 0){
          let min = 99999;
          let r = 0;
          console.log(rowExact);
          rowExact.forEach((value, key) => {
              if(value < min){
                  min = value;
                  r = key
              }
          })
          return this.performBookingAdjacentSeats(r, count, 0);
      }
      if (rowGreaterThan.length > 0) {
          let min = 99999;
          let r = 0;
          for(let i = 0; i < rowGreaterThan.length; i++){
              if(rowGreaterThan[i] < min){
                  min = rowGreaterThan[i];
                  r = i;
              }
          }
          console.log(' CASE 2 ');
          return this.performBookingAdjacentSeats(r, count, maxAdjacentSection)
      }
      if (rowSumGreaterThan.length > 0) {
          console.log(' CASE 3 ');
          return this.performBookingInRow(rowMaxSeatsAt, count);
      }
      if (rowFirstSeatAvailable !== -1) {
          console.log(' CASE 4 ');
          return this.performBookingInRow(rowFirstSeatAvailable, count);
      }
      return true;
  }

  // Method to Perform booking in seats in given row, where seats are to be booked in one row itself
  // O(n/2) Where n is number of seats in ROW
  performBookingAdjacentSeats(rowFound, count, maxSection) {
      let bookedSeats = [];
      if (rowFound !== -1) {
          // Find Starting point of section to book;
          let column;
          if (maxSection === 0) {
              column = this.getIndexOf(rowFound, count);
          } else {
              column = this.getIndexOf(rowFound, maxSection);
          }
          for (let i = 0; i < count; i++) {
              this.mat[rowFound][i + column].booked = true;
              bookedSeats.push(this.mat[rowFound][i + column])
          }
          return this.displayBookedSeat(rowFound, bookedSeats, count);
      } else {
          return false;
      }
  }

  // Method to book seats not-adjacently, uses loop to book seats until n numbers are booked.
  // O(n^2) Worst case, O(n*m/7) Average Case.
  performBookingInRow(rowNum, count) {
      let bookedSeats = [];
      if (rowNum !== -1) {
          let tempCount = 0;
          for (let i = rowNum; i < this.mat.length; i++) {
              for (let j = 0; j < this.mat[i].length; j++) {
                  if (!this.mat[i][j].booked) {
                      this.mat[i][j].booked = true;
                      bookedSeats.push(this.mat[i][j]);
                      tempCount++;
                      if (tempCount === count) break;
                  }
              }
              this.updateRowMap(rowNum);
              if (tempCount === count) break;
          }
          return this.displayBookedSeat(rowNum, bookedSeats, count);
      }
      return false;
  }

  // Function to update the HashMap lookup for the row where booking has been performed.
  // O(n) Where n is no. of seats in ROW.
   updateRowMap(rowFound) {
      let tempCounter = 0;
      let newMapValue = [];
      for (let i = 0; i < this.mat[rowFound].length; i++) {
          if (!this.mat[rowFound][i].booked) tempCounter++;
          else {
              if (tempCounter !== 0) newMapValue.push(tempCounter);
              tempCounter = 0;
          }
      }
      if (tempCounter !== 0) newMapValue.push(tempCounter);
      this.rowMap.set(rowFound, newMapValue);
  }

  // Method to find the index of column of row where n number of seats are available adjacently.
  // O(n) where n is no. of seats in ROW.
  getIndexOf(r, count) {
      if(!this.mat) { throw new Error('\'Undefined Error Encountered\'')}
      let counter = 0;
      for (let i = 0; i < this.mat[r].length; i++) {
          if (!this.mat[r][i].booked) counter++;
          else {
              if (counter === count) return (i - counter);
              counter = 0;
          }
      }
      if (counter === count) return (this.mat[r].length - counter);
      return 0;
  }

  // Method for logging purpose
  // O(n/2 * m) Where n is no. of seats in row and m is number of column;
  displayMap() {
      console.log('---------------------------------')
      this.rowMap.forEach((val, key) => {
          console.log(val)
      })
      console.log('---------------------------------')
  }

  //  Generate HashMap for Rows
  //  O(r*c)
   generateRowMap() {
      for (let i = 0; i < this.mat.length; i++) {
          this.updateRowMap(i);
      }
  }
  // Method to fills the Matrix with random value,
  // O(r*c) r : Rows , c : Columns
  fillArrayWithRandomValues() {
      if(this.mat.length === 0) {
          alert("Select a coach First");
          return
      }
      this.mat = [];
      this.bookedSeats = []
      this.generateMatrix();
      let availableCount = 0;
      for (let i = 0; i < this.mat.length; i++) {
          let count = 0;
          const availableGroup = [];
          for (let j = 0; j < this.mat[i].length; j++) {
              const random = Math.random() * 10 > 6;
              if (random) {
                  if (count !== 0) availableGroup.push(count);
                  count = 0;
              } else {
                  count++;
                  availableCount++;
              }
              this.mat[i][j].booked = random;
          }
          if (count !== 0) availableGroup.push(count);
          this.rowMap.set(i, availableGroup);
      }
      this.availableSeats = availableCount
      return this.displayBookedSeat(0 , [], 0);
  }

  // Update Response Data to SEND
  // O(1) : Linear
  displayBookedSeat(rowNum, bookedSeats, count) {
      this.updateRowMap(rowNum);
      this.coach.bookingState = this.convertMatrixToBinary(this.mat);
      this.availableSeats = this.availableSeats - count;
      this.coach.availableSeats = this.availableSeats;
      this.coach.totalSeats = this.totalSeats;
      this.coach.seatsInRows = this.noOfSeatsInRow;
      this.displayMap();
      return this.sendResponse(this.coach , bookedSeats);
  }

  // Prepare Response Body
  // O(1) : Linear
  sendResponse(coach , bookedSeats){
      return { 'coach': coach ,'bookedSeat' : bookedSeats}
  }
}

mongoose
  .connect(connectionUrl)
  .then(() => console.log("Connected to mongodb"))
  .catch((err) => console.log(err));

const Train = mongoose.model(
    "Train",
    {
        train_no: Number,
        coach: Array
    },
    "train"
);

const Seat = new mongoose.Schema({
  number: Number, id: String, booked: Boolean
})
const Coach = mongoose.model( 'Coach',
  {
      train_id : Number,
      coach_id: Number,
      totalSeats: Number,
      seatsInRows: Number,
      availableSeats: Number,
      bookingState: [[Number]]
  }, "coach"
);


app.use(cors());
app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));



app.get("/trains/", (req, res, next) => {
  Train.find({})
    .then((data) => {
      res.json(data);
    })
    .catch((err) => {
      res.json(err);
    });
});

app.post("/trains/add", (req, res, next) => {
  const t_no = req.body.train_no;
  const co = req.body.coach;
  if (t_no && co) {
    new Train({ train_no: t_no, coach: co }).save((err) => {
      if (err) res.json({ error: "Error in updating data to database" });
      else res.json({ message: "New Train Added" });
    });
  } else res.json({ error: "Make Sure all fields are provided" })
})

app.get("/coach/:train_id", (req, res, next) => {
  const t_id = req.params.train_id;
  console.log(t_id);
  Coach.find({train_id: t_id})
    .then((data) => {
      res.json(data);
    })
    .catch((err) => {
      res.json(err);
    });
})

app.post('/coach/add',
    (req, res, next) => {
        let obj = new Coach(req.body);
        obj.save((err) => {
            if (err) res.json({error: "Error in updating data to database"});
            else res.json({message: "New Coach Added"});
        })
    })

app.post('/coach/:id',(req, res, next) => {
    const id = req.params.id;
    const booking = req.body.bookingState;
    const available = req.body.availableSeats;
    if((booking && available) || (booking && available === 0)){
        Coach.findOneAndUpdate({coach_id: id}, {
            bookingState: booking,
            availableSeats: available,
        }, null, (err, doc) => {
            handleFindError(res, err, doc);
        })
    }
})

app.get("/booking/random/:coachId", async (req, res, next) => {
  const coachId = parseInt(req.params.coachId)
  if (coachId) {
      const doc = await Coach.findOne({coach_id: coachId}).lean();
      let service = new BookingService(doc);
      const out = service.fillArrayWithRandomValues()
      await Coach.findOneAndUpdate({coach_id: doc.coach_id}, {
          $set: {
              bookingState: out.coach.bookingState,
              availableSeats: out.coach.availableSeats,
              totalSeats: out.coach.totalSeats,
              seatsInRows: out.coach.seatsInRow
          }
      })
      res.json(out);
  } else {
      handleWrongParams(res, 'Coach ID');
  }
})

app.get("/booking/clear/:coachId", async (req, res, next) => {
  const coachId = parseInt(req.params.coachId)
  if (coachId) {
      const doc = await Coach.findOne({coach_id: coachId}).lean();
      let service = new BookingService(doc);
      const out = service.generateMatrix()
      await Coach.findOneAndUpdate({coach_id: doc.coach_id}, {
          $set: {
              bookingState: out.coach.bookingState,
              availableSeats: out.coach.availableSeats,
              totalSeats: out.coach.totalSeats,
              seatsInRows: out.coach.seatsInRow
          }
      })
      res.json(out);
  } else {
      handleWrongParams(res, 'Coach ID');
  }
})

app.get("/booking/:coachId/:num" , async (req, res, next) => {
  const coachId = parseInt(req.params.coachId)
  const num = parseInt(req.params.num);
  if (coachId && num) {
      const doc = await Coach.findOne({coach_id: coachId}).lean();
      let service = new BookingService(doc);
      const out = service.bookIfAvailableAdjacent(num)
      await Coach.findOneAndUpdate({coach_id : doc.coach_id} , { $set : {
              bookingState : out.coach.bookingState,
              availableSeats : out.coach.availableSeats,
              totalSeats : out.coach.totalSeats,
              seatsInRow : out.coach.seatsInRow
          }})
      res.json(out);
  }else{
      handleWrongParams(res, 'Coach ID', 'Number of Seats');
  }
})

if (process.env.NODE_ENV === "production") {
  app.use(
    express.static(path.join(__dirname, "/Client/dist/seat_allocation_d2c"))
  );
  app.get("*", (req, res, next) => {
    res.sendFile(
      path.resolve(__dirname, "Client/dist/seat_allocation_d2c/index.html")
    );
  });
} else {
  // app.get('/' , (req, res, next) => {
  //     res.send("Express Server running in development mode");
  // })
  app.use(
    express.static(path.join(__dirname, "/Client/dist/seat_allocation_d2c"))
  );
  app.get("*", (req, res, next) => {
    res.sendFile(
      path.resolve(__dirname, "Client/dist/seat_allocation_d2c/index.html")
    );
  });
}
app.listen(port, (x) => {
  console.log("Server Listening on :" + port);
});
