import type { TimePeriod } from "../store/orderSlice";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

const HK_TIMEZONE = "Asia/Hong_Kong";

export function getCurrentTimePeriod(): TimePeriod {
  const now = dayjs().tz(HK_TIMEZONE);
  const hour = now.hour();

  if (hour >= 6 && hour < 12) {
    return "Morning";
  } else if (hour >= 12 && hour < 18) {
    return "Afternoon";
  } else {
    return "Evening";
  }
}

export function getCurrentDateHK(): dayjs.Dayjs {
  return dayjs().tz(HK_TIMEZONE);
}