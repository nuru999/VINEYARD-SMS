const db = require('../config/database');

// Get grades for a specific assessment
exports.getAssessmentGrades = async (req, res) => {
  try {
    const { assessmentId } = req.params;
    const { curriculum } = req.query;

    const assessmentCheck = await db.query(
      'SELECT curriculum FROM assessments WHERE id = $1',
      [assessmentId]
    );

    if (assessmentCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Assessment not found' });
    }

    const isCBC = assessmentCheck.rows[0].curriculum === 'cbc';

    let query;
    if (isCBC) {
      // CBC Grades with competency levels
      query = `
        SELECT g.*, s.first_name, s.last_name, s.admission_number,
               ss.name as sub_strand_name, ss.id as sub_strand_id
        FROM grades_cbc g
        JOIN students s ON g.student_id = s.id
        LEFT JOIN cbc_sub_strands ss ON g.sub_strand_id = ss.id
        WHERE g.assessment_id = $1
        ORDER BY s.last_name, s.first_name
      `;
    } else {
      // 8-4-4 Grades with percentages
      query = `
        SELECT g.*, s.first_name, s.last_name, s.admission_number
        FROM grades_844 g
        JOIN students s ON g.student_id = s.id
        WHERE g.assessment_id = $1
        ORDER BY s.last_name, s.first_name
      `;
    }

    const result = await db.query(query, [assessmentId]);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Enter grades (8-4-4)
exports.enterGrades844 = async (req, res) => {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    
    const { assessmentId } = req.params;
    const { grades } = req.body; // Array of { studentId, score, remarks }
    const teacherId = req.user.id;

    // Get assessment details
    const assessment = await client.query(
      'SELECT max_score, subject_id FROM assessments WHERE id = $1',
      [assessmentId]
    );
    
    if (assessment.rows.length === 0) {
      throw new Error('Assessment not found');
    }

    const maxScore = assessment.rows[0].max_score;

    for (const grade of grades) {
      const percentage = (grade.score / maxScore) * 100;
      const gradeData = calculate844Grade(percentage);

      await client.query(
        `INSERT INTO grades_844 
         (assessment_id, student_id, score, percentage, grade, points, remarks, entered_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (assessment_id, student_id) 
         DO UPDATE SET 
           score = EXCLUDED.score,
           percentage = EXCLUDED.percentage,
           grade = EXCLUDED.grade,
           points = EXCLUDED.points,
           remarks = EXCLUDED.remarks,
           modified_by = EXCLUDED.entered_by,
           modified_at = CURRENT_TIMESTAMP`,
        [
          assessmentId,
          grade.studentId,
          grade.score,
          percentage,
          gradeData.grade,
          gradeData.points,
          grade.remarks,
          teacherId
        ]
      );
    }

    await client.query('COMMIT');
    res.json({ message: 'Grades saved successfully', count: grades.length });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ message: 'Error saving grades', error: error.message });
  } finally {
    client.release();
  }
};

// Enter CBC Competency Levels
exports.enterGradesCBC = async (req, res) => {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    
    const { assessmentId } = req.params;
    const { grades } = req.body; // Array of { studentId, subStrandId, competencyLevel, observations }
    const teacherId = req.user.id;

    for (const grade of grades) {
      await client.query(
        `INSERT INTO grades_cbc 
         (assessment_id, student_id, sub_strand_id, competency_level, teacher_observations, entered_by)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (assessment_id, student_id, sub_strand_id) 
         DO UPDATE SET 
           competency_level = EXCLUDED.competency_level,
           teacher_observations = EXCLUDED.teacher_observations,
           modified_by = EXCLUDED.entered_by,
           modified_at = CURRENT_TIMESTAMP`,
        [
          assessmentId,
          grade.studentId,
          grade.subStrandId,
          grade.competencyLevel,
          grade.observations,
          teacherId
        ]
      );
    }

    await client.query('COMMIT');
    res.json({ message: 'CBC grades saved successfully', count: grades.length });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ message: 'Error saving grades', error: error.message });
  } finally {
    client.release();
  }
};

// Helper function for 8-4-4 grading
function calculate844Grade(percentage) {
  if (percentage >= 80) return { grade: 'A', points: 12 };
  if (percentage >= 75) return { grade: 'A-', points: 11 };
  if (percentage >= 70) return { grade: 'B+', points: 10 };
  if (percentage >= 65) return { grade: 'B', points: 9 };
  if (percentage >= 60) return { grade: 'B-', points: 8 };
  if (percentage >= 55) return { grade: 'C+', points: 7 };
  if (percentage >= 50) return { grade: 'C', points: 6 };
  if (percentage >= 45) return { grade: 'C-', points: 5 };
  if (percentage >= 40) return { grade: 'D+', points: 4 };
  if (percentage >= 35) return { grade: 'D', points: 3 };
  if (percentage >= 30) return { grade: 'D-', points: 2 };
  return { grade: 'E', points: 1 };
}