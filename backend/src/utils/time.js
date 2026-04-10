import dayjs from "dayjs";

export const toIso = (value) => dayjs(value).toISOString();
export const isBefore = (start, end) => dayjs(start).isBefore(dayjs(end));
export const addByFrequency = (date, frequency, interval = 1) => {
  const map = {
    daily: "day",
    weekly: "week",
    monthly: "month"
  };

  return dayjs(date).add(interval, map[frequency]);
};
