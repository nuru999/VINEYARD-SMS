const db = require('../config/database');
const { calculate844Grade } = require('../utils/helpers');

exports.getReportCard = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { termId, academicYearId } = req.query;
    const schoolId = req.user.school_id;

    // Verify student belongs to school
    const student = await db.query(
      `SELECT s.*, ay.name as academic_year
       FROM students s
       LEFT JOIN academic_years ay ON ay.id = $2
       WHERE s.id = $1 AND s.school_id = $3`,
      [studentId, academicYearId, schoolId]
    );

    if (student.rows.length === 0) {
      return res.status(404).json({ message: 'Student not found' });
    }

    const studentData = student.rows[0];

    if (studentData.curriculum === '8-4-4') {
      return await get844ReportCard(res, studentId, termId, studentData);
    }
    return await getCBCReportCard(res, studentId, termId, studentData);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

async function get844ReportCard(res, studentId, termId, studentData) {
  // Get all assessments for the term
  const assessments = await db.query(
    `SELECT a.id, a.name, a.assessment_type, a.max_score, a.weight_percentage,
            s.code as subject_code, s.name as subject_name
     FROM assessments a
     JOIN subjects s ON a.subject_id = s.id
     WHERE a.term_id = $1 AND a.curriculum = '8-4-4'
     ORDER BY s.name`,
    [termId]
  );

  // Get grades for each assessment
  const reportData = [];
  let totalPoints = 0;
  let totalWeightedScore = 0;
  let totalWeight = 0;

  for (const assessment of assessments.rows) {
    const grade = await db.query(
      `SELECT score, percentage, grade, points
       FROM grades_844
       WHERE assessment_id = $1 AND student_id = $2`,
      [assessment.id, studentId]
    );

    if (grade.rows.length > 0) {
      const g = grade.rows[0];
      const weight = parseFloat(assessment.weight_percentage) / 100;
      totalWeightedScore += (g.percentage * weight);
      totalWeight += weight;

      if (assessment.assessment_type === 'endterm') {
        totalPoints += g.points || 0;
      }

      reportData.push({
        subject: assessment.subject_name,
        subjectCode: assessment.subject_code,
        assessment: assessment.name,
        type: assessment.assessment_type,
        score: g.score,
        percentage: g.percentage,
        grade: g.grade,
        points: g.points,
        weight: assessment.weight_percentage
      });
    }
  }

  // Calculate overall grade
  const overallPercentage = totalWeight > 0 ? totalWeightedScore / totalWeight : 0;
  const overallGrade = calculate844Grade(overallPercentage);

  return res.json({
    student: {
      id: studentData.id,
      name: `${studentData.first_name} ${studentData.last_name}`,
      admissionNumber: studentData.admission_number,
      grade: studentData.current_grade,
      stream: studentData.stream,
      curriculum: studentData.curriculum
    },
    academicYear: studentData.academic_year,
    curriculum: '8-4-4',
    subjects: reportData,
    summary: {
      overallPercentage: Math.round(overallPercentage * 100) / 100,
      overallGrade: overallGrade.grade,
      totalPoints,
      status: overallPercentage >= 50 ? 'Pass' : 'Fail'
    }
  });
}

async function getCBCReportCard(res, studentId, termId, studentData) {
  // Get all CBC assessments for the term
  const assessments = await db.query(
    `SELECT a.id, a.name, a.assessment_type,
            s.code as subject_code, s.name as subject_name
     FROM assessments a
     JOIN subjects s ON a.subject_id = s.id
     WHERE a.term_id = $1 AND a.curriculum = 'cbc'
     ORDER BY s.name`,
    [termId]
  );

  // Get CBC grades
  const reportData = [];

  for (const assessment of assessments.rows) {
    const grades = await db.query(
      `SELECT g.competency_level, ss.name as sub_strand_name,
              st.name as strand_name, g.teacher_observations
       FROM grades_cbc g
       JOIN cbc_sub_strands ss ON g.sub_strand_id = ss.id
       JOIN cbc_strands st ON ss.strand_id = st.id
       WHERE g.assessment_id = $1 AND g.student_id = $2
       ORDER BY st.name, ss.name`,
      [assessment.id, studentId]
    );

    if (grades.rows.length > 0) {
      // Group by strand
      const strands = {};
      grades.rows.forEach(grade => {
        if (!strands[grade.strand_name]) {
          strands[grade.strand_name] = [];
        }
        strands[grade.strand_name].push({
          subStrand: grade.sub_strand_name,
          competencyLevel: grade.competency_level,
          observations: grade.teacher_observations
        });
      });

      reportData.push({
        subject: assessment.subject_name,
        subjectCode: assessment.subject_code,
        assessment: assessment.name,
        type: assessment.assessment_type,
        strands: strands
      });
    }
  }

  return res.json({
    student: {
      id: studentData.id,
      name: `${studentData.first_name} ${studentData.last_name}`,
      admissionNumber: studentData.admission_number,
      grade: studentData.current_grade,
      stream: studentData.stream,
      curriculum: studentData.curriculum
    },
    academicYear: studentData.academic_year,
    curriculum: 'cbc',
    subjects: reportData,
    summary: {
      status: 'Competency-based assessment completed'
    }
  });
}

exports.getReportTerms = async (req, res) => {
  try {
    const schoolId = req.user.school_id;
    const result = await db.query(
      `SELECT t.id, t.name, t.is_current, t.start_date, t.end_date,
              ay.id as academic_year_id, ay.name as academic_year_name
       FROM terms t
       JOIN academic_years ay ON t.academic_year_id = ay.id
       WHERE ay.school_id = $1
       ORDER BY ay.start_date DESC, t.start_date DESC`,
      [schoolId]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getClassReport = async (req, res) => {
  try {
    const { grade, stream, termId } = req.query;
    const schoolId = req.user.school_id;

    // Get all students in the class
    let query = `SELECT id, first_name, last_name, admission_number
                 FROM students
                 WHERE school_id = $1 AND current_grade = $2 AND status = 'active'`;
    const params = [schoolId, grade];

    if (stream) {
      query += ` AND stream = $${params.length + 1}`;
      params.push(stream);
    }

    query += ` ORDER BY last_name, first_name`;

    const students = await db.query(query, params);

    // Aggregate 8-4-4 subject averages for this class and term.
    const gradeRows = await db.query(
      `SELECT g.student_id, s.code as subject_code, s.name as subject_name,
              AVG(g.percentage) as avg_percentage
       FROM grades_844 g
       JOIN assessments a ON g.assessment_id = a.id
       JOIN subjects s ON a.subject_id = s.id
       JOIN students st ON g.student_id = st.id
       WHERE st.school_id = $1
         AND st.current_grade = $2
         AND ($3::text IS NULL OR st.stream = $3)
         AND ($4::uuid IS NULL OR a.term_id = $4)
       GROUP BY g.student_id, s.code, s.name`,
      [schoolId, grade, stream || null, termId || null]
    );

    const gradeMap = {};
    for (const row of gradeRows.rows) {
      if (!gradeMap[row.student_id]) {
        gradeMap[row.student_id] = {};
      }
      const average = parseFloat(row.avg_percentage);
      const mapped = calculate844Grade(average);
      gradeMap[row.student_id][row.subject_code] = {
        subject: row.subject_name,
        percentage: Math.round(average * 100) / 100,
        grade: mapped.grade,
        points: mapped.points
      };
    }

    const classReport = students.rows.map((student) => ({
      studentId: student.id,
      name: `${student.first_name} ${student.last_name}`,
      admissionNumber: student.admission_number,
      grades: gradeMap[student.id] || {}
    }));

    res.json({
      grade,
      stream: stream || 'All',
      termId,
      studentCount: students.rows.length,
      students: classReport
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};