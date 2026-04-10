import { StatusCodes } from "http-status-codes";
import { pool } from "../config/db.js";
import { ApiError } from "../utils/ApiError.js";
import { verifyToken } from "../utils/jwt.js";

export const authenticate = async (req, _res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    return next(new ApiError(StatusCodes.UNAUTHORIZED, "Authentication required."));
  }

  try {
    const token = authHeader.split(" ")[1];
    const payload = verifyToken(token);
    const { rows } = await pool.query(
      `SELECT u.id, u.name, u.email, u.department, r.name AS role
       FROM users u
       JOIN roles r ON r.id = u.role_id
       WHERE u.id = $1 AND u.is_active = TRUE`,
      [payload.sub]
    );

    if (!rows.length) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, "User account is inactive.");
    }

    req.user = rows[0];
    next();
  } catch (error) {
    next(
      error.statusCode
        ? error
        : new ApiError(StatusCodes.UNAUTHORIZED, "Invalid or expired token.")
    );
  }
};
