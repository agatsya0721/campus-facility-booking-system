import { StatusCodes } from "http-status-codes";
import { pool } from "../config/db.js";
import { ApiError } from "../utils/ApiError.js";

export const getActiveAnnouncement = async () => {
  const { rows } = await pool.query(
    `SELECT id, title, message, link_url, is_active, updated_at
     FROM announcements
     WHERE is_active = TRUE
     ORDER BY updated_at DESC
     LIMIT 1`
  );

  return rows[0] || null;
};

export const upsertAnnouncement = async ({ title, message, linkUrl, isActive, userId }) => {
  const { rows: existing } = await pool.query(
    `SELECT id
     FROM announcements
     ORDER BY updated_at DESC
     LIMIT 1`
  );

  if (existing.length) {
    const { rows } = await pool.query(
      `UPDATE announcements
       SET title = $2,
           message = $3,
           link_url = $4,
           is_active = $5,
           updated_by = $6,
           updated_at = NOW()
       WHERE id = $1
       RETURNING id, title, message, link_url, is_active, updated_at`,
      [existing[0].id, title, message, linkUrl, isActive, userId]
    );
    return rows[0];
  }

  const { rows } = await pool.query(
    `INSERT INTO announcements (title, message, link_url, is_active, created_by, updated_by)
     VALUES ($1, $2, $3, $4, $5, $5)
     RETURNING id, title, message, link_url, is_active, updated_at`,
    [title, message, linkUrl, isActive, userId]
  );

  return rows[0];
};

export const validateAnnouncementPayload = ({ title, message, linkUrl }) => {
  if (!title?.trim()) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Announcement title is required.");
  }

  if (!message?.trim()) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Announcement message is required.");
  }

  if (linkUrl && !/^https?:\/\/\S+$/i.test(linkUrl.trim())) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Announcement link must be a valid http or https URL.");
  }
};
