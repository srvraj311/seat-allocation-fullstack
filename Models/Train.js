const mongoose = require("mongoose");
const Coach  = require('./Coach')

const Train = mongoose.model(
    "Train",
    {
        train_no: Number,
        coach: Array
    },
    "train"
);

module.exports = Train;
