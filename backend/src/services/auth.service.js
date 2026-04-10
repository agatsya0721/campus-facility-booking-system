import bcrypt from "bcryptjs";
import { StatusCodes } from "http-status-codes";
import { pool } from "../config/db.js";
import { ROLES } from "../constants/roles.js";
import { ApiError } from "../utils/ApiError.js";
import { signToken } from "../utils/jwt.js";

export const registerUser = async ({ name, email, password, role, department }) => {
  if (!Object.values(ROLES).includes(role)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Unsupported role.");
  }

  const { rows: existing } = await pool.query("SELECT id FROM users WHERE email = $1", [email]);
  if (existing.length) {
    throw new ApiError(StatusCodes.CONFLICT, "Email is already registered.");
  }

  const { rows: roles } = await pool.query("SELECT id FROM roles WHERE name = $1", [role]);
  const passwordHash = await bcrypt.hash(password, 10);
  const { rows } = await pool.query(
    `INSERT INTO users (role_id, name, email, password_hash, department)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, name, email, department, created_at`,
    [roles[0].id, name, email, passwordHash, department]
  );

  const token = signToken({ sub: rows[0].id, role });

  return {
    user: { ...rows[0], role },
    token
  };
};

export const loginUser = async ({ email, password }) => {
  const { rows } = await pool.query(
    `SELECT u.id, u.name, u.email, u.department, u.password_hash, u.is_active, r.name AS role
     FROM users u
     JOIN roles r ON r.id = u.role_id
     WHERE u.email = $1`,
    [email]
  );

  const user = rows[0];
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, "Invalid credentials.");
  }

  if (!user.is_active) {
    throw new ApiError(StatusCodes.FORBIDDEN, "Account is deactivated.");
  }

  const token = signToken({ sub: user.id, role: user.role });
  delete user.password_hash;
  delete user.is_active;

  return { user, token };
};
