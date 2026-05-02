const db = require('../config/database');

exports.getAttendanceByDate = async (req, res) => {
  try {
    const { date, grade, stream } = req.query;
    const schoolId = req.user.school_id;

    if (!date) {
      return res.status(400).json({ message: 'Date is required' });
    }

    let query = `
      SELECT a.*, s.first_name, s.last_name, s.admission_number, s.current_grade, s.stream
      FROM attendance a
      JOIN students s ON a.student_id = s.id
      WHERE s.school_id = $1 AND a.date = $2
    `;
    const params = [schoolId, date];

    if (grade) {
      query += ` AND s.current_grade = $${params.length + 1}`;
      params.push(grade);
    }

    if (stream) {
      query += ` AND s.stream = $${params.length + 1}`;
      params.push(stream);
    }

    query += ` ORDER BY s.last_name, s.first_name`;

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getStudentAttendance = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { startDate, endDate } = req.query;
    const schoolId = req.user.school_id;

    // Verify student belongs to school
    const studentCheck = await db.query(
      'SELECT id FROM students WHERE id = $1 AND school_id = $2',
      [studentId, schoolId]
    );

    if (studentCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Student not found' });
    }

    let query = `SELECT * FROM attendance WHERE student_id = $1`;
    const params = [studentId];

    if (startDate) {
      query += ` AND date >= $${params.length + 1}`;
      params.push(startDate);
    }

    if (endDate) {
      query += ` AND date <= $${params.length + 1}`;
      params.push(endDate);
    }

    query += ` ORDER BY date DESC`;

    const result = await db.query(query, params);
    
    // Calculate summary
    const summary = {
      total: result.rows.length,
      present: result.rows.filter(r => r.status === 'present').length,
      absent: result.rows.filter(r => r.status === 'absent').length,
      late: result.rows.filter(r => r.status === 'late').length,
      excused: result.rows.filter(r => r.status === 'excused').length
    };

    res.json({ records: result.rows, summary });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.markAttendance = async (req, res) => {
  try {
    const { studentId, date, status, checkIn, checkOut, remarks } = req.body;
    const schoolId = req.user.school_id;
    const markedBy = req.user.id;

    if (!studentId || !date || !status) {
      return res.status(400).json({ message: 'Student ID, date, and status are required' });
    }

    const validStatus = ['present', 'absent', 'late', 'excused'];
    if (!validStatus.includes(status)) {
      return res.status(400).json({ message: 'Invalid status. Must be present, absent, late, or excused' });
    }

    // Verify student belongs to school
    const studentCheck = await db.query(
      'SELECT id FROM students WHERE id = $1 AND school_id = $2',
      [studentId, schoolId]
    );

    if (studentCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Student not found' });
    }

    const result = await db.query(
      `INSERT INTO attendance (student_id, date, status, check_in, check_out, marked_by, remarks)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (student_id, date)
       DO UPDATE SET 
         status = EXCLUDED.status,
         check_in = EXCLUDED.check_in,
         check_out = EXCLUDED.check_out,
         remarks = EXCLUDED.remarks,
         marked_by = EXCLUDED.marked_by,
         created_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [studentId, date, status, checkIn || null, checkOut || null, markedBy, remarks || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ message: 'Error marking attendance', error: error.message });
  }
};

exports.bulkMarkAttendance = async (req, res) => {
  try {
    const { date, records } = req.body; // records: [{ studentId, status, checkIn, checkOut, remarks }, ...]
    const schoolId = req.user.school_id;
    const markedBy = req.user.id;

    if (!date || !records || records.length === 0) {
      return res.status(400).json({ message: 'Date and attendance records are required' });
    }

    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      const insertedRecords = [];

      for (const record of records) {
        // Verify student belongs to school
        const studentCheck = await client.query(
          'SELECT id FROM students WHERE id = $1 AND school_id = $2',
          [record.studentId, schoolId]
        );

        if (studentCheck.rows.length === 0) {
          throw new Error(`Student ${record.studentId} not found`);
        }

        const result = await client.query(
          `INSERT INTO attendance (student_id, date, status, check_in, check_out, marked_by, remarks)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (student_id, date)
           DO UPDATE SET 
             status = EXCLUDED.status,
             check_in = EXCLUDED.check_in,
             check_out = EXCLUDED.check_out,
             remarks = EXCLUDED.remarks,
             marked_by = EXCLUDED.marked_by
           RETURNING *`,
          [
            record.studentId,
            date,
            record.status || 'present',
            record.checkIn || null,
            record.checkOut || null,
            markedBy,
            record.remarks || null
          ]
        );

        insertedRecords.push(result.rows[0]);
      }

      await client.query('COMMIT');
      res.status(201).json({ message: `${insertedRecords.length} attendance records marked`, records: insertedRecords });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    res.status(500).json({ message: 'Error marking attendance', error: error.message });
  }
};

exports.getAttendanceSummary = async (req, res) => {
  try {
    const { startDate, endDate, grade, stream } = req.query;
    const schoolId = req.user.school_id;

    if (!startDate || !endDate) {
      return res.status(400).json({ message: 'Start date and end date are required' });
    }

    let query = `
      SELECT 
        s.id, s.first_name, s.last_name, s.admission_number, s.current_grade, s.stream,
        COUNT(*) as total_days,
        SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) as present_days,
        SUM(CASE WHEN a.status = 'absent' THEN 1 ELSE 0 END) as absent_days,
        SUM(CASE WHEN a.status = 'late' THEN 1 ELSE 0 END) as late_days,
        SUM(CASE WHEN a.status = 'excused' THEN 1 ELSE 0 END) as excused_days,
        ROUND(100.0 * SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) / COUNT(*), 2) as attendance_percentage
      FROM students s
      LEFT JOIN attendance a ON s.id = a.student_id AND a.date BETWEEN $1 AND $2
      WHERE s.school_id = $3
    `;
    const params = [startDate, endDate, schoolId];

    if (grade) {
      query += ` AND s.current_grade = $${params.length + 1}`;
      params.push(grade);
    }

    if (stream) {
      query += ` AND s.stream = $${params.length + 1}`;
      params.push(stream);
    }

    query += ` GROUP BY s.id ORDER BY s.last_name, s.first_name`;

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
