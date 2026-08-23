import { Hono } from "hono";
import { db } from "../database";
import * as schema from "../database/schema";
import { eq } from "drizzle-orm";
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

async function roleOf(userId: string) {
  const [profile] = await db.select().from(schema.userProfiles).where(eq(schema.userProfiles.userId, userId));
  return profile?.role ?? "teacher";
}

async function teacherClassIds(userId: string) {
  const classes = await db.select().from(schema.classes);
  return classes.filter((cls) => cls.teacherUserId === userId).map((cls) => cls.id);
}

async function canAccessClass(userId: string, role: string, classId: number) {
  if (role === "admin" || role === "principal") return true;
  if (role !== "teacher") return false;
  const classIds = await teacherClassIds(userId);
  return classIds.includes(classId);
}

const reportStudent = (student: any) => ({
  id: student.id,
  admissionNo: student.admissionNo,
  name: student.name,
  gender: student.gender,
  classId: student.classId,
});

const reportClass = (cls: any) => cls ? { id: cls.id, name: cls.name } : null;

const reportExam = (exam: any) => ({
  id: exam.id,
  name: exam.name,
  classId: exam.classId,
  term: exam.term,
  year: exam.year,
  startDate: exam.startDate,
  endDate: exam.endDate,
});

function buildSubjectRows(subjects: any[], studentResults: any[]) {
  return subjects.map((sub) => {
    const result = studentResults.find((row) => row.subjectId === sub.id);
    const marks = result?.marks ?? null;
    const maxMarks = result?.maxMarks ?? 100;
    const percentage = marks !== null && maxMarks > 0 ? Math.round((marks / maxMarks) * 100) : null;
    return {
      subjectId: sub.id,
      subjectName: sub.name,
      marks,
      maxMarks,
      percentage,
      grade: percentage !== null ? gradeFromPercent(percentage) : "—",
      remarks: percentage !== null ? remarksFromPercent(percentage) : "—",
    };
  });
}

function scoreSubjectRows(subjectRows: any[]) {
  const attempted = subjectRows.filter((row) => row.marks !== null);
  const totalMarks = attempted.reduce((sum, row) => sum + Number(row.marks || 0), 0);
  const totalMax = attempted.reduce((sum, row) => sum + Number(row.maxMarks || 100), 0);
  const overallPercentage = totalMax > 0 ? Math.round((totalMarks / totalMax) * 100) : 0;
  return {
    totalMarks,
    totalMax,
    overallPercentage,
    overallGrade: gradeFromPercent(overallPercentage),
    overallRemarks: remarksFromPercent(overallPercentage),
  };
}

export const reportCardsRoutes = new Hono()
  // GET /report-cards?examId=X — all report cards for an authorized exam class.
  .get("/", requireAuth, async (c) => {
    const user = c.get("user")!;
    const role = await roleOf(user.id);
    if (!["admin", "principal", "teacher"].includes(role)) return c.json({ message: "Forbidden" }, 403);

    const examId = parseInt(c.req.query("examId") || "0");
    if (!examId) return c.json({ message: "examId required" }, 400);

    const [exam] = await db.select().from(schema.exams).where(eq(schema.exams.id, examId));
    if (!exam) return c.json({ message: "Exam not found" }, 404);
    if (!(await canAccessClass(user.id, role, exam.classId))) {
      return c.json({ message: "Forbidden: exam is outside your assigned class" }, 403);
    }

    const results = await db.select().from(schema.examResults).where(eq(schema.examResults.examId, examId));
    const students = await db.select().from(schema.students).where(eq(schema.students.classId, exam.classId));
    const subjects = await db.select().from(schema.subjects).where(eq(schema.subjects.classId, exam.classId));
    const [cls] = await db.select().from(schema.classes).where(eq(schema.classes.id, exam.classId));

    const reports = students.map((student) => {
      const subjectRows = buildSubjectRows(subjects, results.filter((row) => row.studentId === student.id));
      const score = scoreSubjectRows(subjectRows);
      return {
        student: reportStudent(student),
        class: reportClass(cls),
        exam: reportExam(exam),
        subjects: subjectRows,
        ...score,
      };
    });

    const ranked = [...reports].sort((a, b) => b.overallPercentage - a.overallPercentage);
    const positionByStudent = new Map(ranked.map((report, index) => [report.student.id, index + 1]));
    const classSize = students.length;

    const finalReports = reports.map((report) => ({
      ...report,
      position: positionByStudent.get(report.student.id) ?? 0,
      classSize,
    }));

    return c.json({ reportCards: finalReports, exam: reportExam(exam), class: reportClass(cls) }, 200);
  })

  // GET /report-cards/:studentId?examId=X — single student in that exam's class.
  .get("/:studentId", requireAuth, async (c) => {
    const user = c.get("user")!;
    const role = await roleOf(user.id);
    if (!["admin", "principal", "teacher"].includes(role)) return c.json({ message: "Forbidden" }, 403);

    const examId = parseInt(c.req.query("examId") || "0");
    const studentId = parseInt(c.req.param("studentId"));
    if (!examId || !Number.isInteger(studentId) || studentId <= 0) {
      return c.json({ message: "Valid examId and studentId are required" }, 400);
    }

    const [exam] = await db.select().from(schema.exams).where(eq(schema.exams.id, examId));
    if (!exam) return c.json({ message: "Exam not found" }, 404);
    if (!(await canAccessClass(user.id, role, exam.classId))) {
      return c.json({ message: "Forbidden: exam is outside your assigned class" }, 403);
    }

    const [student] = await db.select().from(schema.students).where(eq(schema.students.id, studentId));
    if (!student) return c.json({ message: "Student not found" }, 404);
    if (student.classId !== exam.classId) {
      return c.json({ message: "Student does not belong to this exam's class" }, 400);
    }

    const allResults = await db.select().from(schema.examResults).where(eq(schema.examResults.examId, examId));
    const subjects = await db.select().from(schema.subjects).where(eq(schema.subjects.classId, exam.classId));
    const allStudents = await db.select().from(schema.students).where(eq(schema.students.classId, exam.classId));
    const [cls] = await db.select().from(schema.classes).where(eq(schema.classes.id, exam.classId));

    const subjectRows = buildSubjectRows(subjects, allResults.filter((row) => row.studentId === studentId));
    const score = scoreSubjectRows(subjectRows);

    const allScores = allStudents.map((classStudent) => {
      const rows = buildSubjectRows(subjects, allResults.filter((result) => result.studentId === classStudent.id));
      return { studentId: classStudent.id, percentage: scoreSubjectRows(rows).overallPercentage };
    }).sort((a, b) => b.percentage - a.percentage);

    const position = allScores.findIndex((row) => row.studentId === studentId) + 1;

    return c.json({
      reportCard: {
        student: reportStudent(student),
        class: reportClass(cls),
        exam: reportExam(exam),
        subjects: subjectRows,
        ...score,
        position,
        classSize: allStudents.length,
      },
    }, 200);
  });

export default reportCardsRoutes;
