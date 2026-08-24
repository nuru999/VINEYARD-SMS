import { describe, expect, test } from "bun:test";
import { buildFeeLedger } from "./fee-ledger";

function structure(id: number, frequency: string, amount = 1000) {
  return {
    id,
    classId: 1,
    name: `Fee ${id}`,
    amount,
    frequency,
    createdAt: new Date("2026-01-01T00:00:00Z"),
  } as any;
}

function payment(
  id: number,
  overrides: Partial<{
    studentId: number;
    feeStructureId: number | null;
    amount: number;
    discount: number;
    paidAmount: number;
    balance: number;
    paymentDate: string;
    term: string | null;
  }> = {},
) {
  return {
    id,
    studentId: overrides.studentId ?? 1,
    feeStructureId: overrides.feeStructureId === undefined ? 10 : overrides.feeStructureId,
    amount: overrides.amount ?? 1000,
    discount: overrides.discount ?? 0,
    paidAmount: overrides.paidAmount ?? 0,
    balance: overrides.balance ?? 0,
    paymentDate: overrides.paymentDate ?? "2026-01-10",
    paymentMethod: "cash",
    term: overrides.term === undefined ? "Term 1" : overrides.term,
    receiptNo: `R-${id}`,
    notes: null,
    collectedBy: null,
    createdAt: new Date("2026-01-10T00:00:00Z"),
  } as any;
}

describe("buildFeeLedger", () => {
  test("reconciles partial termly payments into one current obligation balance", () => {
    const payments = [
      payment(2, { paidAmount: 300, paymentDate: "2026-02-10", balance: 700 }),
      payment(1, { paidAmount: 200, paymentDate: "2026-01-10", balance: 800 }),
    ];

    const ledger = buildFeeLedger(payments, [structure(10, "termly")]);

    expect(ledger.obligations).toHaveLength(1);
    expect(ledger.summary.totalCollected).toBe(500);
    expect(ledger.summary.totalOutstanding).toBe(500);
    expect(ledger.obligations[0].totalPaid).toBe(500);
    expect(ledger.obligations[0].balance).toBe(500);
    expect(ledger.payments.find((entry) => entry.id === 1)?.balance).toBe(800);
    expect(ledger.payments.find((entry) => entry.id === 2)?.balance).toBe(500);
  });

  test("applies discounts cumulatively without double-counting outstanding fees", () => {
    const ledger = buildFeeLedger([
      payment(1, { paidAmount: 250, discount: 100 }),
      payment(2, { paidAmount: 150, discount: 50, paymentDate: "2026-01-20" }),
    ], [structure(10, "termly")]);

    expect(ledger.summary.totalCollected).toBe(400);
    expect(ledger.summary.totalDiscount).toBe(150);
    expect(ledger.summary.totalOutstanding).toBe(450);
    expect(ledger.obligations[0].balance).toBe(450);
  });

  test("keeps different terms as separate obligations", () => {
    const ledger = buildFeeLedger([
      payment(1, { paidAmount: 100, term: "Term 1", paymentDate: "2026-02-01" }),
      payment(2, { paidAmount: 200, term: "Term 2", paymentDate: "2026-06-01" }),
    ], [structure(10, "termly")]);

    expect(ledger.obligations).toHaveLength(2);
    expect(ledger.summary.totalOutstanding).toBe(1700);
  });

  test("keeps monthly obligations separate by calendar month", () => {
    const ledger = buildFeeLedger([
      payment(1, { paidAmount: 200, paymentDate: "2026-01-15", term: null }),
      payment(2, { paidAmount: 300, paymentDate: "2026-02-15", term: null }),
    ], [structure(10, "monthly")]);

    expect(ledger.obligations).toHaveLength(2);
    expect(ledger.obligations.map((entry) => entry.period).sort()).toEqual(["2026-01", "2026-02"]);
    expect(ledger.summary.totalOutstanding).toBe(1500);
  });

  test("keeps a one-time fee as one obligation across payment dates", () => {
    const ledger = buildFeeLedger([
      payment(1, { paidAmount: 300, paymentDate: "2025-12-31", term: null }),
      payment(2, { paidAmount: 400, paymentDate: "2026-01-15", term: null }),
    ], [structure(10, "once")]);

    expect(ledger.obligations).toHaveLength(1);
    expect(ledger.obligations[0].totalPaid).toBe(700);
    expect(ledger.obligations[0].balance).toBe(300);
  });

  test("treats custom payments without a fee structure as independent obligations", () => {
    const ledger = buildFeeLedger([
      payment(1, { feeStructureId: null, amount: 500, paidAmount: 200, term: null }),
      payment(2, { feeStructureId: null, amount: 700, paidAmount: 100, term: null }),
    ], []);

    expect(ledger.obligations).toHaveLength(2);
    expect(ledger.summary.totalOutstanding).toBe(900);
  });

  test("clamps legacy overpayment balances at zero", () => {
    const ledger = buildFeeLedger([
      payment(1, { paidAmount: 900 }),
      payment(2, { paidAmount: 200, paymentDate: "2026-01-20" }),
    ], [structure(10, "termly")]);

    expect(ledger.obligations[0].balance).toBe(0);
    expect(ledger.summary.totalOutstanding).toBe(0);
  });
});
