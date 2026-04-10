import { pool } from "../config/db.js";

export const getAvailability = async ({ start, end, facilityId = null }) => {
  const params = [start, end];
  let facilityClause = "";

  if (facilityId) {
    params.push(facilityId);
    facilityClause = "AND f.id = $3";
  }

  const { rows } = await pool.query(
    `SELECT
       f.id,
       f.name,
       f.code,
       f.type,
       f.location,
       NOT EXISTS (
         SELECT 1
         FROM bookings b
         WHERE b.facility_id = f.id
           AND b.status IN ('pending', 'confirmed')
           AND tstzrange(b.start_time, b.end_time, '[)') && tstzrange($1::timestamptz, $2::timestamptz, '[)')
       ) AS is_available
     FROM facilities f
     WHERE f.is_active = TRUE ${facilityClause}
     ORDER BY f.name ASC`,
    params
  );

  return rows;
};
