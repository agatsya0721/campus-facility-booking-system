import { StatusCodes } from "http-status-codes";
import { ApiError } from "../utils/ApiError.js";

export const validate = (schema) => (req, _res, next) => {
  const result = schema(req);

  if (!result.success) {
    return next(
      new ApiError(StatusCodes.BAD_REQUEST, "Validation failed.", result.errors)
    );
  }

  req.validated = result.data;
  next();
};
