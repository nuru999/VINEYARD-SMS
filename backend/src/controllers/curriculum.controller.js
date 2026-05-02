const db = require('../config/database');

// ========== CBC STRANDS ==========

exports.getStrands = async (req, res) => {
  try {
    const { subjectId } = req.query;
    const schoolId = req.user.school_id;

    let query = `
      SELECT cs.id, cs.name, cs.code, cs.grade_level, s.name as subject_name, s.code as subject_code
      FROM cbc_strands cs
      JOIN subjects s ON cs.subject_id = s.id
      WHERE s.school_id = $1
    `;
    const params = [schoolId];

    if (subjectId) {
      query += ` AND cs.subject_id = $2`;
      params.push(subjectId);
    }

    query += ` ORDER BY cs.grade_level, cs.name`;

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.createStrand = async (req, res) => {
  try {
    const { name, code, gradeLevel, subjectId } = req.body;
    const schoolId = req.user.school_id;

    if (!name || !subjectId) {
      return res.status(400).json({ message: 'Name and subject ID are required' });
    }

    const subjectCheck = await db.query(
      `SELECT id FROM subjects WHERE id = $1 AND school_id = $2`,
      [subjectId, schoolId]
    );
    if (subjectCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Subject not found' });
    }

    const result = await db.query(
      `INSERT INTO cbc_strands (subject_id, name, code, grade_level)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [subjectId, name, code || null, gradeLevel || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ message: 'Error creating strand', error: error.message });
  }
};

exports.updateStrand = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, code, gradeLevel } = req.body;
    const schoolId = req.user.school_id;

    const result = await db.query(
      `UPDATE cbc_strands cs
       SET name = $1, code = $2, grade_level = $3
       FROM subjects s
       WHERE cs.id = $4
       AND cs.subject_id = s.id
       AND s.school_id = $5
       RETURNING cs.*`,
      [name, code, gradeLevel, id, schoolId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Strand not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ message: 'Error updating strand', error: error.message });
  }
};

exports.deleteStrand = async (req, res) => {
  try {
    const { id } = req.params;
    const schoolId = req.user.school_id;

    const result = await db.query(
      `DELETE FROM cbc_strands cs
       USING subjects s
       WHERE cs.id = $1
       AND cs.subject_id = s.id
       AND s.school_id = $2
       RETURNING cs.*`,
      [id, schoolId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Strand not found' });
    }

    res.json({ message: 'Strand deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting strand', error: error.message });
  }
};

// ========== CBC SUB-STRANDS ==========

exports.getSubStrands = async (req, res) => {
  try {
    const { strandId } = req.query;
    const schoolId = req.user.school_id;

    let query = `
      SELECT css.id, css.name, css.learning_outcomes, css.suggested_activities, 
             cs.name as strand_name, cs.id as strand_id
      FROM cbc_sub_strands css
      JOIN cbc_strands cs ON css.strand_id = cs.id
      JOIN subjects s ON cs.subject_id = s.id
      WHERE s.school_id = $1
    `;
    const params = [schoolId];

    if (strandId) {
      query += ` AND css.strand_id = $2`;
      params.push(strandId);
    }

    query += ` ORDER BY cs.name, css.name`;

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.createSubStrand = async (req, res) => {
  try {
    const { name, strandId, learningOutcomes, suggestedActivities } = req.body;
    const schoolId = req.user.school_id;

    if (!name || !strandId) {
      return res.status(400).json({ message: 'Name and strand ID are required' });
    }

    const strandCheck = await db.query(
      `SELECT cs.id
       FROM cbc_strands cs
       JOIN subjects s ON cs.subject_id = s.id
       WHERE cs.id = $1 AND s.school_id = $2`,
      [strandId, schoolId]
    );
    if (strandCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Strand not found' });
    }

    const result = await db.query(
      `INSERT INTO cbc_sub_strands (strand_id, name, learning_outcomes, suggested_activities)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [strandId, name, learningOutcomes || null, suggestedActivities || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ message: 'Error creating sub-strand', error: error.message });
  }
};

exports.updateSubStrand = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, learningOutcomes, suggestedActivities } = req.body;
    const schoolId = req.user.school_id;

    const result = await db.query(
      `UPDATE cbc_sub_strands css
       SET name = $1, learning_outcomes = $2, suggested_activities = $3 
       FROM cbc_strands cs, subjects s
       WHERE css.id = $4
       AND css.strand_id = cs.id
       AND cs.subject_id = s.id
       AND s.school_id = $5
       RETURNING css.*`,
      [name, learningOutcomes, suggestedActivities, id, schoolId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Sub-strand not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ message: 'Error updating sub-strand', error: error.message });
  }
};

exports.deleteSubStrand = async (req, res) => {
  try {
    const { id } = req.params;
    const schoolId = req.user.school_id;

    const result = await db.query(
      `DELETE FROM cbc_sub_strands css
       USING cbc_strands cs, subjects s
       WHERE css.id = $1
       AND css.strand_id = cs.id
       AND cs.subject_id = s.id
       AND s.school_id = $2
       RETURNING css.*`,
      [id, schoolId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Sub-strand not found' });
    }

    res.json({ message: 'Sub-strand deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting sub-strand', error: error.message });
  }
};

// ========== TEACHER ASSIGNMENTS ==========

exports.getAssignments = async (req, res) => {
  try {
    const schoolId = req.user.school_id;
    const { teacherId, academicYearId } = req.query;

    let query = `
      SELECT ta.*, u.first_name, u.last_name, u.email,
             s.name as subject_name, s.code as subject_code,
             ay.name as academic_year_name
      FROM teacher_assignments ta
      JOIN users u ON ta.teacher_id = u.id
      JOIN subjects s ON ta.subject_id = s.id
      LEFT JOIN academic_years ay ON ta.academic_year_id = ay.id
      WHERE u.school_id = $1
    `;
    const params = [schoolId];

    if (teacherId) {
      query += ` AND ta.teacher_id = $${params.length + 1}`;
      params.push(teacherId);
    }

    if (academicYearId) {
      query += ` AND ta.academic_year_id = $${params.length + 1}`;
      params.push(academicYearId);
    }

    query += ` ORDER BY u.last_name, s.name`;

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.createAssignment = async (req, res) => {
  try {
    const { teacherId, subjectId, grade, stream, academicYearId, isClassTeacher } = req.body;
    const schoolId = req.user.school_id;

    if (!teacherId || !subjectId || !grade) {
      return res.status(400).json({ message: 'Teacher, subject, and grade are required' });
    }

    // Verify teacher belongs to school
    const teacherCheck = await db.query(
      'SELECT id FROM users WHERE id = $1 AND school_id = $2 AND role = $3',
      [teacherId, schoolId, 'teacher']
    );

    if (teacherCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Teacher not found' });
    }

    const subjectCheck = await db.query(
      'SELECT id FROM subjects WHERE id = $1 AND school_id = $2',
      [subjectId, schoolId]
    );
    if (subjectCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Subject not found' });
    }

    if (academicYearId) {
      const yearCheck = await db.query(
        'SELECT id FROM academic_years WHERE id = $1 AND school_id = $2',
        [academicYearId, schoolId]
      );
      if (yearCheck.rows.length === 0) {
        return res.status(404).json({ message: 'Academic year not found' });
      }
    }

    const result = await db.query(
      `INSERT INTO teacher_assignments (teacher_id, subject_id, grade, stream, academic_year_id, is_class_teacher)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [teacherId, subjectId, grade, stream || null, academicYearId || null, isClassTeacher || false]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ message: 'Error creating assignment', error: error.message });
  }
};

exports.updateAssignment = async (req, res) => {
  try {
    const { id } = req.params;
    const { grade, stream, isClassTeacher } = req.body;
    const schoolId = req.user.school_id;

    const result = await db.query(
      `UPDATE teacher_assignments ta
       SET grade = $1, stream = $2, is_class_teacher = $3 
       FROM users u
       WHERE ta.id = $4
       AND ta.teacher_id = u.id
       AND u.school_id = $5
       RETURNING ta.*`,
      [grade, stream, isClassTeacher, id, schoolId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ message: 'Error updating assignment', error: error.message });
  }
};

exports.deleteAssignment = async (req, res) => {
  try {
    const { id } = req.params;
    const schoolId = req.user.school_id;

    const result = await db.query(
      `DELETE FROM teacher_assignments ta
       USING users u
       WHERE ta.id = $1
       AND ta.teacher_id = u.id
       AND u.school_id = $2
       RETURNING ta.*`,
      [id, schoolId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    res.json({ message: 'Assignment deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting assignment', error: error.message });
  }
};
