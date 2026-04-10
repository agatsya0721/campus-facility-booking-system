import { StatusCodes } from "http-status-codes";
import { pool } from "../config/db.js";
import { ApiError } from "../utils/ApiError.js";

export const listUsers = async () => {
  const { rows } = await pool.query(
    `SELECT u.id, u.name, u.email, u.department, u.is_active, u.created_at, r.name AS role
     FROM users u
     JOIN roles r ON r.id = u.role_id
     ORDER BY u.created_at DESC`
  );

  return rows;
};

export const getUserById = async (userId) => {
  const { rows } = await pool.query(
    `SELECT u.id, u.name, u.email, u.department, u.is_active, u.created_at, r.name AS role
     FROM users u
     JOIN roles r ON r.id = u.role_id
     WHERE u.id = $1`,
    [userId]
  );

  if (!rows.length) {
    throw new ApiError(StatusCodes.NOT_FOUND, "User not found.");
  }

  return rows[0];
};

export const toggleUserStatus = async (userId, isActive) => {
  const { rowCount } = await pool.query(
    "UPDATE users SET is_active = $2, updated_at = NOW() WHERE id = $1",
    [userId, isActive]
  );

  if (!rowCount) {
    throw new ApiError(StatusCodes.NOT_FOUND, "User not found.");
  }
};
