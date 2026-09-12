import { describe, expect, test } from "bun:test";
import { examLabel } from "./exam-label";

describe("examLabel", () => {
  const classes = [
    { id: 13, name: "Grade 4 Blue" },
    { id: 14, name: "Grade 5 Green" },
  ];

  test("distinguishes exams with the same name by class", () => {
    expect(examLabel({ name: "End-Term Assessment", classId: 13, term: "Term 2", year: 2026 }, classes))
      .toBe("End-Term Assessment — Grade 4 Blue — Term 2 2026");
    expect(examLabel({ name: "End-Term Assessment", classId: 14, term: "Term 2", year: 2026 }, classes))
      .toBe("End-Term Assessment — Grade 5 Green — Term 2 2026");
  });

  test("keeps a safe fallback when class data is missing", () => {
    expect(examLabel({ name: "Opening Exam", classId: 99 }, classes))
      .toBe("Opening Exam — Unknown class");
  });
});
