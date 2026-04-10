import { StatusCodes } from "http-status-codes";
import { getUserById, listUsers, toggleUserStatus } from "../services/user.service.js";

export const getProfile = async (req, res) => {
  const user = await getUserById(req.user.id);
  res.status(StatusCodes.OK).json({ success: true, data: user });
};

export const getUsers = async (_req, res) => {
  const users = await listUsers();
  res.status(StatusCodes.OK).json({ success: true, data: users });
};

export const updateUserStatus = async (req, res) => {
  await toggleUserStatus(Number(req.params.id), req.validated.isActive);
  res.status(StatusCodes.OK).json({
    success: true,
    message: "User status updated successfully."
  });
};
