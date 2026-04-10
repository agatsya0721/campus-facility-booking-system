import { StatusCodes } from "http-status-codes";
import { pool } from "../config/db.js";
import { ApiError } from "../utils/ApiError.js";

export const listFacilities = async () => {
  const { rows } = await pool.query(
    `SELECT *
     FROM facilities
     ORDER BY is_active DESC, name ASC`
  );

  return rows;
};

export const getFacility = async (facilityId) => {
  const { rows } = await pool.query("SELECT * FROM facilities WHERE id = $1", [facilityId]);
  if (!rows.length) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Facility not found.");
  }
  return rows[0];
};

export const createFacility = async (payload, createdBy) => {
  const { rows } = await pool.query(
    `INSERT INTO facilities (name, code, type, location, capacity, description, amenities, is_active, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [
      payload.name,
      payload.code,
      payload.type,
      payload.location,
      payload.capacity,
      payload.description,
      JSON.stringify(payload.amenities),
      payload.isActive,
      createdBy
    ]
  );

  return rows[0];
};

export const updateFacility = async (facilityId, payload) => {
  const { rows } = await pool.query(
    `UPDATE facilities
     SET name = $2,
         code = $3,
         type = $4,
         location = $5,
         capacity = $6,
         description = $7,
         amenities = $8,
         is_active = $9,
         updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [
      facilityId,
      payload.name,
      payload.code,
      payload.type,
      payload.location,
      payload.capacity,
      payload.description,
      JSON.stringify(payload.amenities),
      payload.isActive
    ]
  );

  if (!rows.length) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Facility not found.");
  }

  return rows[0];
};

export const deleteFacility = async (facilityId) => {
  const { rowCount } = await pool.query("DELETE FROM facilities WHERE id = $1", [facilityId]);
  if (!rowCount) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Facility not found.");
  }
};
