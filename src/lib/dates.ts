// The business runs in New York, so timestamps are shown and grouped in New York time
// regardless of where the server runs (Vercel renders in UTC).
export const BUSINESS_TIME_ZONE = "America/New_York";

const DATE_FORMAT: Intl.DateTimeFormatOptions = {
  month: "short",
  day: "numeric",
  year: "numeric",
};

/** A moment in time (createdAt, paidAt) shown as its New York calendar date. */
export function formatDate(d: Date | string): string {
  return new Date(d).toLocaleDateString("en-US", { ...DATE_FORMAT, timeZone: BUSINESS_TIME_ZONE });
}

/**
 * A calendar date picked in a date input (due date, expense date). These are stored
 * as midnight UTC, so they must be read in UTC or they slip back a day in New York.
 */
export function formatCalendarDate(d: Date | string): string {
  return new Date(d).toLocaleDateString("en-US", { ...DATE_FORMAT, timeZone: "UTC" });
}

/** The New York calendar year of a moment in time. */
export function businessYear(d: Date): number {
  return Number(
    new Intl.DateTimeFormat("en-US", { year: "numeric", timeZone: BUSINESS_TIME_ZONE }).format(d),
  );
}
