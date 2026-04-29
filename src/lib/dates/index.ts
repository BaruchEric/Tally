import { DateTime } from "luxon";

export function localDayBounds(date: Date | string = new Date(), zone = DateTime.local().zoneName) {
  const value = typeof date === "string" ? DateTime.fromISO(date, { zone }) : DateTime.fromJSDate(date, { zone });
  const start = value.startOf("day");
  const end = start.plus({ days: 1 });

  return {
    start,
    end,
    startDate: start.toJSDate(),
    endDate: end.toJSDate(),
    key: start.toISODate()
  };
}

export function monthBounds(date: Date | string = new Date(), zone = DateTime.local().zoneName) {
  const value = typeof date === "string" ? DateTime.fromISO(date, { zone }) : DateTime.fromJSDate(date, { zone });
  const start = value.startOf("month");
  const end = start.plus({ months: 1 });

  return {
    start,
    end,
    startDate: start.toJSDate(),
    endDate: end.toJSDate(),
    key: start.toFormat("yyyy-MM")
  };
}

export function formatEntryDate(date: string, locale = "en-US") {
  return DateTime.fromISO(date).setLocale(locale).toLocaleString(DateTime.DATE_MED);
}
