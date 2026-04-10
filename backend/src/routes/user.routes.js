import { Router } from "express";
import { getProfile, getUsers, updateUserStatus } from "../controllers/user.controller.js";
import { authenticate } from "../middlewares/authenticate.js";
import { authorize } from "../middlewares/authorize.js";
import { validate } from "../middlewares/validate.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { userStatusSchema } from "../validators/userValidators.js";

export const userRouter = Router();

userRouter.use(authenticate);
userRouter.get("/me", asyncHandler(getProfile));
userRouter.get("/", authorize("admin"), asyncHandler(getUsers));
userRouter.patch("/:id/status", authorize("admin"), validate(userStatusSchema), asyncHandler(updateUserStatus));
