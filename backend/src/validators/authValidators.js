import { buildResult, validateEmail, validateRequiredString } from "./commonValidators.js";

export const registerSchema = (req) => {
  const errors = [];
  const data = {
    name: validateRequiredString(errors, "name", req.body.name),
    email: validateEmail(errors, "email", req.body.email),
    password: validateRequiredString(errors, "password", req.body.password),
    role: validateRequiredString(errors, "role", req.body.role),
    department: validateRequiredString(errors, "department", req.body.department)
  };

  if (data.password && data.password.length < 8) {
    errors.push({ field: "password", message: "Password must be at least 8 characters." });
  }

  if (data.email && !data.email.endsWith("@its.edu.in")) {
    errors.push({
      field: "email",
      message: "Only institutional email addresses ending with @its.edu.in are allowed."
    });
  }

  return buildResult(errors, data);
};

export const loginSchema = (req) =>
{
  const errors = [];
  const data = {
    email: validateEmail(errors, "email", req.body.email),
    password: validateRequiredString(errors, "password", req.body.password)
  };

  return buildResult(errors, data);
};
