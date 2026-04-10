import { StatusCodes } from "http-status-codes";
import {
  cancelBooking,
  createBooking,
  getBookingById,
  listBookings,
  updateBookingStatus
} from "../services/booking.service.js";
import { getAvailability } from "../services/availability.service.js";
import {
  cancelWaitingListEntry,
  joinWaitingList,
  listWaitingList
} from "../services/waitingList.service.js";
import { withTransaction } from "../config/db.js";

export const getBookings = async (req, res) => {
  const bookings = await listBookings({
    userId: req.user.id,
    role: req.user.role,
    start: req.query.start || null,
    end: req.query.end || null
  });

  res.status(StatusCodes.OK).json({ success: true, data: bookings });
};

export const getBooking = async (req, res) => {
  const booking = await getBookingById(Number(req.params.id));
  res.status(StatusCodes.OK).json({ success: true, data: booking });
};

export const createBookingHandler = async (req, res) => {
  const result = await createBooking(req.validated, req.user);
  res.status(StatusCodes.CREATED).json({
    success: true,
    message: "Booking created successfully.",
    data: result
  });
};

export const updateBookingStatusHandler = async (req, res) => {
  const booking = await updateBookingStatus(Number(req.params.id), req.validated.status, req.user);
  res.status(StatusCodes.OK).json({
    success: true,
    message: "Booking updated successfully.",
    data: booking
  });
};

export const cancelBookingHandler = async (req, res) => {
  const result = await cancelBooking(Number(req.params.id), req.user);
  res.status(StatusCodes.OK).json({
    success: true,
    message: "Booking cancelled successfully.",
    data: result
  });
};

export const getAvailabilityHandler = async (req, res) => {
  const availability = await getAvailability(req.validated);
  res.status(StatusCodes.OK).json({ success: true, data: availability });
};

export const joinWaitingListHandler = async (req, res) => {
  const entry = await withTransaction((client) =>
    joinWaitingList(client, { ...req.validated, userId: req.user.id })
  );

  res.status(StatusCodes.CREATED).json({
    success: true,
    message: "Added to waiting list successfully.",
    data: entry
  });
};

export const getWaitingListHandler = async (req, res) => {
  const entries = await listWaitingList(req.query.facilityId ? Number(req.query.facilityId) : null);
  res.status(StatusCodes.OK).json({ success: true, data: entries });
};

export const cancelWaitingListHandler = async (req, res) => {
  await cancelWaitingListEntry(
    Number(req.params.id),
    req.user.id,
    req.user.role === "admin"
  );
  res.status(StatusCodes.OK).json({
    success: true,
    message: "Waiting list entry cancelled successfully."
  });
};
