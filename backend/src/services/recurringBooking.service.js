import dayjs from "dayjs";
import { pool, withTransaction } from "../config/db.js";
import { ApiError } from "../utils/ApiError.js";
import { createNotification } from "./notification.service.js";

const buildNextGenerationDate = ({ startTime, frequency, intervalValue }) => {
  const unitMap = { daily: "day", weekly: "week", monthly: "month" };
  return dayjs(startTime).add(intervalValue, unitMap[frequency]).toISOString();
};

const shouldIncludeWeeklyDate = (date, weekdays) => {
  if (!Array.isArray(weekdays) || weekdays.length === 0) {
    return true;
  }

  return weekdays.includes(dayjs(date).day());
};

export const createRecurringRule = async (client, userId, facilityId, recurrence, startTime, endTime, purpose) => {
  const frequency = recurrence.frequency;
  const intervalValue = recurrence.intervalValue || 1;
  const recurrenceEndDate = recurrence.endDate;

  if (!["daily", "weekly", "monthly"].includes(frequency)) {
    throw new ApiError(400, "Invalid recurrence frequency.");
  }

  const { rows } = await client.query(
    `INSERT INTO recurring_bookings
      (user_id, facility_id, start_time, end_time, frequency, interval_value, weekdays, day_of_month, recurrence_end_date, next_generation_date, purpose)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     RETURNING *`,
    [
      userId,
      facilityId,
      startTime,
      endTime,
      frequency,
      intervalValue,
      recurrence.weekdays || [],
      recurrence.dayOfMonth || null,
      recurrenceEndDate,
      buildNextGenerationDate({ startTime, frequency, intervalValue }),
      purpose
    ]
  );

  return rows[0];
};

const generateOccurrences = (rule, horizonDays = 30) => {
  const occurrences = [];
  const durationMs = new Date(rule.end_time).getTime() - new Date(rule.start_time).getTime();
  const horizon = dayjs().add(horizonDays, "day");
  let cursor = dayjs(rule.next_generation_date);

  while (cursor.isBefore(horizon) && cursor.isBefore(dayjs(rule.recurrence_end_date).add(1, "second"))) {
    if (rule.frequency !== "weekly" || shouldIncludeWeeklyDate(cursor, rule.weekdays)) {
      const occurrenceEnd = cursor.add(durationMs, "millisecond");
      if (rule.frequency !== "monthly" || !rule.day_of_month || cursor.date() === rule.day_of_month) {
        occurrences.push({
          startTime: cursor.toISOString(),
          endTime: occurrenceEnd.toISOString()
        });
      }
    }

    const unitMap = { daily: "day", weekly: "week", monthly: "month" };
    cursor = cursor.add(rule.interval_value, unitMap[rule.frequency]);
  }

  return {
    occurrences,
    nextGenerationDate: cursor.toISOString()
  };
};

export const generateUpcomingRecurringBookings = async () => {
  const { rows: rules } = await pool.query(
    `SELECT *
     FROM recurring_bookings
     WHERE status = 'active'
       AND next_generation_date <= NOW() + INTERVAL '30 days'`
  );

  let generatedCount = 0;

  for (const rule of rules) {
    const { occurrences, nextGenerationDate } = generateOccurrences(rule);

    await withTransaction(async (client) => {
      for (const occurrence of occurrences) {
        const { rows: existing } = await client.query(
          `SELECT id
           FROM bookings
           WHERE recurring_booking_id = $1
             AND start_time = $2`,
          [rule.id, occurrence.startTime]
        );

        if (existing.length) {
          continue;
        }

        try {
          await client.query(
            `INSERT INTO bookings
              (user_id, facility_id, recurring_booking_id, start_time, end_time, status, purpose)
             VALUES ($1, $2, $3, $4, $5, 'confirmed', $6)`,
            [rule.user_id, rule.facility_id, rule.id, occurrence.startTime, occurrence.endTime, rule.purpose]
          );
          generatedCount += 1;
        } catch (error) {
          if (error.code === "23P01") {
            await createNotification(client, {
              userId: rule.user_id,
              type: "recurring_conflict",
              title: "Recurring booking conflict",
              message: "A recurring booking occurrence could not be created because the slot is occupied.",
              payload: { recurringBookingId: rule.id, occurrence }
            });
            continue;
          }

          throw error;
        }
      }

      await client.query(
        "UPDATE recurring_bookings SET next_generation_date = $2 WHERE id = $1",
        [rule.id, nextGenerationDate]
      );
    });
  }

  return generatedCount;
};
