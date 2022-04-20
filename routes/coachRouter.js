const express = require('express');
const router = express.Router();
const Coach = require('../Models/Coach')
const AppHelper = require('../Helper')
/* GET home page. */
router.get("/:train_id", (req, res, next) => {
    const t_id = req.params.train_id;
    console.log(t_id);
    Coach.find({train_id: t_id}, (err, data) => {
        AppHelper.handleFindError(res, err, data);
    })
})

router.post('/add',
    (req, res, next) => {
        let obj = new Coach(req.body);
        obj.save((err) => {
            if (err) res.json({error: "Error in updating data to database"});
            else res.json({message: "New Coach Added"});
        })
    })

router.post('/:id',(req, res, next) => {
    const id = req.params.id;
    const booking = req.body.bookingState;
    const available = req.body.availableSeats;
    if((booking && available) || (booking && available === 0)){
        Coach.findOneAndUpdate({coach_id: id}, {
            bookingState: booking,
            availableSeats: available,
        }, null, (err, doc) => {
            AppHelper.handleFindError(res, err, doc);
        })
    }
})

module.exports = router;
