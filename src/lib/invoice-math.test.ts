import { test } from "node:test";
import assert from "node:assert/strict";
import { invoicePaid, invoiceBalance, outstanding, groupByYear, formatMoney } from "./invoice-math";

const inv = (total: number, paid: number[], iso = "2026-03-01T12:00:00Z") => ({
  total,
  createdAt: new Date(iso),
  payments: paid.map((amount) => ({ amount })),
});

test("no payments: paid 0, balance = total", () => {
  assert.equal(invoicePaid(inv(100, [])), 0);
  assert.equal(invoiceBalance(inv(100, [])), 100);
});

test("partial payments summed", () => {
  assert.equal(invoiceBalance(inv(100, [30, 20.5])), 49.5);
});

test("overpaid contributes 0 to outstanding", () => {
  assert.equal(outstanding([inv(100, [150]), inv(80, [])]), 80);
});

test("decimal-like values accepted", () => {
  assert.equal(
    invoiceBalance({
      total: { toString: () => "10.10" },
      createdAt: new Date(),
      payments: [{ amount: { toString: () => "0.10" } }],
    }),
    10,
  );
});

test("groupByYear: newest year first, order kept", () => {
  const a = inv(1, [], "2027-03-01T12:00:00Z");
  const b = inv(2, [], "2026-06-01T12:00:00Z");
  const c = inv(3, [], "2026-02-01T12:00:00Z");
  const g = groupByYear([a, b, c]);
  assert.deepEqual(
    g.map((x) => x.year),
    [2027, 2026],
  );
  assert.deepEqual(g[1].invoices, [b, c]);
});

test("groupByYear: Dec 31 evening in New York stays in that year", () => {
  const g = groupByYear([inv(1, [], "2027-01-01T03:00:00Z")]);
  assert.deepEqual(
    g.map((x) => x.year),
    [2026],
  );
});

test("formatMoney puts the minus sign before the dollar sign", () => {
  assert.equal(formatMoney(-50), "-$50.00");
  assert.equal(formatMoney(1234.5), "$1234.50");
  assert.equal(formatMoney(0), "$0.00");
});

test("groupByYear: empty input", () => {
  assert.deepEqual(groupByYear([]), []);
});
