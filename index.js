const express = require("express");
const path = require("path");
const logger = require("morgan"); // For logging requests
const mongoose = require("mongoose"); // For connecting to mongodb
const cors = require("cors"); // For cross-origin policy
const { BookingService } = require("./lib/bookingService");

// use dotenv
require("dotenv").config();

const port = process.env.PORT || 3000;
const app = express();
const connectionUrl = process.env.MONGO_URI;

const handleWrongParams = (res, ...args) => {
  res.status(400).json({ error: args.join(", ") + " is required in param" });
};

const handleFindError = (res, err, data) => {
  if (err) {
    res.status(500).json({ error: "Internal Server Error", body: err.toString() });
  } else if (!data) {
    res.status(404).json({ error: "Not Found or Empty" });
  } else {
    res.status(200).json(data);
  }
};

// Wraps async handlers so rejected promises reach the error middleware.
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

mongoose
  .connect(connectionUrl)
  .then(() => console.log("Connected to mongodb"))
  .catch((err) => console.log(err));

const Train = mongoose.model(
  "Train",
  {
    train_no: Number,
    name: String,
    coach: Array,
  },
  "train"
);

const Coach = mongoose.model(
  "Coach",
  {
    train_id: Number,
    coach_id: Number,
    totalSeats: Number,
    seatsInRows: Number,
    availableSeats: Number,
    bookingState: [[Number]],
  },
  "coach"
);

app.use(cors());
app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.get("/trains/", wrap(async (req, res) => {
  res.json(await Train.find({}));
}));

app.post("/trains/add", wrap(async (req, res) => {
  const { train_no, coach } = req.body;
  if (!train_no || !coach) return res.status(400).json({ error: "Make Sure all fields are provided" });
  await new Train({ train_no, coach }).save();
  res.json({ message: "New Train Added" });
}));

app.get("/coach/:train_id", wrap(async (req, res) => {
  res.json(await Coach.find({ train_id: req.params.train_id }));
}));

app.post("/coach/add", wrap(async (req, res) => {
  await new Coach(req.body).save();
  res.json({ message: "New Coach Added" });
}));

app.post("/coach/:id", wrap(async (req, res) => {
  const { bookingState, availableSeats } = req.body;
  if (!bookingState || availableSeats === undefined) {
    return handleWrongParams(res, "bookingState", "availableSeats");
  }
  const doc = await Coach.findOneAndUpdate(
    { coach_id: req.params.id },
    { bookingState, availableSeats },
    { new: true }
  );
  handleFindError(res, null, doc);
}));

// Loads a coach, runs `action` on a BookingService and persists the result.
const runBooking = (action) => wrap(async (req, res) => {
  const coachId = parseInt(req.params.coachId, 10);
  if (!coachId) return handleWrongParams(res, "Coach ID");
  const doc = await Coach.findOne({ coach_id: coachId }).lean();
  if (!doc) return res.status(404).json({ error: "Coach not found" });

  let out;
  try {
    out = action(new BookingService(doc), req);
  } catch (err) {
    if (err instanceof RangeError) return res.status(400).json({ error: err.message });
    throw err;
  }
  await Coach.findOneAndUpdate(
    { coach_id: coachId },
    {
      $set: {
        bookingState: out.coach.bookingState,
        availableSeats: out.coach.availableSeats,
        totalSeats: out.coach.totalSeats,
        seatsInRows: out.coach.seatsInRows,
      },
    }
  );
  res.json(out);
});

// Which seats the next booking would get, without booking them.
app.get("/booking/preview/:coachId/:num", wrap(async (req, res) => {
  const coachId = parseInt(req.params.coachId, 10);
  const doc = await Coach.findOne({ coach_id: coachId }).lean();
  if (!doc) return res.status(404).json({ error: "Coach not found" });
  try {
    res.json(new BookingService(doc).preview(parseInt(req.params.num, 10)));
  } catch (err) {
    if (err instanceof RangeError) return res.status(400).json({ error: err.message });
    throw err;
  }
}));

app.get("/booking/random/:coachId", runBooking((svc) => svc.fillArrayWithRandomValues()));
app.get("/booking/clear/:coachId", runBooking((svc) => svc.generateMatrix()));
app.get("/booking/:coachId/:num", runBooking((svc, req) => svc.bookIfAvailableAdjacent(parseInt(req.params.num, 10))));

// Serve the Angular build
const clientDist = path.join(__dirname, "Client/dist/seat_allocation_d2c");
app.use(express.static(clientDist));
app.get("*", (req, res) => res.sendFile(path.join(clientDist, "index.html")));

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Internal Server Error", body: err.toString() });
});

app.listen(port, () => {
  console.log("Server Listening on :" + port);
});
