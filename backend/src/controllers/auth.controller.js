import { StatusCodes } from "http-status-codes";
import { loginUser, registerUser } from "../services/auth.service.js";

export const register = async (req, res) => {
  const result = await registerUser(req.validated);
  res.status(StatusCodes.CREATED).json({
    success: true,
    message: "Registration successful.",
    data: result
  });
};

export const login = async (req, res) => {
  const result = await loginUser(req.validated);
  res.status(StatusCodes.OK).json({
    success: true,
    message: "Login successful.",
    data: result
  });
};
