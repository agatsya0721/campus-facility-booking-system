import { buildResult, validateRequiredString } from "./commonValidators.js";

export const bookingStatusSchema = (req) => {
  const errors = [];
  const data = {
    status: validateRequiredString(errors, "status", req.body.status)
  };

  if (data.status && !["pending", "confirmed", "cancelled", "completed"].includes(data.status)) {
    errors.push({ field: "status", message: "Unsupported booking status." });
  }

  return buildResult(errors, data);
};
