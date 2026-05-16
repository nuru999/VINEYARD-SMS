import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

// ─── AUTH (Better Auth) ──────────────────────────────────────────────────────
export * from "./auth-schema";

// ─── USERS / ROLES ───────────────────────────────────────────────────────────
export const userProfiles = sqliteTable("user_profiles", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: text("user_id").notNull().unique(),
  role: text("role").notNull().default("teacher"), // admin | teacher
  phone: text("phone"),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

// ─── CLASSES & SECTIONS ──────────────────────────────────────────────────────
export const classes = sqliteTable("classes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  level: text("level").notNull().default("primary"), // primary | secondary
  teacherId: integer("teacher_id"), // assigned class teacher (staff.id)
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

export const sections = sqliteTable("sections", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  classId: integer("class_id").notNull(),
  name: text("name").notNull(),
  teacherId: integer("teacher_id"),
});

// ─── SUBJECTS ────────────────────────────────────────────────────────────────
export const subjects = sqliteTable("subjects", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  classId: integer("class_id").notNull(),
  name: text("name").notNull(),
  code: text("code"),
  teacherId: integer("teacher_id"),
});

// ─── STAFF ───────────────────────────────────────────────────────────────────
export const staff = sqliteTable("staff", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: text("user_id"),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  designation: text("designation").notNull(), // Principal | Teacher | Accountant | Admin | Other
  department: text("department"),
  qualification: text("qualification"),
  joiningDate: text("joining_date"),
  salary: real("salary").default(0),
  status: text("status").notNull().default("active"), // active | inactive
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

// ─── STUDENTS ────────────────────────────────────────────────────────────────
export const students = sqliteTable("students", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  admissionNo: text("admission_no").notNull().unique(),
  name: text("name").notNull(),
  dob: text("dob"),
  gender: text("gender"),
  classId: integer("class_id"),
  sectionId: integer("section_id"),
  parentName: text("parent_name"),
  parentPhone: text("parent_phone"),
  parentEmail: text("parent_email"),
  address: text("address"),
  admissionDate: text("admission_date"),
  status: text("status").notNull().default("active"), // active | inactive | graduated | transferred
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

// ─── ATTENDANCE ───────────────────────────────────────────────────────────────
export const attendance = sqliteTable("attendance", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  studentId: integer("student_id").notNull(),
  classId: integer("class_id").notNull(),
  date: text("date").notNull(),
  status: text("status").notNull(), // present | absent | late | leave
  markedBy: integer("staff_id"),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

export const staffAttendance = sqliteTable("staff_attendance", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  staffId: integer("staff_id").notNull(),
  date: text("date").notNull(),
  status: text("status").notNull(), // present | absent | late | leave
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

// ─── FEES ────────────────────────────────────────────────────────────────────
export const feeStructures = sqliteTable("fee_structures", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  classId: integer("class_id").notNull(),
  name: text("name").notNull(),
  amount: real("amount").notNull(),
  frequency: text("frequency").notNull().default("monthly"), // monthly | termly | annual | once
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

export const feePayments = sqliteTable("fee_payments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  studentId: integer("student_id").notNull(),
  feeStructureId: integer("fee_structure_id"),
  amount: real("amount").notNull(),
  discount: real("discount").default(0),
  paidAmount: real("paid_amount").notNull(),
  balance: real("balance").default(0),
  paymentDate: text("payment_date").notNull(),
  paymentMethod: text("payment_method").default("cash"), // cash | mpesa | bank
  receiptNo: text("receipt_no"),
  notes: text("notes"),
  collectedBy: integer("staff_id"),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

// ─── EXAMS & RESULTS ─────────────────────────────────────────────────────────
export const exams = sqliteTable("exams", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  classId: integer("class_id").notNull(),
  term: text("term"),
  year: integer("year"),
  startDate: text("start_date"),
  endDate: text("end_date"),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

export const examResults = sqliteTable("exam_results", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  examId: integer("exam_id").notNull(),
  studentId: integer("student_id").notNull(),
  subjectId: integer("subject_id").notNull(),
  marks: real("marks"),
  maxMarks: real("max_marks").default(100),
  grade: text("grade"),
  remarks: text("remarks"),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

// ─── PAYROLL ─────────────────────────────────────────────────────────────────
export const payroll = sqliteTable("payroll", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  staffId: integer("staff_id").notNull(),
  month: text("month").notNull(),
  year: integer("year").notNull(),
  basicSalary: real("basic_salary").notNull(),
  allowances: real("allowances").default(0),
  deductions: real("deductions").default(0),
  netSalary: real("net_salary").notNull(),
  paidDate: text("paid_date"),
  status: text("status").notNull().default("pending"), // pending | paid
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

// ─── CERTIFICATES ────────────────────────────────────────────────────────────
export const certificates = sqliteTable("certificates", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  studentId: integer("student_id").notNull(),
  type: text("type").notNull(), // leaving | character | bonafide
  issuedDate: text("issued_date").notNull(),
  issuedBy: integer("staff_id"),
  notes: text("notes"),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

// ─── FINANCIAL ACCOUNTS ───────────────────────────────────────────────────────
export const transactions = sqliteTable("transactions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  type: text("type").notNull(), // income | expense
  category: text("category").notNull(),
  amount: real("amount").notNull(),
  description: text("description"),
  date: text("date").notNull(),
  reference: text("reference"),
  createdBy: integer("staff_id"),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

// ─── TIMETABLE ───────────────────────────────────────────────────────────────
export const timetableSlots = sqliteTable("timetable_slots", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  classId: integer("class_id").notNull(),
  day: text("day").notNull(), // Monday|Tuesday|Wednesday|Thursday|Friday
  period: integer("period").notNull(), // 1-8
  subject: text("subject").notNull(),
  teacherId: integer("teacher_id"),
  startTime: text("start_time"),
  endTime: text("end_time"),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

// ─── MESSAGES ────────────────────────────────────────────────────────────────
export const messages = sqliteTable("messages", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  recipientType: text("recipient_type").notNull(), // all | class | individual
  recipientId: integer("recipient_id"), // class_id or student_id if individual
  sentBy: integer("staff_id"),
  sentAt: integer("sent_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

// ─── TRANSPORT ───────────────────────────────────────────────────────────────
export const transportRoutes = sqliteTable("transport_routes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  vehicle: text("vehicle"),
  driver: text("driver"),
  driverPhone: text("driver_phone"),
  fee: real("fee").default(0),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

export const transportAssignments = sqliteTable("transport_assignments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  studentId: integer("student_id").notNull(),
  routeId: integer("route_id").notNull(),
  term: text("term").notNull(),
  year: integer("year").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

// ─── LIBRARY ─────────────────────────────────────────────────────────────────
export const libraryBooks = sqliteTable("library_books", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  author: text("author"),
  isbn: text("isbn"),
  category: text("category"),
  copies: integer("copies").notNull().default(1),
  available: integer("available").notNull().default(1),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

export const libraryBorrows = sqliteTable("library_borrows", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  bookId: integer("book_id").notNull(),
  studentId: integer("student_id").notNull(),
  borrowDate: text("borrow_date").notNull(),
  dueDate: text("due_date").notNull(),
  returnDate: text("return_date"),
  status: text("status").notNull().default("borrowed"), // borrowed | returned | overdue
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

// ─── INVENTORY ───────────────────────────────────────────────────────────────
export const inventoryItems = sqliteTable("inventory_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  category: text("category").notNull(),
  quantity: integer("quantity").notNull().default(1),
  condition: text("condition").notNull().default("good"), // good | fair | poor | damaged
  location: text("location"),
  purchaseDate: text("purchase_date"),
  notes: text("notes"),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});
