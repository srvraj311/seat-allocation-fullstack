const express = require('express');
const router = express.Router();
const Coach = require('../Models/Coach')
const BookingService = require('../Controller/BookingService')
const AppHelper = require('../Helper')


router.get('/random/:coachId', async (req, res, next) => {
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
        AppHelper.handleWrongParams(res, 'Coach ID');
    }
})
router.get('/clear/:coachId', async (req, res, next) => {
    const coachId = parseInt(req.params.coachId)
    if (coachId) {
        const doc = await Coach.findOne({coach_id: coachId}).lean();
        let service = new BookingService(doc);
        const out = service.generateMatrix();
        await Coach.findOneAndUpdate({coach_id: doc.coach_id}, {
            $set: {
                bookingState: out.coach.bookingState,
                availableSeats: out.coach.totalSeats,
                totalSeats: out.coach.totalSeats,
                seatsInRows: out.coach.seatsInRow
            }
        })
        res.json(out);
    } else {
        AppHelper.handleWrongParams(res, 'Coach ID');
    }
})

router.get('/:coachId/:num' , async (req, res, next) => {
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
        AppHelper.handleWrongParams(res, 'Coach ID', 'Number of Seats');
    }
})

module.exports = router;
