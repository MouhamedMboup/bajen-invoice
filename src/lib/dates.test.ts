import { test } from "node:test";
import assert from "node:assert/strict";
import { formatDate, formatCalendarDate, businessYear } from "./dates";

// 2027-01-01 03:00 UTC is 2026-12-31 22:00 in New York (EST, UTC-5).
const nyNewYearsEve = new Date("2027-01-01T03:00:00Z");

test("formatDate shows timestamps in New York time", () => {
  assert.equal(formatDate(nyNewYearsEve), "Dec 31, 2026");
});

test("formatDate handles daylight saving time (EDT, UTC-4)", () => {
  // 2026-07-05 02:30 UTC is 2026-07-04 22:30 in New York.
  assert.equal(formatDate(new Date("2026-07-05T02:30:00Z")), "Jul 4, 2026");
});

test("formatCalendarDate keeps date-picker values on the picked day", () => {
  // Due dates are saved as midnight UTC; New York time would show Oct 21.
  assert.equal(formatCalendarDate(new Date("2026-10-22T00:00:00Z")), "Oct 22, 2026");
});

test("businessYear uses the New York year", () => {
  assert.equal(businessYear(nyNewYearsEve), 2026);
  assert.equal(businessYear(new Date("2027-01-01T06:00:00Z")), 2027);
});
