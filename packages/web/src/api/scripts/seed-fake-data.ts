import { createClient } from "@libsql/client";

const db = createClient({
  url: process.env.DATABASE_URL!,
  authToken: process.env.DATABASE_AUTH_TOKEN,
});

// ── helpers ──────────────────────────────────────────────────────────────────
const pick = <T>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];
const rnd = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;
const rndFloat = (min: number, max: number) =>
  parseFloat((Math.random() * (max - min) + min).toFixed(2));
const dateStr = (y: number, m: number, d: number) =>
  `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
const today = new Date();
const todayStr = today.toISOString().split("T")[0];
const now = Math.floor(Date.now() / 1000);

// ── names ────────────────────────────────────────────────────────────────────
const maleFirstNames = ["James","John","Robert","Michael","William","David","Joseph","Daniel","Samuel","Emmanuel","Brian","Kevin","Patrick","Timothy","George","Peter","Paul","Simon","Andrew","Philip"];
const femaleFirstNames = ["Mary","Sarah","Grace","Faith","Joy","Rachel","Ruth","Esther","Deborah","Miriam","Hannah","Lydia","Priscilla","Tabitha","Naomi","Leah","Rebecca","Abigail","Susan","Christine"];
const lastNames = ["Kariuki","Mwangi","Ochieng","Auma","Njoroge","Kamau","Otieno","Adhiambo","Wambui","Mutua","Kimani","Omondi","Wanjiku","Ndung'u","Gitau","Makau","Musyoki","Korir","Langat","Chebet"];

const maleName = () => `${pick(maleFirstNames)} ${pick(lastNames)}`;
const femaleName = () => `${pick(femaleFirstNames)} ${pick(lastNames)}`;
const anyName = (gender: "Male" | "Female") => gender === "Male" ? maleName() : femaleName();

const designations = ["Head Teacher","Deputy Head Teacher","Class Teacher","Subject Teacher","School Counselor","Librarian","Bursar","Sports Teacher","ICT Teacher","Music Teacher"];
const departments = ["Administration","Sciences","Mathematics","Languages","Humanities","Arts","Physical Education","Library","ICT","Finance"];
const qualifications = ["B.Ed (Primary)","B.Ed (Secondary)","B.Sc Education","Diploma in Education","M.Ed","PGDE","B.A Education","B.Com Education"];

async function clearData() {
  const tables = [
    "transactions","certificates","messages","timetable_slots",
    "transport_assignments","transport_routes","inventory_items",
    "library_borrows","library_books","payroll","fee_payments",
    "fee_structures","exam_results","exams","attendance",
    "subjects","sections","staff","students","classes",
  ];
  for (const t of tables) {
    await db.execute(`DELETE FROM ${t}`);
  }
  console.log("✓ cleared existing data");
}

async function seedClasses() {
  const classData = [
    { name: "Grade 1", level: "Primary" },
    { name: "Grade 2", level: "Primary" },
    { name: "Grade 3", level: "Primary" },
    { name: "Grade 4", level: "Primary" },
    { name: "Grade 5", level: "Primary" },
    { name: "Grade 6", level: "Primary" },
    { name: "Grade 7", level: "Junior Secondary" },
    { name: "Grade 8", level: "Junior Secondary" },
    { name: "Grade 9", level: "Junior Secondary" },
  ];
  for (const c of classData) {
    await db.execute({ sql: "INSERT INTO classes (name, level, created_at) VALUES (?,?,?)", args: [c.name, c.level, now] });
  }
  const rows = await db.execute("SELECT id, name FROM classes ORDER BY id");
  console.log(`✓ classes (${rows.rows.length})`);
  return rows.rows as { id: number; name: string }[];
}

async function seedStaff() {
  const staffList = [
    { name: "Mrs. Agnes Kariuki", email: "a.kariuki@vineyard.school", designation: "Head Teacher", department: "Administration", salary: 95000 },
    { name: "Mr. Peter Mwangi", email: "p.mwangi@vineyard.school", designation: "Deputy Head Teacher", department: "Administration", salary: 80000 },
    { name: "Ms. Grace Ochieng", email: "g.ochieng@vineyard.school", designation: "Class Teacher", department: "Sciences", salary: 55000 },
    { name: "Mr. Samuel Otieno", email: "s.otieno@vineyard.school", designation: "Subject Teacher", department: "Mathematics", salary: 52000 },
    { name: "Mrs. Faith Kamau", email: "f.kamau@vineyard.school", designation: "Class Teacher", department: "Languages", salary: 53000 },
    { name: "Mr. David Njoroge", email: "d.njoroge@vineyard.school", designation: "Subject Teacher", department: "Sciences", salary: 54000 },
    { name: "Ms. Ruth Wambui", email: "r.wambui@vineyard.school", designation: "Class Teacher", department: "Humanities", salary: 51000 },
    { name: "Mr. Joseph Kimani", email: "j.kimani@vineyard.school", designation: "ICT Teacher", department: "ICT", salary: 58000 },
    { name: "Mrs. Mary Mutua", email: "m.mutua@vineyard.school", designation: "Librarian", department: "Library", salary: 45000 },
    { name: "Mr. Paul Omondi", email: "p.omondi@vineyard.school", designation: "Sports Teacher", department: "Physical Education", salary: 48000 },
    { name: "Ms. Esther Gitau", email: "e.gitau@vineyard.school", designation: "Class Teacher", department: "Arts", salary: 50000 },
    { name: "Mr. Timothy Korir", email: "t.korir@vineyard.school", designation: "Bursar", department: "Finance", salary: 62000 },
  ];
  for (const s of staffList) {
    await db.execute({
      sql: "INSERT INTO staff (name, email, phone, designation, department, qualification, joining_date, salary, status, created_at) VALUES (?,?,?,?,?,?,?,?,?,?)",
      args: [s.name, s.email, `07${rnd(10,99)}${rnd(100000,999999)}`, s.designation, s.department, pick(qualifications), dateStr(rnd(2015,2022), rnd(1,12), rnd(1,28)), s.salary, "Active", now],
    });
  }
  const rows = await db.execute("SELECT id, name, salary FROM staff ORDER BY id");
  console.log(`✓ staff (${rows.rows.length})`);
  return rows.rows as { id: number; name: string; salary: number }[];
}

async function seedSections(classes: { id: number; name: string }[], staffList: { id: number }[]) {
  for (const cls of classes) {
    const sections = cls.id <= 3 ? ["A", "B"] : ["A"];
    for (const sec of sections) {
      const teacher = staffList[rnd(2, staffList.length - 1)];
      await db.execute({ sql: "INSERT INTO sections (class_id, name, teacher_id) VALUES (?,?,?)", args: [cls.id, sec, teacher.id] });
    }
  }
  const rows = await db.execute("SELECT id, class_id, name FROM sections ORDER BY id");
  console.log(`✓ sections (${rows.rows.length})`);
  return rows.rows as { id: number; class_id: number; name: string }[];
}

async function seedSubjects(classes: { id: number }[], staffList: { id: number }[]) {
  const subjectsByLevel = {
    primary: ["Mathematics","English","Kiswahili","Science","Social Studies","CRE","Creative Arts"],
    junior: ["Mathematics","English","Kiswahili","Integrated Science","Social Studies","CRE","Pre-Technical Studies","Agriculture","Business Studies","ICT"],
  };
  for (const cls of classes) {
    const subs = cls.id <= 6 ? subjectsByLevel.primary : subjectsByLevel.junior;
    for (const sub of subs) {
      const teacher = staffList[rnd(2, staffList.length - 1)];
      const code = sub.substring(0, 3).toUpperCase() + cls.id;
      await db.execute({ sql: "INSERT INTO subjects (class_id, name, code, teacher_id) VALUES (?,?,?,?)", args: [cls.id, sub, code, teacher.id] });
    }
  }
  const rows = await db.execute("SELECT id, class_id, name FROM subjects ORDER BY id");
  console.log(`✓ subjects (${rows.rows.length})`);
  return rows.rows as { id: number; class_id: number; name: string }[];
}

async function seedStudents(classes: { id: number }[], sections: { id: number; class_id: number }[]) {
  const sectionMap: Record<number, number[]> = {};
  for (const s of sections) {
    if (!sectionMap[s.class_id]) sectionMap[s.class_id] = [];
    sectionMap[s.class_id].push(s.id);
  }

  let admNo = 2018001;
  const students: { id: number; class_id: number }[] = [];

  for (const cls of classes) {
    const count = rnd(25, 38);
    for (let i = 0; i < count; i++) {
      const gender = pick(["Male", "Female"]) as "Male" | "Female";
      const name = anyName(gender);
      const sectionIds = sectionMap[cls.id] ?? [];
      const section_id = sectionIds.length ? pick(sectionIds) : null;
      const admYear = rnd(2018, 2024);
      await db.execute({
        sql: "INSERT INTO students (admission_no, name, dob, gender, class_id, section_id, parent_name, parent_phone, parent_email, address, admission_date, status, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)",
        args: [
          `VS/${admYear}/${String(admNo).slice(-3)}`,
          name,
          dateStr(rnd(2009, 2016), rnd(1, 12), rnd(1, 28)),
          gender,
          cls.id,
          section_id,
          anyName("Male"),
          `07${rnd(10,99)}${rnd(100000,999999)}`,
          `parent${admNo}@gmail.com`,
          `${rnd(1,99)} ${pick(lastNames)} Road, Nairobi`,
          dateStr(admYear, rnd(1, 8), rnd(1, 28)),
          pick(["Active","Active","Active","Active","Inactive"]),
          now,
        ],
      });
      admNo++;
    }
  }
  const rows = await db.execute("SELECT id, class_id FROM students ORDER BY id");
  rows.rows.forEach((r) => students.push({ id: r.id as number, class_id: r.class_id as number }));
  console.log(`✓ students (${students.length})`);
  return students;
}

async function seedAttendance(students: { id: number; class_id: number }[], staffList: { id: number }[]) {
  // Last 30 school days
  const dates: string[] = [];
  const d = new Date(today);
  while (dates.length < 30) {
    const day = d.getDay();
    if (day !== 0 && day !== 6) dates.push(d.toISOString().split("T")[0]);
    d.setDate(d.getDate() - 1);
  }

  let inserted = 0;
  for (const date of dates.slice(0, 10)) { // 10 days to avoid timeout
    for (const s of students) {
      const status = pick(["present","present","present","present","absent","late"]);
      const staff = staffList[rnd(2, staffList.length - 1)];
      await db.execute({
        sql: "INSERT INTO attendance (student_id, class_id, date, status, staff_id, created_at) VALUES (?,?,?,?,?,?)",
        args: [s.id, s.class_id, date, status, staff.id, now],
      });
      inserted++;
    }
  }
  console.log(`✓ attendance (${inserted} records)`);
}

async function seedExams(classes: { id: number }[], students: { id: number; class_id: number }[], subjects: { id: number; class_id: number }[]) {
  const terms = ["Term 1", "Term 2", "Term 3"];
  const examIds: number[] = [];

  for (const cls of classes) {
    for (const term of terms) {
      const year = 2025;
      const termNo = terms.indexOf(term) + 1;
      const startM = termNo === 1 ? 1 : termNo === 2 ? 5 : 9;
      const r = await db.execute({
        sql: "INSERT INTO exams (name, class_id, term, year, start_date, end_date, created_at) VALUES (?,?,?,?,?,?,?)",
        args: [`${term} Exam ${year}`, cls.id, term, year, dateStr(year, startM + 2, 1), dateStr(year, startM + 2, 14), now],
      });
      examIds.push(Number(r.lastInsertRowid));
    }
  }

  // Results — only Term 1 & 2
  const exams = await db.execute("SELECT id, class_id, term FROM exams WHERE year = 2025 AND term != 'Term 3'");
  const classSubjects: Record<number, number[]> = {};
  for (const s of subjects) {
    if (!classSubjects[s.class_id]) classSubjects[s.class_id] = [];
    classSubjects[s.class_id].push(s.id);
  }

  let resultCount = 0;
  for (const exam of exams.rows) {
    const classStudents = students.filter((s) => s.class_id === exam.class_id);
    const subs = classSubjects[exam.class_id as number] ?? [];
    for (const student of classStudents.slice(0, 20)) { // cap to avoid huge insert
      for (const subId of subs.slice(0, 5)) {
        const marks = rndFloat(30, 100);
        const grade = marks >= 80 ? "A" : marks >= 70 ? "B" : marks >= 60 ? "C" : marks >= 50 ? "D" : "E";
        await db.execute({
          sql: "INSERT INTO exam_results (exam_id, student_id, subject_id, marks, max_marks, grade, remarks, created_at) VALUES (?,?,?,?,?,?,?,?)",
          args: [exam.id, student.id, subId, marks, 100, grade, grade === "A" ? "Excellent" : grade === "B" ? "Good" : grade === "C" ? "Average" : "Needs improvement", now],
        });
        resultCount++;
      }
    }
  }
  console.log(`✓ exams (${exams.rows.length} exams, ${resultCount} results)`);
}

async function seedFees(classes: { id: number }[], students: { id: number; class_id: number }[], staffList: { id: number }[]) {
  // Fee structures per class
  const feeTypes = [
    { name: "Tuition Fee", amounts: [8500, 9000, 9500, 10000, 10500, 11000, 12000, 12500, 13000], freq: "Termly" },
    { name: "Activity Fee", amounts: [1500, 1500, 1500, 2000, 2000, 2000, 2500, 2500, 2500], freq: "Termly" },
    { name: "Lunch Fee", amounts: [3000, 3000, 3000, 3000, 3000, 3000, 3500, 3500, 3500], freq: "Monthly" },
  ];

  const structIds: { id: number; class_id: number; amount: number }[] = [];
  for (let i = 0; i < classes.length; i++) {
    const cls = classes[i];
    for (const ft of feeTypes) {
      const r = await db.execute({
        sql: "INSERT INTO fee_structures (class_id, name, amount, frequency, created_at) VALUES (?,?,?,?,?)",
        args: [cls.id, ft.name, ft.amounts[i], ft.freq, now],
      });
      structIds.push({ id: Number(r.lastInsertRowid), class_id: cls.id, amount: ft.amounts[i] });
    }
  }

  // Payments — 70% of students have paid
  let payCount = 0;
  const methods = ["Cash","M-Pesa","Bank Transfer","Cheque"];
  const bursar = staffList[staffList.length - 1];
  for (const student of students) {
    if (Math.random() > 0.3) {
      const structs = structIds.filter((s) => s.class_id === student.class_id).slice(0, 2);
      for (const struct of structs) {
        const paid = Math.random() > 0.2 ? struct.amount : rndFloat(struct.amount * 0.4, struct.amount * 0.9);
        const balance = parseFloat((struct.amount - paid).toFixed(2));
        const receiptNo = `RCP${rnd(10000, 99999)}`;
        await db.execute({
          sql: "INSERT INTO fee_payments (student_id, fee_structure_id, amount, discount, paid_amount, balance, payment_date, payment_method, receipt_no, notes, staff_id, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
          args: [student.id, struct.id, struct.amount, 0, paid, balance, dateStr(2025, rnd(1, 5), rnd(1, 28)), pick(methods), receiptNo, balance === 0 ? "Fully paid" : "Partial payment", bursar.id, now],
        });
        payCount++;
      }
    }
  }
  console.log(`✓ fees (${structIds.length} structures, ${payCount} payments)`);
}

async function seedPayroll(staffList: { id: number; salary: number }[]) {
  const months = ["January","February","March","April","May"];
  let count = 0;
  for (const s of staffList) {
    for (const month of months) {
      const allowances = rndFloat(3000, 8000);
      const deductions = rndFloat(1000, 5000);
      const net = parseFloat((s.salary + allowances - deductions).toFixed(2));
      const status = month === "May" ? "Pending" : "Paid";
      await db.execute({
        sql: "INSERT INTO payroll (staff_id, month, year, basic_salary, allowances, deductions, net_salary, paid_date, status, created_at) VALUES (?,?,?,?,?,?,?,?,?,?)",
        args: [s.id, month, 2025, s.salary, allowances, deductions, net, status === "Paid" ? dateStr(2025, months.indexOf(month) + 1, 28) : null, status, now],
      });
      count++;
    }
  }
  console.log(`✓ payroll (${count} records)`);
}

async function seedLibrary() {
  const books = [
    { title: "Oxford Primary Mathematics Grade 6", author: "Oxford Press", isbn: "978-0-19-272", category: "Mathematics", copies: 45 },
    { title: "Kenya Primary English Book 5", author: "KLB Publishers", isbn: "978-9966-31-1", category: "Languages", copies: 40 },
    { title: "Integrated Science for Grade 8", author: "Longhorn Publishers", isbn: "978-9966-49-2", category: "Science", copies: 35 },
    { title: "Social Studies Grade 7", author: "East African Educational", isbn: "978-9966-25-3", category: "Social Studies", copies: 38 },
    { title: "Kiswahili Darasa la 6", author: "KLB Publishers", isbn: "978-9966-31-4", category: "Languages", copies: 42 },
    { title: "Christian Religious Education Grade 5", author: "Oxford Press", isbn: "978-0-19-380", category: "Religious Studies", copies: 30 },
    { title: "Pre-Technical Studies Grade 9", author: "Longhorn Publishers", isbn: "978-9966-49-5", category: "Technical", copies: 28 },
    { title: "Agriculture Grade 8", author: "East African Educational", isbn: "978-9966-25-6", category: "Agriculture", copies: 32 },
    { title: "Business Studies Grade 9", author: "Oxford Press", isbn: "978-0-19-491", category: "Business", copies: 25 },
    { title: "ICT for Junior Secondary", author: "Macmillan", isbn: "978-1-4050-7", category: "ICT", copies: 20 },
    { title: "The River and The Source", author: "Margaret Ogola", isbn: "978-9966-46-8", category: "Fiction", copies: 15 },
    { title: "Blossoms of the Savannah", author: "Henry Ole Kulet", isbn: "978-9966-46-9", category: "Fiction", copies: 18 },
    { title: "Animal Farm", author: "George Orwell", isbn: "978-0-45-228", category: "Fiction", copies: 12 },
    { title: "The Pearl", author: "John Steinbeck", isbn: "978-0-14-2", category: "Fiction", copies: 10 },
    { title: "Kenya's History and Government", author: "Oxford Press", isbn: "978-0-19-600", category: "History", copies: 22 },
  ];

  const bookIds: number[] = [];
  for (const b of books) {
    const borrowed = rnd(0, Math.floor(b.copies * 0.4));
    const r = await db.execute({
      sql: "INSERT INTO library_books (title, author, isbn, category, copies, available, created_at) VALUES (?,?,?,?,?,?,?)",
      args: [b.title, b.author, b.isbn, b.category, b.copies, b.copies - borrowed, now],
    });
    bookIds.push(Number(r.lastInsertRowid));
  }

  const students = await db.execute("SELECT id FROM students ORDER BY RANDOM() LIMIT 40");
  let borrowCount = 0;
  for (const student of students.rows.slice(0, 30)) {
    const bookId = pick(bookIds);
    const borrowDate = dateStr(2025, rnd(3, 4), rnd(1, 25));
    const dueDate = dateStr(2025, rnd(4, 5), rnd(1, 28));
    const returned = Math.random() > 0.4;
    await db.execute({
      sql: "INSERT INTO library_borrows (book_id, student_id, borrow_date, due_date, return_date, status) VALUES (?,?,?,?,?,?)",
      args: [bookId, student.id, borrowDate, dueDate, returned ? dueDate : null, returned ? "returned" : "borrowed"],
    });
    borrowCount++;
  }
  console.log(`✓ library (${bookIds.length} books, ${borrowCount} borrows)`);
}

async function seedInventory() {
  const items = [
    { name: "Desktop Computers", category: "Electronics", quantity: 25, condition: "Good", location: "ICT Lab" },
    { name: "Projector - Epson", category: "Electronics", quantity: 4, condition: "Good", location: "Assembly Hall" },
    { name: "Whiteboard 6x4ft", category: "Furniture", quantity: 18, condition: "Good", location: "Classrooms" },
    { name: "Student Desks", category: "Furniture", quantity: 320, condition: "Good", location: "Classrooms" },
    { name: "Teacher's Desk", category: "Furniture", quantity: 18, condition: "Good", location: "Classrooms" },
    { name: "Chairs (Student)", category: "Furniture", quantity: 320, condition: "Fair", location: "Classrooms" },
    { name: "Printer - HP LaserJet", category: "Electronics", quantity: 3, condition: "Good", location: "Office" },
    { name: "Photocopier", category: "Electronics", quantity: 1, condition: "Good", location: "Office" },
    { name: "Science Lab Equipment Set", category: "Lab Equipment", quantity: 10, condition: "Good", location: "Science Lab" },
    { name: "Football", category: "Sports", quantity: 8, condition: "Good", location: "Sports Store" },
    { name: "Netball", category: "Sports", quantity: 6, condition: "Fair", location: "Sports Store" },
    { name: "First Aid Kit", category: "Medical", quantity: 5, condition: "Good", location: "Sick Bay" },
    { name: "Fire Extinguisher", category: "Safety", quantity: 6, condition: "Good", location: "Corridors" },
    { name: "School Bus - KBQ 123A", category: "Vehicle", quantity: 1, condition: "Good", location: "Parking" },
    { name: "Generator - 20KVA", category: "Equipment", quantity: 1, condition: "Good", location: "Generator Room" },
    { name: "Printer Paper (Reams)", category: "Stationery", quantity: 50, condition: "Good", location: "Store" },
    { name: "Exercise Books (Box)", category: "Stationery", quantity: 20, condition: "Good", location: "Store" },
  ];

  for (const item of items) {
    await db.execute({
      sql: "INSERT INTO inventory_items (name, category, quantity, condition, location, purchase_date, notes, created_at) VALUES (?,?,?,?,?,?,?,?)",
      args: [item.name, item.category, item.quantity, item.condition, item.location, dateStr(rnd(2020, 2024), rnd(1, 12), rnd(1, 28)), "", now],
    });
  }
  console.log(`✓ inventory (${items.length} items)`);
}

async function seedTransport() {
  const routes = [
    { name: "Westlands Route", vehicle: "KBQ 456B - Toyota Coaster", driver: "Mr. Moses Njeru", fee: 4500 },
    { name: "Eastlands Route", vehicle: "KBQ 789C - Toyota Coaster", driver: "Mr. John Kamau", fee: 4000 },
    { name: "Karen Route", vehicle: "KBQ 123A - School Bus", driver: "Mr. Peter Waweru", fee: 5000 },
    { name: "Kasarani Route", vehicle: "KBQ 321D - Toyota Coaster", driver: "Mr. David Okeyo", fee: 3800 },
  ];

  const routeIds: number[] = [];
  for (const r of routes) {
    const res = await db.execute({
      sql: "INSERT INTO transport_routes (name, vehicle, driver, driver_phone, fee, created_at) VALUES (?,?,?,?,?,?)",
      args: [r.name, r.vehicle, r.driver, `07${rnd(10,99)}${rnd(100000,999999)}`, r.fee, now],
    });
    routeIds.push(Number(res.lastInsertRowid));
  }

  const students = await db.execute("SELECT id FROM students ORDER BY RANDOM() LIMIT 80");
  let assignCount = 0;
  for (const s of students.rows) {
    await db.execute({
      sql: "INSERT INTO transport_assignments (student_id, route_id, term, year, created_at) VALUES (?,?,?,?,?)",
      args: [s.id, pick(routeIds), "Term 2", 2025, now],
    });
    assignCount++;
  }
  console.log(`✓ transport (${routeIds.length} routes, ${assignCount} assignments)`);
}

async function seedTimetable(classes: { id: number }[], staffList: { id: number }[]) {
  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
  const primarySlots = [
    { period: 1, start: "07:30", end: "08:30" },
    { period: 2, start: "08:30", end: "09:30" },
    { period: 3, start: "09:50", end: "10:50" },
    { period: 4, start: "10:50", end: "11:50" },
    { period: 5, start: "13:00", end: "14:00" },
    { period: 6, start: "14:00", end: "15:00" },
  ];
  const primarySubjects = ["Mathematics","English","Kiswahili","Science","Social Studies","CRE","Creative Arts"];
  const juniorSubjects = ["Mathematics","English","Kiswahili","Integrated Science","Social Studies","CRE","Pre-Technical Studies","Agriculture","Business Studies","ICT"];

  let count = 0;
  for (const cls of classes) {
    const subs = cls.id <= 6 ? primarySubjects : juniorSubjects;
    for (const day of days) {
      for (const slot of primarySlots) {
        const subject = pick(subs);
        const teacher = staffList[rnd(2, staffList.length - 1)];
        await db.execute({
          sql: "INSERT INTO timetable_slots (class_id, day, period, subject, teacher_id, start_time, end_time, created_at) VALUES (?,?,?,?,?,?,?,?)",
          args: [cls.id, day, slot.period, subject, teacher.id, slot.start, slot.end, now],
        });
        count++;
      }
    }
  }
  console.log(`✓ timetable (${count} slots)`);
}

async function seedMessages(staffList: { id: number }[]) {
  const msgs = [
    { subject: "End of Term Exams Schedule", body: "Dear Parents, please note that End of Term 2 exams will commence on 15th June 2025. Students are advised to report by 7:00 AM daily.", recipient_type: "all" },
    { subject: "School Fees Reminder", body: "This is a reminder that Term 2 school fees are due by 30th May 2025. Kindly clear all outstanding balances to avoid inconvenience.", recipient_type: "all" },
    { subject: "Sports Day Notice", body: "The annual Sports Day will be held on 7th June 2025 at the school grounds. Parents are welcome to attend. Students should come in their PE uniform.", recipient_type: "all" },
    { subject: "Staff Meeting - Friday 3PM", body: "All teaching staff are reminded of the mandatory staff meeting this Friday at 3:00 PM in the staffroom. Attendance is compulsory.", recipient_type: "staff" },
    { subject: "Library Books Return", body: "All students who borrowed library books in Term 1 are required to return them by end of this week. Fines apply for overdue books.", recipient_type: "all" },
    { subject: "Grade 9 Parents Meeting", body: "Parents of Grade 9 students are invited to an academic progress meeting on 20th May 2025 at 2:00 PM. Please confirm attendance.", recipient_type: "class" },
    { subject: "Holiday Notice - Madaraka Day", body: "Please note that the school will be closed on 1st June 2025 in observance of Madaraka Day. Normal classes resume on 2nd June.", recipient_type: "all" },
  ];

  const admin = staffList[0];
  for (const m of msgs) {
    await db.execute({
      sql: "INSERT INTO messages (subject, body, recipient_type, recipient_id, staff_id, sent_at) VALUES (?,?,?,?,?,?)",
      args: [m.subject, m.body, m.recipient_type, m.recipient_type === "class" ? 9 : null, admin.id, now - rnd(0, 7) * 86400000],
    });
  }
  console.log(`✓ messages (${msgs.length})`);
}

async function seedCertificates(students: { id: number }[], staffList: { id: number }[]) {
  const types = ["Completion Certificate","Excellence Award","Sports Achievement","Best Student Award","Perfect Attendance","Science Fair Winner"];
  const admin = staffList[0];
  let count = 0;
  for (const s of students.slice(0, 40)) {
    if (Math.random() > 0.6) {
      await db.execute({
        sql: "INSERT INTO certificates (student_id, type, issued_date, staff_id, notes, created_at) VALUES (?,?,?,?,?,?)",
        args: [s.id, pick(types), dateStr(2025, rnd(1, 4), rnd(1, 28)), admin.id, "Awarded during school assembly", now],
      });
      count++;
    }
  }
  console.log(`✓ certificates (${count})`);
}

async function seedTransactions(staffList: { id: number }[]) {
  const bursar = staffList[staffList.length - 1];
  const incomeItems = [
    { category: "Tuition Fees", amounts: [250000, 320000, 180000, 290000, 310000] },
    { category: "Activity Fees", amounts: [45000, 52000, 38000, 49000, 51000] },
    { category: "Transport Fees", amounts: [72000, 85000, 60000, 78000, 80000] },
    { category: "Library Fees", amounts: [8000, 9500, 7000, 8800, 9200] },
  ];
  const expenseItems = [
    { category: "Salaries", amounts: [680000, 680000, 680000, 680000, 680000] },
    { category: "Utilities", amounts: [28000, 31000, 25000, 29000, 30000] },
    { category: "Stationery", amounts: [15000, 12000, 18000, 14000, 16000] },
    { category: "Maintenance", amounts: [22000, 18000, 35000, 20000, 25000] },
    { category: "Food & Catering", amounts: [85000, 92000, 78000, 88000, 90000] },
  ];

  const months = ["January", "February", "March", "April", "May"];
  let count = 0;

  for (let mi = 0; mi < months.length; mi++) {
    const month = months[mi];
    for (const item of incomeItems) {
      await db.execute({
        sql: "INSERT INTO transactions (type, category, amount, description, date, reference, staff_id, created_at) VALUES (?,?,?,?,?,?,?,?)",
        args: ["income", item.category, item.amounts[mi], `${item.category} - ${month} 2025`, dateStr(2025, mi + 1, rnd(1, 5)), `REF${rnd(10000,99999)}`, bursar.id, now],
      });
      count++;
    }
    for (const item of expenseItems) {
      await db.execute({
        sql: "INSERT INTO transactions (type, category, amount, description, date, reference, staff_id, created_at) VALUES (?,?,?,?,?,?,?,?)",
        args: ["expense", item.category, item.amounts[mi], `${item.category} - ${month} 2025`, dateStr(2025, mi + 1, rnd(20, 28)), `REF${rnd(10000,99999)}`, bursar.id, now],
      });
      count++;
    }
  }
  console.log(`✓ transactions (${count})`);
}

// ── main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log("Seeding fake data...\n");
  await clearData();

  const classes = await seedClasses();
  const staffList = await seedStaff();
  const sections = await seedSections(classes, staffList);
  const subjects = await seedSubjects(classes, staffList);
  const students = await seedStudents(classes, sections);

  // Run these in parallel where safe
  await Promise.all([
    seedExams(classes, students, subjects),
    seedFees(classes, students, staffList),
    seedPayroll(staffList as { id: number; salary: number }[]),
    seedLibrary(),
    seedInventory(),
    seedTransport(),
    seedTimetable(classes, staffList),
    seedMessages(staffList),
    seedCertificates(students, staffList),
    seedTransactions(staffList),
  ]);

  await seedAttendance(students, staffList);

  console.log("\n✅ All fake data seeded!");
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
