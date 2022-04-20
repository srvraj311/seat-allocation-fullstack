## Seat Allocation System - MEAN Stack
# [View Working Demo Here](https://seat-allocation-angular.herokuapp.com/)

### Problem Description:
1. There are n seats in a coach of a train with only r seats in a row.
2. One person can reserve up to 7 seats at a time.
3. If person is reserving seats, the priority will be to book them in one row.
4. If seats are not available in one row then the booking should be done in such a way that the nearby
   seats are booked.
5. User can book as many tickets as s/he wants until the coach is full.
6. Implement proper backend with use of database.
7. Add Multiple trains and Coach in every train.

### How it should function?
1. Input required will only be the required number of seats. Example: 2 or 4 or 6 or 1 etc.
2. Output should be seats numbers that have been booked for the user along with the display of all the
   seats and their availability status through color or number or anything else that you may feelfit.
### What you need to submit
1. You need to write code (functions) as per the conditions and functionality mentioned above.
2. You need to submit the database structure you’ll be creating as per your code.
3. You need to host it on any of the free/paid platform so that you can provide as a working web URL for
   this problem.
4. You need to send us the code a zip file for us to look at your code and evaluate the same. You can also
   send us GIT link for the same.
### There are some seats already booked in that coach. So your code should be able to find the seats available and then book them.
• You can take appropriate assumptions, if any, and state them on top of the submission sheet.
• Write a good functional and optimum code.
• Try to use less variables.

## My Solution :
I have used dynamic programming approach to store the state 
of booking of train coach into a lookup table and refer it later.
This approach helped me to reduce the time complexity of booking 
seats to O((rxc)/2) which is roughly Half of Exponential complexity.


## Screenshots
![Screenshot](https://res.cloudinary.com/srvraj311/image/upload/v1649563425/Screenshot_2022-04-10_at_9.32.32_AM_q5oswh.png)
![Screenshot](https://res.cloudinary.com/srvraj311/image/upload/v1649563429/Screenshot_2022-04-10_at_9.32.47_AM_vzxnch.png)
![Screenshot](https://res.cloudinary.com/srvraj311/image/upload/v1649563416/Screenshot_2022-04-10_at_9.33.08_AM_wcldyo.png)

### Thankyou
