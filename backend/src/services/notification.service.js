import { getIo } from "../config/socket.js";

export const createNotification = async (client, { userId, type, title, message, payload = {} }) => {
  const { rows } = await client.query(
    `INSERT INTO notifications (user_id, type, title, message, payload)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [userId, type, title, message, JSON.stringify(payload)]
  );

  try {
    getIo().to(`user:${userId}`).emit("notification:new", rows[0]);
  } catch (_error) {
    // Socket delivery is best-effort; the DB write is the durable record.
  }

  return rows[0];
};
