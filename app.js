const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");
const logger = require("morgan");
const mongoose = require("mongoose");
const cors = require("cors");

const port = process.env.PORT || 5000;

const trainRouters = require("./routes/trainRouter");
const coachRouter = require("./routes/coachRouter");
const bookingRouter = require("./routes/bookingRouter");
const app = express();

//const connectionUrl = `mongodb://localhost:27017/d2c`
const connectionUrl = `mongodb+srv://srvraj311:srvraj_7870@enwrite.2m74x.mongodb.net/hospital-management?authSource=admin&replicaSet=atlas-14g4b2-shard-0&w=majority&readPreference=primary&retryWrites=true&ssl=true`;

mongoose.connect(
  connectionUrl,
  {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  },
  (err) => {
    if (err) console.log(err);
  }
);
app.use(cors());
app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

app.use("/trains", trainRouters);
app.use("/coach", coachRouter);
app.use("/booking", bookingRouter);

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
  //     res.send("Express Server running");
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
