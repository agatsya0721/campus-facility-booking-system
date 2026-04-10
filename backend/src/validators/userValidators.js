import { buildResult } from "./commonValidators.js";

export const userStatusSchema = (req) => {
  const errors = [];
  const data = {
    isActive: req.body.isActive
  };

  if (typeof data.isActive !== "boolean") {
    errors.push({ field: "isActive", message: "isActive must be a boolean." });
  }

  return buildResult(errors, data);
};
