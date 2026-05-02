const db = require('../config/database');

exports.sendSMS = async (req, res) => {
  try {
    const { studentId, phoneNumber, message, messageType } = req.body;
    const schoolId = req.user.school_id;

    if (!message || (!studentId && !phoneNumber)) {
      return res.status(400).json({ message: 'Message and either student ID or phone number are required' });
    }

    let recipientPhone = phoneNumber;

    // If student ID provided, get their parent's phone
    if (studentId) {
      const studentCheck = await db.query(
        'SELECT parent_phone FROM students WHERE id = $1 AND school_id = $2',
        [studentId, schoolId]
      );

      if (studentCheck.rows.length === 0) {
        return res.status(404).json({ message: 'Student not found' });
      }

      recipientPhone = studentCheck.rows[0].parent_phone;

      if (!recipientPhone) {
        return res.status(400).json({ message: 'Student has no parent phone number on file' });
      }
    }

    // Validate phone number format (basic validation)
    if (!recipientPhone || recipientPhone.length < 10) {
      return res.status(400).json({ message: 'Invalid phone number format' });
    }

    // Record SMS in database
    const result = await db.query(
      `INSERT INTO sms_logs (school_id, student_id, recipient_phone, message, message_type, status, sent_by)
       VALUES ($1, $2, $3, $4, $5, 'sent', $6)
       RETURNING *`,
      [schoolId, studentId || null, recipientPhone, message, messageType || 'general', req.user.id]
    );

    // In production, integrate with M-Pesa API or SMS provider
    // Example: await sendSMSToProvider(recipientPhone, message);

    res.status(201).json({
      message: 'SMS sent successfully',
      smsLog: result.rows[0]
    });
  } catch (error) {
    res.status(500).json({ message: 'Error sending SMS', error: error.message });
  }
};

exports.sendBulkSMS = async (req, res) => {
  try {
    const { studentIds, message, messageType } = req.body;
    const schoolId = req.user.school_id;

    if (!message || !studentIds || studentIds.length === 0) {
      return res.status(400).json({ message: 'Message and student IDs are required' });
    }

    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      const sentRecords = [];

      for (const studentId of studentIds) {
        const studentCheck = await client.query(
          'SELECT parent_phone, first_name FROM students WHERE id = $1 AND school_id = $2',
          [studentId, schoolId]
        );

        if (studentCheck.rows.length === 0) {
          continue; // Skip students not found
        }

        const parentPhone = studentCheck.rows[0].parent_phone;
        if (!parentPhone) {
          continue; // Skip students without phone
        }

        const result = await client.query(
          `INSERT INTO sms_logs (school_id, student_id, recipient_phone, message, message_type, status, sent_by)
           VALUES ($1, $2, $3, $4, $5, 'sent', $6)
           RETURNING *`,
          [schoolId, studentId, parentPhone, message, messageType || 'general', req.user.id]
        );

        sentRecords.push(result.rows[0]);
      }

      await client.query('COMMIT');
      res.status(201).json({
        message: `SMS sent to ${sentRecords.length} recipients`,
        sentCount: sentRecords.length,
        records: sentRecords
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    res.status(500).json({ message: 'Error sending SMS', error: error.message });
  }
};

exports.getSMSHistory = async (req, res) => {
  try {
    const schoolId = req.user.school_id;
    const { studentId, startDate, endDate, messageType } = req.query;

    let query = `
      SELECT s.*, st.first_name, st.last_name, st.admission_number
      FROM sms_logs s
      LEFT JOIN students st ON s.student_id = st.id
      WHERE s.school_id = $1
    `;
    const params = [schoolId];

    if (studentId) {
      query += ` AND s.student_id = $${params.length + 1}`;
      params.push(studentId);
    }

    if (messageType) {
      query += ` AND s.message_type = $${params.length + 1}`;
      params.push(messageType);
    }

    if (startDate) {
      query += ` AND s.created_at >= $${params.length + 1}`;
      params.push(startDate);
    }

    if (endDate) {
      query += ` AND s.created_at <= $${params.length + 1}`;
      params.push(endDate);
    }

    query += ` ORDER BY s.created_at DESC LIMIT 1000`;

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getSMSStats = async (req, res) => {
  try {
    const schoolId = req.user.school_id;
    const { startDate, endDate } = req.query;

    let query = `
      SELECT 
        message_type,
        status,
        COUNT(*) as count
      FROM sms_logs
      WHERE school_id = $1
    `;
    const params = [schoolId];

    if (startDate) {
      query += ` AND created_at >= $${params.length + 1}`;
      params.push(startDate);
    }

    if (endDate) {
      query += ` AND created_at <= $${params.length + 1}`;
      params.push(endDate);
    }

    query += ` GROUP BY message_type, status ORDER BY message_type`;

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.sendFeeReminder = async (req, res) => {
  try {
    const schoolId = req.user.school_id;
    const { gradeId } = req.body;

    // Get all students with pending fees
    let query = `
      SELECT DISTINCT s.id, s.first_name, s.last_name, s.parent_phone, 
             (SELECT SUM(amount) FROM fee_structures WHERE grade = s.current_grade AND school_id = $1) as totalCharged,
             (SELECT SUM(amount) FROM fee_payments WHERE student_id = s.id AND school_id = $1) as totalPaid
      FROM students s
      WHERE s.school_id = $1 AND s.status = 'active'
    `;
    const params = [schoolId];

    if (gradeId) {
      query += ` AND s.current_grade = $${params.length + 1}`;
      params.push(gradeId);
    }

    const students = await db.query(query, params);

    const sentRecords = [];

    for (const student of students.rows) {
      const balance = (student.totalCharged || 0) - (student.totalPaid || 0);

      if (balance > 0 && student.parent_phone) {
        const reminderMessage = `Hello, ${student.first_name}'s school fees balance is KES ${balance}. Please pay at your earliest convenience.`;

        const result = await db.query(
          `INSERT INTO sms_logs (school_id, student_id, recipient_phone, message, message_type, status, sent_by)
           VALUES ($1, $2, $3, $4, 'fee_reminder', 'sent', $5)
           RETURNING *`,
          [schoolId, student.id, student.parent_phone, reminderMessage, req.user.id]
        );

        sentRecords.push(result.rows[0]);
      }
    }

    res.status(201).json({
      message: `Fee reminder sent to ${sentRecords.length} parents`,
      sentCount: sentRecords.length
    });
  } catch (error) {
    res.status(500).json({ message: 'Error sending reminders', error: error.message });
  }
};
