import { eq } from "drizzle-orm";
import { client, db } from "../database";
import * as schema from "../database/schema";

const CLEAR_ORDER = [
  "library_borrows",
  "transport_assignments",
  "exam_results",
  "fee_payments",
  "attendance",
  "staff_attendance",
  "payroll",
  "certificates",
  "timetable_slots",
  "messages",
  "transactions",
  "subjects",
  "students",
  "sections",
  "fee_structures",
  "exams",
  "transport_routes",
  "library_books",
  "inventory_items",
  "staff",
  "classes",
] as const;

type RegistryTable = (typeof CLEAR_ORDER)[number];

async function ensureRegistry() {
  await client.execute(`
    CREATE TABLE IF NOT EXISTS demo_seed_registry (
      batch_id TEXT NOT NULL,
      table_name TEXT NOT NULL,
      row_id INTEGER NOT NULL,
      PRIMARY KEY (batch_id, table_name, row_id)
    )
  `);
}

async function registerRows(batchId: string, tableName: RegistryTable, rows: Array<{ id: number }>) {
  for (const row of rows) {
    await client.execute({
      sql: "INSERT OR IGNORE INTO demo_seed_registry (batch_id, table_name, row_id) VALUES (?, ?, ?)",
      args: [batchId, tableName, row.id],
    });
  }
}

async function clearBatch(batchId: string) {
  await ensureRegistry();
  for (const tableName of CLEAR_ORDER) {
    const registered = await client.execute({
      sql: "SELECT row_id FROM demo_seed_registry WHERE batch_id = ? AND table_name = ? ORDER BY row_id DESC",
      args: [batchId, tableName],
    });
    for (const row of registered.rows) {
      await client.execute({
        sql: `DELETE FROM ${tableName} WHERE id = ?`,
        args: [Number(row.row_id)],
      });
    }
  }
  await client.execute({
    sql: "DELETE FROM demo_seed_registry WHERE batch_id = ?",
    args: [batchId],
  });
}

function gradeFor(mark: number) {
  if (mark >= 80) return "A";
  if (mark >= 70) return "B";
  if (mark >= 60) return "C";
  if (mark >= 50) return "D";
  return "E";
}

function remarkFor(mark: number) {
  if (mark >= 80) return "Excellent";
  if (mark >= 70) return "Very good";
  if (mark >= 60) return "Good progress";
  if (mark >= 50) return "Fair";
  return "Needs support";
}

async function seedDemoData(batchId: string) {
  await clearBatch(batchId);

  const [teacherUser] = await db
    .select({ id: schema.user.id })
    .from(schema.user)
    .where(eq(schema.user.email, "teacher@vineyard.school"))
    .limit(1);

  if (!teacherUser) {
    throw new Error("Teacher login account is required before demo data can be seeded");
  }

  const demoStaff = await db.insert(schema.staff).values([
    { name: "Grace Wanjiku", email: "grace.wanjiku@example.com", phone: "+254 700 000 401", designation: "Teacher", department: "Languages", qualification: "B.Ed. Languages", joiningDate: "2022-01-10", salary: 52000, status: "active" },
    { name: "Daniel Otieno", email: "daniel.otieno@example.com", phone: "+254 700 000 402", designation: "Teacher", department: "Mathematics", qualification: "B.Ed. Mathematics", joiningDate: "2021-05-03", salary: 55000, status: "active" },
    { name: "Amina Hassan", email: "amina.hassan@example.com", phone: "+254 700 000 403", designation: "Teacher", department: "Science", qualification: "B.Ed. Science", joiningDate: "2023-01-09", salary: 54000, status: "active" },
    { name: "Peter Mwangi", email: "peter.mwangi@example.com", phone: "+254 700 000 404", designation: "Other", department: "Library", qualification: "Diploma in Library Studies", joiningDate: "2022-09-01", salary: 38000, status: "active" },
    { name: "Lucy Njeri", email: "lucy.njeri@example.com", phone: "+254 700 000 405", designation: "Other", department: "Transport", qualification: "Operations Certificate", joiningDate: "2021-02-15", salary: 40000, status: "active" },
  ]).returning();
  await registerRows(batchId, "staff", demoStaff);

  const [grace, daniel, amina, , lucy] = demoStaff;

  const demoClasses = await db.insert(schema.classes).values([
    { name: "Grade 4 Blue", level: "primary", teacherUserId: null },
    { name: "Grade 5 Green", level: "primary", teacherUserId: teacherUser.id },
    { name: "Grade 6 Gold", level: "primary", teacherUserId: null },
  ]).returning();
  await registerRows(batchId, "classes", demoClasses);

  const [grade4, grade5, grade6] = demoClasses;

  const demoSections = await db.insert(schema.sections).values([
    { classId: grade4.id, name: "Blue", teacherId: grace.id },
    { classId: grade5.id, name: "Green", teacherId: daniel.id },
    { classId: grade6.id, name: "Gold", teacherId: amina.id },
  ]).returning();
  await registerRows(batchId, "sections", demoSections);

  const sectionByClass = new Map([
    [grade4.id, demoSections[0].id],
    [grade5.id, demoSections[1].id],
    [grade6.id, demoSections[2].id],
  ]);

  const subjectTemplates = [
    { name: "Mathematics", code: "MAT", teacherId: daniel.id },
    { name: "English", code: "ENG", teacherId: grace.id },
    { name: "Kiswahili", code: "KIS", teacherId: grace.id },
    { name: "Science & Technology", code: "SCI", teacherId: amina.id },
    { name: "Social Studies", code: "SST", teacherId: amina.id },
  ];

  const demoSubjects = await db.insert(schema.subjects).values(
    demoClasses.flatMap((cls) => subjectTemplates.map((subject) => ({
      classId: cls.id,
      name: subject.name,
      code: `${subject.code}-${cls.id}`,
      teacherId: subject.teacherId,
    }))),
  ).returning();
  await registerRows(batchId, "subjects", demoSubjects);

  const studentTemplates = [
    ["Amani Kamau", "2016-03-14", "male", "Miriam Kamau", "Kilimani"],
    ["Zuri Wambui", "2016-07-09", "female", "John Wambui", "South B"],
    ["Ethan Kiptoo", "2016-11-21", "male", "Faith Kiptoo", "Lang'ata"],
    ["Neema Achieng", "2016-01-28", "female", "David Ochieng", "Lavington"],
    ["Liam Mutiso", "2016-05-06", "male", "Mercy Mutiso", "Ngong Road"],
    ["Imani Cherono", "2016-09-17", "female", "Paul Cherono", "Kileleshwa"],
    ["Brian Mwangi", "2015-02-11", "male", "Esther Mwangi", "Kilimani"],
    ["Faith Njeri", "2015-06-23", "female", "James Njoroge", "South C"],
    ["Kelvin Otieno", "2015-10-02", "male", "Rose Otieno", "Lang'ata"],
    ["Leila Hassan", "2015-04-19", "female", "Ahmed Hassan", "Hurlingham"],
    ["Mark Kariuki", "2015-08-30", "male", "Jane Kariuki", "Kileleshwa"],
    ["Sheila Atieno", "2015-12-08", "female", "Samuel Onyango", "Ngong Road"],
    ["Collins Maina", "2014-01-16", "male", "Mary Maina", "Kilimani"],
    ["Diana Wairimu", "2014-05-27", "female", "Peter Wairimu", "South B"],
    ["Felix Omondi", "2014-09-04", "male", "Agnes Omondi", "Lang'ata"],
    ["Gloria Chebet", "2014-02-22", "female", "Joseph Chebet", "Lavington"],
    ["Ian Musyoka", "2014-07-13", "male", "Sarah Musyoka", "Kileleshwa"],
    ["Joy Muthoni", "2014-11-29", "female", "Martin Muthoni", "Hurlingham"],
  ] as const;

  const classCycle = [grade4, grade5, grade6];
  const demoStudents = await db.insert(schema.students).values(
    studentTemplates.map((student, index) => {
      const cls = classCycle[Math.floor(index / 6)];
      const serial = String(index + 1).padStart(3, "0");
      return {
        admissionNo: `DEMO/VPA/2026/${serial}`,
        name: student[0],
        dob: student[1],
        gender: student[2],
        classId: cls.id,
        sectionId: sectionByClass.get(cls.id) ?? null,
        parentName: student[3],
        parentPhone: `+254 700 000 ${String(index + 101).padStart(3, "0")}`,
        parentEmail: `parent${serial}@example.com`,
        address: student[4],
        admissionDate: index < 12 ? "2024-01-15" : "2023-01-16",
        status: "active",
      };
    }),
  ).returning();
  await registerRows(batchId, "students", demoStudents);

  const attendanceDates = ["2026-08-17", "2026-08-18", "2026-08-19", "2026-08-20", "2026-08-21", "2026-08-24", "2026-08-25", "2026-08-26"];
  const demoAttendance = await db.insert(schema.attendance).values(
    demoStudents.flatMap((student, studentIndex) => attendanceDates.map((date, dateIndex) => {
      let status = "present";
      if ((studentIndex + dateIndex) % 17 === 0) status = "absent";
      else if ((studentIndex * 2 + dateIndex) % 13 === 0) status = "late";
      else if ((studentIndex + dateIndex * 3) % 29 === 0) status = "leave";
      return {
        studentId: student.id,
        classId: student.classId!,
        date,
        status,
        markedBy: student.classId === grade4.id ? grace.id : student.classId === grade5.id ? daniel.id : amina.id,
      };
    })),
  ).returning();
  await registerRows(batchId, "attendance", demoAttendance);

  const demoStaffAttendance = await db.insert(schema.staffAttendance).values(
    demoStaff.flatMap((member, staffIndex) => ["2026-08-24", "2026-08-25", "2026-08-26"].map((date, dateIndex) => ({
      staffId: member.id,
      date,
      status: (staffIndex + dateIndex) % 11 === 0 ? "late" : "present",
    }))),
  ).returning();
  await registerRows(batchId, "staff_attendance", demoStaffAttendance);

  const feeTemplates = [
    { name: "Tuition", amountByClass: [18000, 19000, 20000] },
    { name: "Meals", amountByClass: [6000, 6000, 6000] },
    { name: "Activities", amountByClass: [2500, 2500, 2500] },
  ];
  const demoFeeStructures = await db.insert(schema.feeStructures).values(
    demoClasses.flatMap((cls, classIndex) => feeTemplates.map((fee) => ({ classId: cls.id, name: fee.name, amount: fee.amountByClass[classIndex], frequency: "termly" }))),
  ).returning();
  await registerRows(batchId, "fee_structures", demoFeeStructures);

  const feesByClass = new Map<number, typeof demoFeeStructures>();
  for (const cls of demoClasses) feesByClass.set(cls.id, demoFeeStructures.filter((fee) => fee.classId === cls.id));

  const paymentMethods = ["mpesa", "bank", "cash"] as const;
  const demoFeePayments = await db.insert(schema.feePayments).values(
    demoStudents.flatMap((student, studentIndex) => (feesByClass.get(student.classId!) ?? []).map((fee, feeIndex) => {
      const ratios = [1, 0.75, 0.5, 0.9];
      const ratio = ratios[(studentIndex + feeIndex) % ratios.length];
      const paidAmount = Math.round(Number(fee.amount) * ratio);
      const discount = (studentIndex + feeIndex) % 10 === 0 ? 500 : 0;
      return {
        studentId: student.id,
        feeStructureId: fee.id,
        amount: Number(fee.amount),
        discount,
        paidAmount,
        balance: Math.max(0, Number(fee.amount) - paidAmount - discount),
        paymentDate: `2026-08-${String(3 + ((studentIndex + feeIndex) % 19)).padStart(2, "0")}`,
        paymentMethod: paymentMethods[(studentIndex + feeIndex) % paymentMethods.length],
        term: "Term 3",
        receiptNo: `DEMO-RCP-${String(studentIndex + 1).padStart(3, "0")}-${feeIndex + 1}`,
        notes: "Sales-demo payment record",
        collectedBy: null,
      };
    })),
  ).returning();
  await registerRows(batchId, "fee_payments", demoFeePayments);

  const demoExams = await db.insert(schema.exams).values(
    demoClasses.map((cls) => ({ name: "Term 2 End-Term Assessment", classId: cls.id, term: "Term 2", year: 2026, startDate: "2026-07-13", endDate: "2026-07-17" })),
  ).returning();
  await registerRows(batchId, "exams", demoExams);

  const examByClass = new Map(demoExams.map((exam) => [exam.classId, exam]));
  const subjectsByClass = new Map(demoClasses.map((cls) => [cls.id, demoSubjects.filter((subject) => subject.classId === cls.id)]));
  const demoResults = await db.insert(schema.examResults).values(
    demoStudents.flatMap((student, studentIndex) => {
      const exam = examByClass.get(student.classId!);
      const subjects = subjectsByClass.get(student.classId!) ?? [];
      if (!exam) return [];
      return subjects.map((subject, subjectIndex) => {
        const mark = 54 + ((studentIndex * 7 + subjectIndex * 9) % 43);
        return { examId: exam.id, studentId: student.id, subjectId: subject.id, marks: mark, maxMarks: 100, grade: gradeFor(mark), remarks: remarkFor(mark) };
      });
    }),
  ).returning();
  await registerRows(batchId, "exam_results", demoResults);

  const demoPayroll = await db.insert(schema.payroll).values(
    demoStaff.flatMap((member, memberIndex) => {
      const base = Number(member.salary || 0);
      const allowances = memberIndex < 3 ? 3500 : 2500;
      const deductions = 1200 + memberIndex * 150;
      return [
        { staffId: member.id, month: "July", year: 2026, basicSalary: base, allowances, deductions, netSalary: base + allowances - deductions, paidDate: "2026-07-30", status: "paid" },
        { staffId: member.id, month: "August", year: 2026, basicSalary: base, allowances, deductions, netSalary: base + allowances - deductions, paidDate: null, status: "pending" },
      ];
    }),
  ).returning();
  await registerRows(batchId, "payroll", demoPayroll);

  const demoCertificates = await db.insert(schema.certificates).values([
    { studentId: demoStudents[6].id, type: "bonafide", issuedDate: "2026-08-08", issuedBy: grace.id, notes: "Demo certificate for scholarship application" },
    { studentId: demoStudents[13].id, type: "character", issuedDate: "2026-08-14", issuedBy: daniel.id, notes: "Demo character certificate" },
  ]).returning();
  await registerRows(batchId, "certificates", demoCertificates);

  const demoTransactions = await db.insert(schema.transactions).values([
    { type: "income", category: "School Fees", amount: 145000, description: "Term 3 fee collections", date: "2026-08-03", paymentMethod: "M-Pesa", reference: "DEMO-TXN-001", createdBy: null },
    { type: "income", category: "Donations", amount: 35000, description: "PTA learning resources contribution", date: "2026-08-05", paymentMethod: "Bank Transfer", reference: "DEMO-TXN-002", createdBy: null },
    { type: "expense", category: "Utilities", amount: 18200, description: "Electricity and water", date: "2026-08-07", paymentMethod: "Bank Transfer", reference: "DEMO-TXN-003", createdBy: null },
    { type: "expense", category: "Supplies", amount: 32800, description: "Exercise books and classroom supplies", date: "2026-08-10", paymentMethod: "M-Pesa", reference: "DEMO-TXN-004", createdBy: null },
    { type: "income", category: "School Fees", amount: 98000, description: "Mid-month fee collections", date: "2026-08-14", paymentMethod: "M-Pesa", reference: "DEMO-TXN-005", createdBy: null },
    { type: "expense", category: "Transport", amount: 22400, description: "School bus maintenance", date: "2026-08-17", paymentMethod: "Bank Transfer", reference: "DEMO-TXN-006", createdBy: lucy.id },
    { type: "expense", category: "Maintenance", amount: 12600, description: "Classroom repairs", date: "2026-08-19", paymentMethod: "Cash", reference: "DEMO-TXN-007", createdBy: null },
    { type: "income", category: "Other Income", amount: 12000, description: "School activity contribution", date: "2026-08-21", paymentMethod: "M-Pesa", reference: "DEMO-TXN-008", createdBy: null },
    { type: "expense", category: "Events", amount: 9500, description: "Parents meeting refreshments", date: "2026-08-24", paymentMethod: "Cash", reference: "DEMO-TXN-009", createdBy: null },
    { type: "expense", category: "Supplies", amount: 7800, description: "Science practical materials", date: "2026-08-25", paymentMethod: "M-Pesa", reference: "DEMO-TXN-010", createdBy: amina.id },
  ]).returning();
  await registerRows(batchId, "transactions", demoTransactions);

  const timetableSubjects = ["Mathematics", "English", "Kiswahili", "Science & Technology"];
  const demoTimetable = await db.insert(schema.timetableSlots).values(
    ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"].flatMap((day) => timetableSubjects.map((subject, periodIndex) => ({
      classId: grade5.id,
      day,
      period: periodIndex + 1,
      subject,
      teacherId: subject === "Mathematics" ? daniel.id : subject === "Science & Technology" ? amina.id : grace.id,
      startTime: ["08:00", "09:00", "10:20", "11:20"][periodIndex],
      endTime: ["08:50", "09:50", "11:10", "12:10"][periodIndex],
    }))),
  ).returning();
  await registerRows(batchId, "timetable_slots", demoTimetable);

  const demoMessages = await db.insert(schema.messages).values([
    { subject: "Term 3 opening reminder", body: "Welcome back. Please ensure learners report with all required books and updated fee statements.", recipientType: "all", recipientId: null, sentBy: grace.id },
    { subject: "Grade 5 parent meeting", body: "Grade 5 parents are invited for the academic progress meeting on Friday at 3:30 PM.", recipientType: "class", recipientId: grade5.id, sentBy: daniel.id },
    { subject: "Science project materials", body: "Learners should bring recycled materials for the Science & Technology project next week.", recipientType: "class", recipientId: grade6.id, sentBy: amina.id },
  ]).returning();
  await registerRows(batchId, "messages", demoMessages);

  const demoRoutes = await db.insert(schema.transportRoutes).values([
    { name: "Kilimani - Hurlingham", vehicle: "School Bus 1", driver: "John Karanja", driverPhone: "+254 700 000 501", fee: 4500 },
    { name: "Lang'ata - South C", vehicle: "School Bus 2", driver: "Mary Akinyi", driverPhone: "+254 700 000 502", fee: 5000 },
    { name: "Kileleshwa - Lavington", vehicle: "School Van 1", driver: "Samuel Muriuki", driverPhone: "+254 700 000 503", fee: 4000 },
  ]).returning();
  await registerRows(batchId, "transport_routes", demoRoutes);

  const demoAssignments = await db.insert(schema.transportAssignments).values(
    demoStudents.slice(0, 12).map((student, index) => ({ studentId: student.id, routeId: demoRoutes[index % demoRoutes.length].id, term: "Term 3", year: 2026 })),
  ).returning();
  await registerRows(batchId, "transport_assignments", demoAssignments);

  const demoBooks = await db.insert(schema.libraryBooks).values([
    { title: "East African Science Explorer", author: "Demo Learning Press", isbn: "DEMO-ISBN-001", category: "Science", copies: 8, available: 6 },
    { title: "Mathematics Practice Book 5", author: "Demo Learning Press", isbn: "DEMO-ISBN-002", category: "Mathematics", copies: 10, available: 9 },
    { title: "Hadithi za Kiswahili", author: "Demo Learning Press", isbn: "DEMO-ISBN-003", category: "Kiswahili", copies: 7, available: 6 },
    { title: "Young Readers: African Stories", author: "Demo Learning Press", isbn: "DEMO-ISBN-004", category: "English", copies: 12, available: 10 },
    { title: "Our Environment and Community", author: "Demo Learning Press", isbn: "DEMO-ISBN-005", category: "Social Studies", copies: 6, available: 5 },
    { title: "Creative Arts Workbook", author: "Demo Learning Press", isbn: "DEMO-ISBN-006", category: "Creative Arts", copies: 5, available: 5 },
    { title: "Digital Literacy Basics", author: "Demo Learning Press", isbn: "DEMO-ISBN-007", category: "ICT", copies: 6, available: 5 },
    { title: "Health and Life Skills", author: "Demo Learning Press", isbn: "DEMO-ISBN-008", category: "Life Skills", copies: 6, available: 6 },
  ]).returning();
  await registerRows(batchId, "library_books", demoBooks);

  const demoBorrows = await db.insert(schema.libraryBorrows).values([
    { bookId: demoBooks[0].id, studentId: demoStudents[1].id, borrowDate: "2026-08-18", dueDate: "2026-09-01", returnDate: null, status: "borrowed" },
    { bookId: demoBooks[1].id, studentId: demoStudents[7].id, borrowDate: "2026-08-19", dueDate: "2026-09-02", returnDate: null, status: "borrowed" },
    { bookId: demoBooks[2].id, studentId: demoStudents[10].id, borrowDate: "2026-08-12", dueDate: "2026-08-26", returnDate: "2026-08-25", status: "returned" },
    { bookId: demoBooks[3].id, studentId: demoStudents[15].id, borrowDate: "2026-08-20", dueDate: "2026-09-03", returnDate: null, status: "borrowed" },
    { bookId: demoBooks[4].id, studentId: demoStudents[4].id, borrowDate: "2026-08-10", dueDate: "2026-08-24", returnDate: null, status: "overdue" },
    { bookId: demoBooks[6].id, studentId: demoStudents[16].id, borrowDate: "2026-08-21", dueDate: "2026-09-04", returnDate: null, status: "borrowed" },
  ]).returning();
  await registerRows(batchId, "library_borrows", demoBorrows);

  const demoInventory = await db.insert(schema.inventoryItems).values([
    { name: "Student desks", category: "Furniture", quantity: 48, condition: "good", location: "Grade 4-6 classrooms", purchaseDate: "2025-01-10", notes: "Demo inventory record" },
    { name: "Teacher chairs", category: "Furniture", quantity: 12, condition: "good", location: "Staff room", purchaseDate: "2025-01-10", notes: "Demo inventory record" },
    { name: "Chromebooks", category: "ICT", quantity: 20, condition: "good", location: "ICT room", purchaseDate: "2026-02-12", notes: "18 in class use, 2 spare" },
    { name: "Projectors", category: "ICT", quantity: 4, condition: "good", location: "Resource room", purchaseDate: "2025-09-05", notes: "Demo inventory record" },
    { name: "Football kits", category: "Sports", quantity: 24, condition: "fair", location: "Sports store", purchaseDate: "2024-05-20", notes: "Replace 6 jerseys next term" },
    { name: "Science experiment kits", category: "Laboratory", quantity: 8, condition: "good", location: "Science room", purchaseDate: "2026-01-22", notes: "Demo inventory record" },
    { name: "First aid kits", category: "Health", quantity: 5, condition: "good", location: "Office and school buses", purchaseDate: "2026-03-02", notes: "Check expiry monthly" },
    { name: "Library shelves", category: "Furniture", quantity: 10, condition: "good", location: "Library", purchaseDate: "2023-11-15", notes: "Demo inventory record" },
  ]).returning();
  await registerRows(batchId, "inventory_items", demoInventory);

  console.log(`[Demo data] seeded batch ${batchId}: ${demoStudents.length} students, ${demoStaff.length} staff, ${demoClasses.length} classes`);
}

export async function runDemoDataOperation() {
  const operationId = String(process.env.DEMO_DATA_OPERATION_ID || "").trim();
  const action = String(process.env.DEMO_DATA_ACTION || "").trim().toLowerCase();
  const batchId = String(process.env.DEMO_DATA_BATCH_ID || "sales-demo-2026").trim();

  if (!operationId && !action) return;
  if (!operationId) throw new Error("DEMO_DATA_OPERATION_ID is required when DEMO_DATA_ACTION is set");
  if (!batchId) throw new Error("DEMO_DATA_BATCH_ID cannot be empty");
  if (action !== "seed" && action !== "clear") throw new Error("DEMO_DATA_ACTION must be either seed or clear");

  await ensureRegistry();
  const marker = `demo-data:${operationId}`;
  const alreadyApplied = await client.execute({ sql: "SELECT id FROM app_migrations WHERE id = ? LIMIT 1", args: [marker] });
  if (alreadyApplied.rows.length > 0) {
    console.log(`[Demo data] operation ${operationId} already applied; skipping`);
    return;
  }

  if (action === "seed") {
    await seedDemoData(batchId);
  } else {
    await clearBatch(batchId);
    console.log(`[Demo data] cleared batch ${batchId}`);
  }

  await client.execute({ sql: "INSERT INTO app_migrations (id) VALUES (?)", args: [marker] });
}
