const db = require('../config/database');
const { createStudentSchema } = require('../validators/schemas');
const { generateAdmissionNumber } = require('../utils/helpers');

exports.getStudents = async (req, res) => {
  try {
    const { grade, curriculum, stream, status = 'active' } = req.query;
    const schoolId = req.user.school_id;

    let query = `SELECT * FROM students WHERE school_id = $1 AND status = $2`;
    const params = [schoolId, status];

    if (grade) {
      query += ` AND current_grade = $${params.length + 1}`;
      params.push(grade);
    }

    if (curriculum) {
      query += ` AND curriculum = $${params.length + 1}`;
      params.push(curriculum);
    }

    if (stream) {
      query += ` AND stream = $${params.length + 1}`;
      params.push(stream);
    }

    query += ` ORDER BY last_name, first_name`;

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getStudentById = async (req, res) => {
  try {
    const { id } = req.params;
    const schoolId = req.user.school_id;

    const result = await db.query(
      `SELECT s.*,
              json_agg(json_build_object(
                'id', sg.id,
                'relationship', sg.relationship,
                'isPrimary', sg.is_primary,
                'occupation', sg.occupation,
                'phone', u.phone,
                'email', u.email,
                'firstName', u.first_name,
                'lastName', u.last_name
              )) as guardians
       FROM students s
       LEFT JOIN student_guardians sg ON s.id = sg.student_id
       LEFT JOIN users u ON sg.user_id = u.id
       WHERE s.id = $1 AND s.school_id = $2
       GROUP BY s.id`,
      [id, schoolId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Student not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.createStudent = async (req, res) => {
  try {
    const schoolId = req.user.school_id;

    // Validate input
    const { error, value } = createStudentSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: 'Validation error', errors: error.details });
    }

    const {
      firstName, lastName, gender, dateOfBirth, curriculum,
      currentGrade, stream, boardingStatus, guardians = []
    } = value;

    // Generate admission number
    const year = new Date().getFullYear();
    const sequenceResult = await db.query(
      `SELECT COUNT(*) + 1 as next_seq FROM students WHERE school_id = $1 AND EXTRACT(YEAR FROM admission_date) = $2`,
      [schoolId, year]
    );
    const sequence = sequenceResult.rows[0].next_seq;

    // Get school code (assuming it's the first 3 letters of school name)
    const schoolResult = await db.query('SELECT name FROM schools WHERE id = $1', [schoolId]);
    const schoolCode = schoolResult.rows[0].name.substring(0, 3).toUpperCase();

    const admissionNumber = generateAdmissionNumber(schoolCode, year, sequence);

    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      // Create student
      const studentResult = await client.query(
        `INSERT INTO students
         (school_id, admission_number, first_name, last_name, gender, date_of_birth,
          curriculum, current_grade, stream, boarding_status, admission_date)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_DATE)
         RETURNING *`,
        [schoolId, admissionNumber, firstName, lastName, gender, dateOfBirth,
         curriculum, currentGrade, stream, boardingStatus]
      );

      const student = studentResult.rows[0];

      // Add guardians
      for (const guardian of guardians) {
        await client.query(
          `INSERT INTO student_guardians
           (student_id, relationship, is_primary, occupation)
           VALUES ($1, $2, $3, $4)`,
          [student.id, guardian.relationship, guardian.isPrimary || false, guardian.occupation]
        );
      }

      await client.query('COMMIT');
      res.status(201).json(student);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.updateStudent = async (req, res) => {
  try {
    const { id } = req.params;
    const schoolId = req.user.school_id;
    const updates = req.body;

    // Build dynamic update query
    const fields = [];
    const values = [];
    let paramIndex = 1;

    Object.keys(updates).forEach(key => {
      if (updates[key] !== undefined && key !== 'id' && key !== 'school_id') {
        fields.push(`${key} = $${paramIndex}`);
        values.push(updates[key]);
        paramIndex++;
      }
    });

    if (fields.length === 0) {
      return res.status(400).json({ message: 'No fields to update' });
    }

    values.push(id, schoolId);

    const query = `
      UPDATE students
      SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramIndex} AND school_id = $${paramIndex + 1}
      RETURNING *
    `;

    const result = await db.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Student not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.deleteStudent = async (req, res) => {
  try {
    const { id } = req.params;
    const schoolId = req.user.school_id;

    const result = await db.query(
      'DELETE FROM students WHERE id = $1 AND school_id = $2 RETURNING *',
      [id, schoolId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Student not found' });
    }

    res.json({ message: 'Student deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};