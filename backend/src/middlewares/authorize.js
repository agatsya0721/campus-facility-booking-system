import { StatusCodes } from "http-status-codes";
import { ApiError } from "../utils/ApiError.js";

export const authorize = (...allowedRoles) => (req, _res, next) => {
  if (!req.user || !allowedRoles.includes(req.user.role)) {
    return next(new ApiError(StatusCodes.FORBIDDEN, "Insufficient permissions."));
  }

  next();
};
