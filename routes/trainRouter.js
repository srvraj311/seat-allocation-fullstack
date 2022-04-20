const express = require("express");
const router = express.Router();
const Train = require("../Models/Train");
const AppHelper = require("../Helper");

router.get("/", (req, res, next) => {
  Train.find({}, (err, data) => {
    AppHelper.handleFindError(res, err, data);
  });
});

router.post("/add", (req, res, next) => {
  // let obj = new Train(req.body);
  const t_no = req.body.train_no;
  const co = req.body.coach;
  if (t_no && co) {
    new Train({ train_no: t_no, coach: co }).save((err) => {
      if (err) res.json({ error: "Error in updating data to database" });
      else res.json({ message: "New Train Added" });
    });
  } else res.json({ error: "Make Sure all fields are provided" });
});

module.exports = router;
