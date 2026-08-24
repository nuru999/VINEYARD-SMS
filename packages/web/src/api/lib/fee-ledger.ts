import type * as schema from "../database/schema";

type FeePayment = typeof schema.feePayments.$inferSelect;
type FeeStructure = typeof schema.feeStructures.$inferSelect;

export type FeeObligation = {
  key: string;
  studentId: number;
  feeStructureId: number | null;
  frequency: string | null;
  term: string | null;
  period: string;
  amount: number;
  totalPaid: number;
  totalDiscount: number;
  balance: number;
  entries: FeePayment[];
};

function yearOf(date: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date.slice(0, 4) : "unknown-year";
}

function monthOf(date: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date.slice(0, 7) : "unknown-month";
}

function obligationIdentity(payment: FeePayment, structure: FeeStructure | undefined) {
  if (!payment.feeStructureId || !structure) {
    return {
      key: `custom:${payment.id}`,
      period: payment.paymentDate || "custom",
      frequency: null,
    };
  }

  const year = yearOf(payment.paymentDate);
  const frequency = structure.frequency || "termly";

  if (frequency === "monthly") {
    const period = monthOf(payment.paymentDate);
    return {
      key: `${payment.studentId}:${payment.feeStructureId}:monthly:${period}`,
      period,
      frequency,
    };
  }

  if (frequency === "annual") {
    return {
      key: `${payment.studentId}:${payment.feeStructureId}:annual:${year}`,
      period: year,
      frequency,
    };
  }

  if (frequency === "once") {
    return {
      key: `${payment.studentId}:${payment.feeStructureId}:once`,
      period: "once",
      frequency,
    };
  }

  const term = payment.term || "Unassigned Term";
  return {
    key: `${payment.studentId}:${payment.feeStructureId}:termly:${year}:${term}`,
    period: `${term} ${year}`,
    frequency: "termly",
  };
}

function entrySort(a: FeePayment, b: FeePayment) {
  const dateOrder = String(a.paymentDate || "").localeCompare(String(b.paymentDate || ""));
  return dateOrder !== 0 ? dateOrder : a.id - b.id;
}

export function buildFeeLedger(payments: FeePayment[], structures: FeeStructure[]) {
  const structureMap = new Map(structures.map((structure) => [structure.id, structure]));
  const grouped = new Map<string, { structure?: FeeStructure; entries: FeePayment[]; period: string; frequency: string | null }>();

  for (const payment of payments) {
    const structure = payment.feeStructureId ? structureMap.get(payment.feeStructureId) : undefined;
    const identity = obligationIdentity(payment, structure);
    const existing = grouped.get(identity.key);
    if (existing) {
      existing.entries.push(payment);
    } else {
      grouped.set(identity.key, {
        structure,
        entries: [payment],
        period: identity.period,
        frequency: identity.frequency,
      });
    }
  }

  const obligations: FeeObligation[] = [];
  const normalizedById = new Map<number, FeePayment>();

  for (const [key, group] of grouped.entries()) {
    const entries = [...group.entries].sort(entrySort);
    const firstPositiveAmount = entries.find((entry) => Number(entry.amount) > 0)?.amount;
    const amount = Number(firstPositiveAmount ?? group.structure?.amount ?? 0);
    let runningPaid = 0;
    let runningDiscount = 0;

    const normalizedEntries = entries.map((entry) => {
      runningPaid += Number(entry.paidAmount || 0);
      runningDiscount += Number(entry.discount || 0);
      const normalized = {
        ...entry,
        amount,
        balance: Math.max(0, amount - runningPaid - runningDiscount),
      } as FeePayment;
      normalizedById.set(entry.id, normalized);
      return normalized;
    });

    const first = normalizedEntries[0];
    obligations.push({
      key,
      studentId: first.studentId,
      feeStructureId: first.feeStructureId ?? null,
      frequency: group.frequency,
      term: first.term ?? null,
      period: group.period,
      amount,
      totalPaid: runningPaid,
      totalDiscount: runningDiscount,
      balance: Math.max(0, amount - runningPaid - runningDiscount),
      entries: normalizedEntries,
    });
  }

  const normalizedPayments = payments.map((payment) => normalizedById.get(payment.id) ?? payment);
  const totalCollected = normalizedPayments.reduce((sum, payment) => sum + Number(payment.paidAmount || 0), 0);
  const totalDiscount = normalizedPayments.reduce((sum, payment) => sum + Number(payment.discount || 0), 0);
  const totalOutstanding = obligations.reduce((sum, obligation) => sum + obligation.balance, 0);

  return {
    obligations,
    payments: normalizedPayments,
    summary: {
      totalCollected,
      totalDiscount,
      totalOutstanding,
      obligationCount: obligations.length,
    },
  };
}

export function obligationKeyForCandidate(
  payment: Pick<FeePayment, "id" | "studentId" | "feeStructureId" | "paymentDate" | "term">,
  structure: FeeStructure | undefined,
) {
  return obligationIdentity(payment as FeePayment, structure).key;
}
