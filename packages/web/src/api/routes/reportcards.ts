import { Hono } from "hono";
import { db } from "../database";
import * as schema from "../database/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";

function gradeFromPercent(pct: number): string {
  if (pct >= 80) return "A";
  if (pct >= 70) return "B";
  if (pct >= 60) return "C";
  if (pct >= 50) return "D";
  return "E";
}

function remarksFromPercent(pct: number): string {
  if (pct >= 80) return "Excellent";
  if (pct >= 70) return "Very Good";
  if (pct >= 60) return "Good";
  if (pct >= 50) return "Average";
  return "Needs Improvement";
}

export const reportCardsRoutes = new Hono()
  // GET /report-cards?examId=X  — returns all students' report cards for an exam
  .get("/", requireAuth, async (c) => {
    const examId = parseInt(c.req.query("examId") || "0");
    if (!examId) return c.json({ error: "examId required" }, 400);

    const [exam] = await db.select().from(schema.exams).where(eq(schema.exams.id, examId));
    if (!exam) return c.json({ error: "Exam not found" }, 404);

    const results = await db.select().from(schema.examResults).where(eq(schema.examResults.examId, examId));
    const students = await db.select().from(schema.students).where(eq(schema.students.classId, exam.classId));
    const subjects = await db.select().from(schema.subjects).where(eq(schema.subjects.classId, exam.classId));
    const classes = await db.select().from(schema.classes);
    const cls = classes.find(c => c.id === exam.classId);

    // Build per-student report
    const reports = students.map(student => {
      const studentResults = results.filter(r => r.studentId === student.id);
      const subjectRows = subjects.map(sub => {
        const r = studentResults.find(r => r.subjectId === sub.id);
        const marks = r?.marks ?? null;
        const maxMarks = r?.maxMarks ?? 100;
        const pct = marks !== null ? Math.round((marks / maxMarks) * 100) : null;
        return {
          subjectId: sub.id,
          subjectName: sub.name,
          marks,
          maxMarks,
          percentage: pct,
          grade: pct !== null ? gradeFromPercent(pct) : "—",
          remarks: pct !== null ? remarksFromPercent(pct) : "—",
        };
      });

      const attempted = subjectRows.filter(s => s.marks !== null);
      const totalMarks = attempted.reduce((s, r) => s + (r.marks || 0), 0);
      const totalMax = attempted.reduce((s, r) => s + (r.maxMarks || 100), 0);
      const overallPct = totalMax > 0 ? Math.round((totalMarks / totalMax) * 100) : 0;

      return {
        student,
        class: cls,
        exam,
        subjects: subjectRows,
        totalMarks,
        totalMax,
        overallPercentage: overallPct,
        overallGrade: gradeFromPercent(overallPct),
        overallRemarks: remarksFromPercent(overallPct),
      };
    });

    // Compute position in class (ranked by overallPct desc)
    const ranked = [...reports].sort((a, b) => b.overallPercentage - a.overallPercentage);
    ranked.forEach((r, i) => { (r as any).position = i + 1; });

    // Re-attach positions
    const finalReports = reports.map(r => ({
      ...r,
      position: ranked.find(rk => rk.student.id === r.student.id)?.position ?? 0,
    }));

    return c.json({ reportCards: finalReports, exam, class: cls }, 200);
  })

  // GET /report-cards/:studentId?examId=X — single student
  .get("/:studentId", requireAuth, async (c) => {
    const examId = parseInt(c.req.query("examId") || "0");
    const studentId = parseInt(c.req.param("studentId"));
    if (!examId) return c.json({ error: "examId required" }, 400);

    const [exam] = await db.select().from(schema.exams).where(eq(schema.exams.id, examId));
    if (!exam) return c.json({ error: "Exam not found" }, 404);

    const [student] = await db.select().from(schema.students).where(eq(schema.students.id, studentId));
    if (!student) return c.json({ error: "Student not found" }, 404);

    const allResults = await db.select().from(schema.examResults).where(eq(schema.examResults.examId, examId));
    const studentResults = allResults.filter(r => r.studentId === studentId);
    const subjects = await db.select().from(schema.subjects).where(eq(schema.subjects.classId, exam.classId));
    const allStudents = await db.select().from(schema.students).where(eq(schema.students.classId, exam.classId));
    const classes = await db.select().from(schema.classes);
    const cls = classes.find(c => c.id === exam.classId);

    const subjectRows = subjects.map(sub => {
      const r = studentResults.find(r => r.subjectId === sub.id);
      const marks = r?.marks ?? null;
      const maxMarks = r?.maxMarks ?? 100;
      const pct = marks !== null ? Math.round((marks / maxMarks) * 100) : null;
      return {
        subjectId: sub.id,
        subjectName: sub.name,
        marks,
        maxMarks,
        percentage: pct,
        grade: pct !== null ? gradeFromPercent(pct) : "—",
        remarks: pct !== null ? remarksFromPercent(pct) : "—",
      };
    });

    const attempted = subjectRows.filter(s => s.marks !== null);
    const totalMarks = attempted.reduce((s, r) => s + (r.marks || 0), 0);
    const totalMax = attempted.reduce((s, r) => s + (r.maxMarks || 100), 0);
    const overallPct = totalMax > 0 ? Math.round((totalMarks / totalMax) * 100) : 0;

    // Compute position among all students in same exam/class
    const allScores = allStudents.map(s => {
      const sResults = allResults.filter(r => r.studentId === s.id);
      const sm = sResults.reduce((acc, r) => acc + (r.marks || 0), 0);
      const smx = sResults.reduce((acc, r) => acc + (r.maxMarks || 100), 0);
      return { studentId: s.id, pct: smx > 0 ? (sm / smx) * 100 : 0 };
    }).sort((a, b) => b.pct - a.pct);

    const position = allScores.findIndex(s => s.studentId === studentId) + 1;
    const classSize = allStudents.length;

    return c.json({
      reportCard: {
        student,
        class: cls,
        exam,
        subjects: subjectRows,
        totalMarks,
        totalMax,
        overallPercentage: overallPct,
        overallGrade: gradeFromPercent(overallPct),
        overallRemarks: remarksFromPercent(overallPct),
        position,
        classSize,
      }
    }, 200);
  });

export default reportCardsRoutes;
