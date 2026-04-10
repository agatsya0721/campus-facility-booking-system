import { Router } from "express";
import {
  cancelBookingHandler,
  cancelWaitingListHandler,
  createBookingHandler,
  getAvailabilityHandler,
  getBooking,
  getBookings,
  getWaitingListHandler,
  joinWaitingListHandler,
  updateBookingStatusHandler
} from "../controllers/booking.controller.js";
import { authenticate } from "../middlewares/authenticate.js";
import { authorize } from "../middlewares/authorize.js";
import { validate } from "../middlewares/validate.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { bookingSchema, waitingListSchema } from "../validators/bookingValidators.js";
import { dateRangeSchema } from "../validators/queryValidators.js";
import { bookingStatusSchema } from "../validators/statusValidators.js";

export const bookingRouter = Router();

bookingRouter.use(authenticate);

bookingRouter.get("/", asyncHandler(getBookings));
bookingRouter.get("/availability", validate(dateRangeSchema), asyncHandler(getAvailabilityHandler));
bookingRouter.get("/waiting-list", authorize("admin", "faculty"), asyncHandler(getWaitingListHandler));
bookingRouter.get("/:id", asyncHandler(getBooking));
bookingRouter.post("/", validate(bookingSchema), asyncHandler(createBookingHandler));
bookingRouter.patch(
  "/:id/status",
  authorize("admin"),
  validate(bookingStatusSchema),
  asyncHandler(updateBookingStatusHandler)
);
bookingRouter.delete("/:id", asyncHandler(cancelBookingHandler));
bookingRouter.post("/waiting-list", validate(waitingListSchema), asyncHandler(joinWaitingListHandler));
bookingRouter.delete("/waiting-list/:id", asyncHandler(cancelWaitingListHandler));
