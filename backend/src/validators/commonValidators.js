import validator from "validator";

const pushError = (errors, field, message) => {
  errors.push({ field, message });
};

export const validateRequiredString = (errors, field, value) => {
  if (!value || typeof value !== "string" || !value.trim()) {
    pushError(errors, field, `${field} is required.`);
    return null;
  }

  return value.trim();
};

export const validateEmail = (errors, field, value) => {
  const email = validateRequiredString(errors, field, value);
  if (email && !validator.isEmail(email)) {
    pushError(errors, field, "Invalid email address.");
  }
  return email?.toLowerCase();
};

export const validateDate = (errors, field, value) => {
  if (!value || Number.isNaN(Date.parse(value))) {
    pushError(errors, field, `${field} must be a valid ISO date.`);
    return null;
  }
  return new Date(value).toISOString();
};

export const buildResult = (errors, data) => ({
  success: errors.length === 0,
  errors,
  data
});
