import { Router } from "express";
import { getAnnouncement, updateAnnouncement } from "../controllers/announcement.controller.js";
import { authenticate } from "../middlewares/authenticate.js";
import { authorize } from "../middlewares/authorize.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const announcementRouter = Router();

announcementRouter.get("/", asyncHandler(getAnnouncement));
announcementRouter.put("/", authenticate, authorize("admin"), asyncHandler(updateAnnouncement));
