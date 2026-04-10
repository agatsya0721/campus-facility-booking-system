import { Router } from "express";
import { announcementRouter } from "./announcement.routes.js";
import { authRouter } from "./auth.routes.js";
import { bookingRouter } from "./booking.routes.js";
import { facilityRouter } from "./facility.routes.js";
import { userRouter } from "./user.routes.js";

export const apiRouter = Router();

apiRouter.use("/announcements", announcementRouter);
apiRouter.use("/auth", authRouter);
apiRouter.use("/users", userRouter);
apiRouter.use("/facilities", facilityRouter);
apiRouter.use("/bookings", bookingRouter);
