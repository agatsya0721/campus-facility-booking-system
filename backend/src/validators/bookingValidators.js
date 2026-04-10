import { buildResult, validateDate } from "./commonValidators.js";

export const bookingSchema = (req) => {
  const errors = [];
  const data = {
    facilityId: Number(req.body.facilityId),
    startTime: validateDate(errors, "startTime", req.body.startTime),
    endTime: validateDate(errors, "endTime", req.body.endTime),
    purpose: req.body.purpose?.trim() || "",
    notes: req.body.notes?.trim() || "",
    requiresApproval: Boolean(req.body.requiresApproval),
    recurrence: req.body.recurrence || null
  };

  if (!Number.isInteger(data.facilityId) || data.facilityId <= 0) {
    errors.push({ field: "facilityId", message: "facilityId must be a positive integer." });
  }

  if (data.startTime && data.endTime && new Date(data.startTime) >= new Date(data.endTime)) {
    errors.push({ field: "endTime", message: "endTime must be after startTime." });
  }

  return buildResult(errors, data);
};

export const waitingListSchema = (req) => {
  const errors = [];
  const data = {
    facilityId: Number(req.body.facilityId),
    startTime: validateDate(errors, "startTime", req.body.startTime),
    endTime: validateDate(errors, "endTime", req.body.endTime),
    purpose: req.body.purpose?.trim() || ""
  };

  if (!Number.isInteger(data.facilityId) || data.facilityId <= 0) {
    errors.push({ field: "facilityId", message: "facilityId must be a positive integer." });
  }

  return buildResult(errors, data);
};
