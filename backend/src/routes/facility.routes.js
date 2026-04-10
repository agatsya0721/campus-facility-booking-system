import { Router } from "express";
import {
  createFacilityHandler,
  deleteFacilityHandler,
  getFacilities,
  getFacilityById,
  updateFacilityHandler
} from "../controllers/facility.controller.js";
import { authenticate } from "../middlewares/authenticate.js";
import { authorize } from "../middlewares/authorize.js";
import { validate } from "../middlewares/validate.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { facilitySchema } from "../validators/facilityValidators.js";

export const facilityRouter = Router();

facilityRouter.get("/", asyncHandler(getFacilities));
facilityRouter.get("/:id", asyncHandler(getFacilityById));
facilityRouter.post(
  "/",
  authenticate,
  authorize("admin"),
  validate(facilitySchema),
  asyncHandler(createFacilityHandler)
);
facilityRouter.put(
  "/:id",
  authenticate,
  authorize("admin"),
  validate(facilitySchema),
  asyncHandler(updateFacilityHandler)
);
facilityRouter.delete(
  "/:id",
  authenticate,
  authorize("admin"),
  asyncHandler(deleteFacilityHandler)
);
