/**
 * Seeds the database with random trains and coaches.
 *
 *   npm run seed
 *
 * - 10 Indian trains, 3-6 coaches each
 * - every coach has 30-120 seats and 2-8 seats per row
 * - about 15-55% of the seats of each coach start out booked
 * Documents are upserted by train_no / coach_id, so running it again refreshes the seed
 * data without deleting anything else.
 */
require("dotenv").config();
const mongoose = require("mongoose");

const TRAINS = [
  [12345, "Saraighat Express"],
  [12346, "Dibrugarh Rajdhani"],
  [12951, "Mumbai Rajdhani"],
  [12002, "Bhopal Shatabdi"],
  [22436, "Vande Bharat Express"],
  [12260, "Sealdah Duronto"],
  [12301, "Howrah Rajdhani"],
  [20501, "Agartala Tejas"],
  [12432, "Trivandrum Rajdhani"],
  [10111, "Konkan Kanya Express"],
];

const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

function buildCoach(train_id, coach_id) {
  const totalSeats = rand(30, 120);
  const seatsInRows = rand(2, 8);
  const taken = 0.15 + Math.random() * 0.4;
  const bookingState = [];
  let availableSeats = 0;
  for (let placed = 0; placed < totalSeats; ) {
    const row = [];
    for (let j = 0; j < seatsInRows && placed < totalSeats; j++, placed++) {
      const booked = Math.random() < taken ? 1 : 0;
      if (!booked) availableSeats++;
      row.push(booked);
    }
    bookingState.push(row);
  }
  return { train_id, coach_id, totalSeats, seatsInRows, availableSeats, bookingState };
}

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  const db = mongoose.connection.db;
  let coachId = 1;
  let coachCount = 0;
  for (const [train_no, name] of TRAINS) {
    const ids = [];
    for (let i = rand(3, 6); i > 0; i--) {
      const coach = buildCoach(train_no, coachId++);
      ids.push(coach.coach_id);
      await db.collection("coach").updateOne({ coach_id: coach.coach_id }, { $set: coach }, { upsert: true });
      coachCount++;
    }
    await db.collection("train").updateOne({ train_no }, { $set: { train_no, name, coach: ids } }, { upsert: true });
    console.log(`${train_no} ${name}: coaches ${ids.join(", ")}`);
  }
  console.log(`Seeded ${TRAINS.length} trains and ${coachCount} coaches`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
