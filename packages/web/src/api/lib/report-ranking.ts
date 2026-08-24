export function gradeFromPercent(pct: number): string {
  if (pct >= 80) return "A";
  if (pct >= 70) return "B";
  if (pct >= 60) return "C";
  if (pct >= 50) return "D";
  return "E";
}

export function remarksFromPercent(pct: number): string {
  if (pct >= 80) return "Excellent";
  if (pct >= 70) return "Very Good";
  if (pct >= 60) return "Good";
  if (pct >= 50) return "Average";
  return "Needs Improvement";
}

export interface ScoredSubjectRow {
  marks: number | null;
  maxMarks: number | null | undefined;
}

export function scoreSubjectRows(subjectRows: ScoredSubjectRow[]) {
  const attempted = subjectRows.filter((row) => row.marks !== null);
  const totalMarks = attempted.reduce((sum, row) => sum + Number(row.marks || 0), 0);
  const totalMax = attempted.reduce((sum, row) => sum + Number(row.maxMarks || 100), 0);
  const hasResults = attempted.length > 0 && totalMax > 0;
  const overallPercentage = hasResults ? Math.round((totalMarks / totalMax) * 100) : null;

  return {
    totalMarks,
    totalMax,
    attemptedSubjects: attempted.length,
    hasResults,
    overallPercentage,
    overallGrade: overallPercentage !== null ? gradeFromPercent(overallPercentage) : "—",
    overallRemarks: overallPercentage !== null ? remarksFromPercent(overallPercentage) : "No results entered",
  };
}

export function buildCompetitionPositions<T extends { student: { id: number }; overallPercentage: number | null; hasResults: boolean }>(reports: T[]) {
  const ranked = reports
    .filter((report) => report.hasResults && report.overallPercentage !== null)
    .sort((a, b) => Number(b.overallPercentage) - Number(a.overallPercentage));

  const positionByStudent = new Map<number, number>();
  let previousPercentage: number | null = null;
  let previousPosition = 0;

  ranked.forEach((report, index) => {
    const percentage = Number(report.overallPercentage);
    if (previousPercentage === null || percentage !== previousPercentage) {
      previousPosition = index + 1;
      previousPercentage = percentage;
    }
    positionByStudent.set(report.student.id, previousPosition);
  });

  return { positionByStudent, rankedCount: ranked.length };
}
