import { describe, expect, test } from "bun:test";
import { buildCompetitionPositions, gradeFromPercent, scoreSubjectRows } from "./report-ranking";

describe("report-card grading", () => {
  test("uses the documented grade boundaries", () => {
    expect(gradeFromPercent(80)).toBe("A");
    expect(gradeFromPercent(79)).toBe("B");
    expect(gradeFromPercent(70)).toBe("B");
    expect(gradeFromPercent(69)).toBe("C");
    expect(gradeFromPercent(60)).toBe("C");
    expect(gradeFromPercent(59)).toBe("D");
    expect(gradeFromPercent(50)).toBe("D");
    expect(gradeFromPercent(49)).toBe("E");
  });

  test("keeps a student with no marks ungraded", () => {
    const score = scoreSubjectRows([
      { marks: null, maxMarks: 100 },
      { marks: null, maxMarks: 100 },
    ]);

    expect(score).toEqual({
      totalMarks: 0,
      totalMax: 0,
      attemptedSubjects: 0,
      hasResults: false,
      overallPercentage: null,
      overallGrade: "—",
      overallRemarks: "No results entered",
    });
  });

  test("scores against the combined maximum marks", () => {
    const score = scoreSubjectRows([
      { marks: 40, maxMarks: 50 },
      { marks: 30, maxMarks: 50 },
    ]);

    expect(score.totalMarks).toBe(70);
    expect(score.totalMax).toBe(100);
    expect(score.overallPercentage).toBe(70);
    expect(score.overallGrade).toBe("B");
  });
});

describe("report-card competition ranking", () => {
  test("gives tied percentages the same position and skips the next ordinal", () => {
    const reports = [
      { student: { id: 1 }, overallPercentage: 90, hasResults: true },
      { student: { id: 2 }, overallPercentage: 90, hasResults: true },
      { student: { id: 3 }, overallPercentage: 80, hasResults: true },
    ];

    const { positionByStudent, rankedCount } = buildCompetitionPositions(reports);

    expect(rankedCount).toBe(3);
    expect(positionByStudent.get(1)).toBe(1);
    expect(positionByStudent.get(2)).toBe(1);
    expect(positionByStudent.get(3)).toBe(3);
  });

  test("excludes students without results from ranking", () => {
    const reports = [
      { student: { id: 1 }, overallPercentage: 75, hasResults: true },
      { student: { id: 2 }, overallPercentage: null, hasResults: false },
      { student: { id: 3 }, overallPercentage: 65, hasResults: true },
    ];

    const { positionByStudent, rankedCount } = buildCompetitionPositions(reports);

    expect(rankedCount).toBe(2);
    expect(positionByStudent.get(1)).toBe(1);
    expect(positionByStudent.has(2)).toBe(false);
    expect(positionByStudent.get(3)).toBe(2);
  });
});
