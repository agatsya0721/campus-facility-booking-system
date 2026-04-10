import { StatusCodes } from "http-status-codes";
import { pool, withTransaction } from "../config/db.js";
import { getIo } from "../config/socket.js";
import { ApiError } from "../utils/ApiError.js";
import { createNotification } from "./notification.service.js";
import { createRecurringRule } from "./recurringBooking.service.js";
import { promoteWaitingListForSlot } from "./waitingList.service.js";

const bookingSelect = `
  SELECT
    b.*,
    u.name AS user_name,
    u.email AS user_email,
    f.name AS facility_name,
    f.code AS facility_code
  FROM bookings b
  JOIN users u ON u.id = b.user_id
  JOIN facilities f ON f.id = b.facility_id
`;

const emitBookingEvent = (eventName, booking) => {
  try {
    const io = getIo();
    io.emit(eventName, booking);
    io.to(`facility:${booking.facility_id}`).emit("facility:availability-updated", booking);
    io.to("calendar").emit("calendar:booking-updated", booking);
  } catch (_error) {
    // Socket emission is best-effort.
  }
};

export const listBookings = async ({ userId, role, start = null, end = null }) => {
  const params = [];
  const conditions = [];

  if (role !== "admin") {
    params.push(userId);
    conditions.push(`b.user_id = $${params.length}`);
  }

  if (start && end) {
    params.push(start, end);
    conditions.push(
      `tstzrange(b.start_time, b.end_time, '[)') && tstzrange($${params.length - 1}::timestamptz, $${params.length}::timestamptz, '[)')`
    );
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const { rows } = await pool.query(
    `${bookingSelect}
     ${whereClause}
     ORDER BY b.start_time ASC`,
    params
  );

  return rows;
};

export const getBookingById = async (bookingId) => {
  const { rows } = await pool.query(`${bookingSelect} WHERE b.id = $1`, [bookingId]);
  if (!rows.length) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Booking not found.");
  }
  return rows[0];
};

export const createBooking = async (payload, currentUser) => {
  const result = await withTransaction(async (client) => {
    await client.query("SELECT pg_advisory_xact_lock($1)", [payload.facilityId]);

    const { rows: facilities } = await client.query(
      "SELECT * FROM facilities WHERE id = $1 AND is_active = TRUE",
      [payload.facilityId]
    );

    if (!facilities.length) {
      throw new ApiError(StatusCodes.NOT_FOUND, "Facility not found or inactive.");
    }

    const status = currentUser.role === "student" && payload.requiresApproval ? "pending" : "confirmed";
    let recurringRule = null;

    try {
      const { rows } = await client.query(
        `INSERT INTO bookings (user_id, facility_id, start_time, end_time, status, purpose, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [
          currentUser.id,
          payload.facilityId,
          payload.startTime,
          payload.endTime,
          status,
          payload.purpose,
          payload.notes
        ]
      );

      if (payload.recurrence) {
        recurringRule = await createRecurringRule(
          client,
          currentUser.id,
          payload.facilityId,
          payload.recurrence,
          payload.startTime,
          payload.endTime,
          payload.purpose
        );

        await client.query(
          "UPDATE bookings SET recurring_booking_id = $2 WHERE id = $1",
          [rows[0].id, recurringRule.id]
        );
        rows[0].recurring_booking_id = recurringRule.id;
      }

      await createNotification(client, {
        userId: currentUser.id,
        type: "booking_created",
        title: "Booking created",
        message:
          status === "confirmed"
            ? "Your facility booking is confirmed."
            : "Your facility booking is pending approval.",
        payload: { bookingId: rows[0].id }
      });

      return { booking: rows[0], recurringRule };
    } catch (error) {
      if (error.code === "23P01") {
        throw new ApiError(StatusCodes.CONFLICT, "Facility is already booked for the requested time.");
      }
      throw error;
    }
  });

  emitBookingEvent("booking:created", result.booking);
  return result;
};

export const updateBookingStatus = async (bookingId, status, currentUser) => {
  const booking = await getBookingById(bookingId);
  if (currentUser.role !== "admin" && booking.user_id !== currentUser.id) {
    throw new ApiError(StatusCodes.FORBIDDEN, "You cannot modify this booking.");
  }

  const { rows } = await pool.query(
    `UPDATE bookings
     SET status = $2, updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [bookingId, status]
  );

  emitBookingEvent("booking:updated", rows[0]);
  return rows[0];
};

export const cancelBooking = async (bookingId, currentUser) => {
  const result = await withTransaction(async (client) => {
    const { rows } = await client.query("SELECT * FROM bookings WHERE id = $1 FOR UPDATE", [bookingId]);
    if (!rows.length) {
      throw new ApiError(StatusCodes.NOT_FOUND, "Booking not found.");
    }

    const booking = rows[0];
    if (currentUser.role !== "admin" && booking.user_id !== currentUser.id) {
      throw new ApiError(StatusCodes.FORBIDDEN, "You cannot cancel this booking.");
    }

    await client.query(
      `UPDATE bookings
       SET status = 'cancelled', updated_at = NOW()
       WHERE id = $1`,
      [bookingId]
    );

    await createNotification(client, {
      userId: booking.user_id,
      type: "booking_cancelled",
      title: "Booking cancelled",
      message: "Your booking has been cancelled.",
      payload: { bookingId }
    });

    const promotedBooking = await promoteWaitingListForSlot(client, {
      facilityId: booking.facility_id,
      startTime: booking.start_time,
      endTime: booking.end_time
    });

    return { booking: { ...booking, status: "cancelled" }, promotedBooking };
  });

  emitBookingEvent("booking:cancelled", result.booking);
  if (result.promotedBooking) {
    emitBookingEvent("booking:promoted", result.promotedBooking);
  }

  return result;
};
