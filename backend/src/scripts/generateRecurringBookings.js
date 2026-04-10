import { generateUpcomingRecurringBookings } from "../services/recurringBooking.service.js";
import { pool } from "../config/db.js";

generateUpcomingRecurringBookings()
  .then((count) => {
    console.log(`Generated ${count} recurring booking instance(s).`);
    return pool.end();
  })
  .catch(async (error) => {
    console.error(error);
    await pool.end();
    process.exit(1);
  });
