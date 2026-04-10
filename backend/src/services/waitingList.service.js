import { StatusCodes } from "http-status-codes";
import { pool } from "../config/db.js";
import { ApiError } from "../utils/ApiError.js";
import { createNotification } from "./notification.service.js";

export const joinWaitingList = async (client, payload) => {
  const { rows } = await client.query(
    `INSERT INTO waiting_list
      (facility_id, user_id, requested_start_time, requested_end_time, purpose)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [
      payload.facilityId,
      payload.userId,
      payload.startTime,
      payload.endTime,
      payload.purpose
    ]
  );

  return rows[0];
};

export const listWaitingList = async (facilityId) => {
  const params = [];
  let whereClause = "";

  if (facilityId) {
    params.push(facilityId);
    whereClause = "WHERE wl.facility_id = $1";
  }

  const { rows } = await pool.query(
    `SELECT wl.*, u.name AS user_name, u.email AS user_email, f.name AS facility_name
     FROM waiting_list wl
     JOIN users u ON u.id = wl.user_id
     JOIN facilities f ON f.id = wl.facility_id
     ${whereClause}
     ORDER BY wl.created_at ASC`,
    params
  );

  return rows;
};

export const cancelWaitingListEntry = async (entryId, userId, isAdmin = false) => {
  const params = isAdmin ? [entryId] : [entryId, userId];
  const ownershipClause = isAdmin ? "" : "AND user_id = $2";
  const { rowCount } = await pool.query(
    `UPDATE waiting_list
     SET status = 'cancelled'
     WHERE id = $1
       AND status = 'waiting'
       ${ownershipClause}`,
    params
  );

  if (!rowCount) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Waiting list entry not found.");
  }
};

export const promoteWaitingListForSlot = async (client, slot) => {
  const { rows: candidates } = await client.query(
    `SELECT *
     FROM waiting_list
     WHERE facility_id = $1
       AND status = 'waiting'
       AND requested_start_time = $2
       AND requested_end_time = $3
     ORDER BY created_at ASC`,
    [slot.facilityId, slot.startTime, slot.endTime]
  );

  for (const candidate of candidates) {
    try {
      const { rows: bookingRows } = await client.query(
        `INSERT INTO bookings (user_id, facility_id, start_time, end_time, status, purpose, notes)
         VALUES ($1, $2, $3, $4, 'confirmed', $5, 'Promoted from waiting list')
         RETURNING *`,
        [
          candidate.user_id,
          candidate.facility_id,
          candidate.requested_start_time,
          candidate.requested_end_time,
          candidate.purpose
        ]
      );

      await client.query(
        "UPDATE waiting_list SET status = 'promoted' WHERE id = $1",
        [candidate.id]
      );

      await createNotification(client, {
        userId: candidate.user_id,
        type: "waiting_list_promoted",
        title: "Booking confirmed from waiting list",
        message: "A cancelled booking became available and has been assigned to you.",
        payload: { bookingId: bookingRows[0].id, waitingListId: candidate.id }
      });

      return bookingRows[0];
    } catch (error) {
      if (error.code === "23P01") {
        continue;
      }
      throw error;
    }
  }

  return null;
};
