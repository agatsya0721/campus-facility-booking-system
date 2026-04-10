import { buildResult, validateRequiredString } from "./commonValidators.js";

export const facilitySchema = (req) => {
  const errors = [];
  const data = {
    name: validateRequiredString(errors, "name", req.body.name),
    code: validateRequiredString(errors, "code", req.body.code),
    type: validateRequiredString(errors, "type", req.body.type),
    location: validateRequiredString(errors, "location", req.body.location),
    capacity: Number(req.body.capacity),
    description: req.body.description?.trim() || "",
    amenities: Array.isArray(req.body.amenities) ? req.body.amenities : [],
    isActive: req.body.isActive ?? true
  };

  if (!Number.isInteger(data.capacity) || data.capacity <= 0) {
    errors.push({ field: "capacity", message: "capacity must be a positive integer." });
  }

  return buildResult(errors, data);
};
