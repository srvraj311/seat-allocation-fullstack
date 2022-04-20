const mongoose = require("mongoose");
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

module.exports = Coach;
