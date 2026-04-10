import { buildResult, validateDate } from "./commonValidators.js";

export const dateRangeSchema = (req) => {
  const errors = [];
  const data = {
    start: validateDate(errors, "start", req.query.start),
    end: validateDate(errors, "end", req.query.end),
    facilityId: req.query.facilityId ? Number(req.query.facilityId) : null
  };

  if (data.facilityId && (!Number.isInteger(data.facilityId) || data.facilityId <= 0)) {
    errors.push({ field: "facilityId", message: "facilityId must be a positive integer." });
  }

  return buildResult(errors, data);
};
