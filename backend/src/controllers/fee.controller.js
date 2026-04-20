const db = require('../config/database');
const MpesaService = require('../services/mpesa.service');
const { generateTransactionCode } = require('../utils/helpers');

const mpesaService = new MpesaService();

exports.getFeeStatement = async (req, res) => {
  try {
    const { studentId } = req.params;
    const schoolId = req.user.school_id;

    // Verify student belongs to school
    const studentCheck = await db.query(
      'SELECT id FROM students WHERE id = $1 AND school_id = $2',
      [studentId, schoolId]
    );

    if (studentCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Student not found' });
    }

    // Get fee structure for student's grade
    const student = await db.query(
      'SELECT current_grade FROM students WHERE id = $1',
      [studentId]
    );

    const feeStructure = await db.query(
      `SELECT * FROM fee_structures
       WHERE school_id = $1 AND grade = $2
       ORDER BY category`,
      [schoolId, student.rows[0].current_grade]
    );

    // Get payments made
    const payments = await db.query(
      `SELECT * FROM fee_payments
       WHERE student_id = $1
       ORDER BY payment_date DESC`,
      [studentId]
    );

    // Calculate totals
    const totalCharged = feeStructure.rows.reduce((sum, fee) => sum + parseFloat(fee.amount), 0);
    const totalPaid = payments.rows.reduce((sum, payment) => sum + parseFloat(payment.amount), 0);
    const balance = totalCharged - totalPaid;

    res.json({
      studentId,
      feeStructure: feeStructure.rows,
      payments: payments.rows,
      summary: {
        totalCharged,
        totalPaid,
        balance,
        status: balance <= 0 ? 'paid' : 'owing'
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.recordPayment = async (req, res) => {
  try {
    const { studentId, amount, paymentMethod, reference, description } = req.body;
    const schoolId = req.user.school_id;
    const recordedBy = req.user.id;

    // Verify student belongs to school
    const studentCheck = await db.query(
      'SELECT id, first_name, last_name FROM students WHERE id = $1 AND school_id = $2',
      [studentId, schoolId]
    );

    if (studentCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Student not found' });
    }

    const transactionCode = generateTransactionCode();

    const result = await db.query(
      `INSERT INTO fee_payments
       (student_id, amount, payment_method, transaction_code, reference_number,
        description, recorded_by, payment_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_DATE)
       RETURNING *`,
      [studentId, amount, paymentMethod, transactionCode, reference, description, recordedBy]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.initiateMpesaPayment = async (req, res) => {
  try {
    const { studentId, amount, phoneNumber } = req.body;
    const schoolId = req.user.school_id;

    // Verify student
    const student = await db.query(
      'SELECT first_name, last_name, admission_number FROM students WHERE id = $1 AND school_id = $2',
      [studentId, schoolId]
    );

    if (student.rows.length === 0) {
      return res.status(404).json({ message: 'Student not found' });
    }

    const studentData = student.rows[0];
    const accountReference = studentData.admission_number;
    const transactionDesc = `School fees - ${studentData.first_name} ${studentData.last_name}`;

    // Initiate M-Pesa STK Push
    const stkResponse = await mpesaService.initiateSTKPush(
      phoneNumber,
      amount,
      accountReference,
      transactionDesc
    );

    // Record pending payment
    const transactionCode = generateTransactionCode();
    await db.query(
      `INSERT INTO fee_payments
       (student_id, amount, payment_method, transaction_code, mpesa_checkout_id,
        status, recorded_by)
       VALUES ($1, $2, 'mpesa', $3, $4, 'pending', $5)`,
      [studentId, amount, transactionCode, stkResponse.CheckoutRequestID, req.user.id]
    );

    res.json({
      message: 'M-Pesa payment initiated',
      checkoutRequestId: stkResponse.CheckoutRequestID,
      responseCode: stkResponse.ResponseCode,
      responseDescription: stkResponse.ResponseDescription,
      transactionCode
    });
  } catch (error) {
    res.status(500).json({ message: 'Payment initiation failed', error: error.message });
  }
};

exports.getPaymentHistory = async (req, res) => {
  try {
    const { studentId } = req.params;
    const schoolId = req.user.school_id;
    const { startDate, endDate } = req.query;

    // Verify student belongs to school
    const studentCheck = await db.query(
      'SELECT id FROM students WHERE id = $1 AND school_id = $2',
      [studentId, schoolId]
    );

    if (studentCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Student not found' });
    }

    let query = `SELECT fp.*, u.first_name as recorded_by_name
                 FROM fee_payments fp
                 LEFT JOIN users u ON fp.recorded_by = u.id
                 WHERE fp.student_id = $1`;
    const params = [studentId];

    if (startDate) {
      query += ` AND fp.payment_date >= $${params.length + 1}`;
      params.push(startDate);
    }

    if (endDate) {
      query += ` AND fp.payment_date <= $${params.length + 1}`;
      params.push(endDate);
    }

    query += ` ORDER BY fp.payment_date DESC, fp.created_at DESC`;

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};