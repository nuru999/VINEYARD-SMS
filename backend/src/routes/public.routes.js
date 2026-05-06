const express = require('express');
const router = express.Router();
const db = require('../config/database');
const mpesaService = require('../services/mpesa.service');
const { generateTransactionCode } = require('../utils/helpers');

/**
 * GET /api/public/pay?admissionNumber=VIN/2026/0003
 * Uses query string to avoid slashes breaking URL routing.
 */
router.get('/pay', async (req, res) => {
  try {
    const { admissionNumber } = req.query;

    if (!admissionNumber) {
      return res.status(400).json({ message: 'admissionNumber query parameter is required.' });
    }

    const studentResult = await db.query(
      `SELECT id, first_name, last_name, admission_number, current_grade, stream, school_id, status
       FROM students
       WHERE admission_number = $1 AND status = 'active'`,
      [admissionNumber.toUpperCase()]
    );

    if (studentResult.rows.length === 0) {
      return res.status(404).json({ message: 'Student not found. Please check the admission number.' });
    }

    const student = studentResult.rows[0];

    const feeStructure = await db.query(
      `SELECT * FROM fee_structures WHERE school_id = $1 AND grade = $2 ORDER BY category`,
      [student.school_id, student.current_grade]
    );

    const payments = await db.query(
      `SELECT id, amount, payment_method, transaction_code, mpesa_receipt_number,
              status, payment_date, created_at, notes
       FROM fee_payments WHERE student_id = $1
       ORDER BY payment_date DESC, created_at DESC`,
      [student.id]
    );

    const totalCharged = feeStructure.rows.reduce((sum, fee) => sum + parseFloat(fee.amount || 0), 0);
    const totalPaid = payments.rows
      .filter((p) => p.status === 'completed')
      .reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
    const balance = totalCharged - totalPaid;

    res.json({
      student: {
        id: student.id,
        name: `${student.first_name} ${student.last_name}`,
        admissionNumber: student.admission_number,
        grade: student.current_grade,
        stream: student.stream,
      },
      feeStructure: feeStructure.rows,
      payments: payments.rows,
      summary: {
        totalCharged,
        totalPaid,
        balance,
        pendingAmount: Math.max(balance, 0),
        status: balance <= 0 ? 'paid' : 'owing',
      },
    });
  } catch (error) {
    console.error('❌ Public fee statement error:', error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * POST /api/public/pay/initiate
 */
router.post('/pay/initiate', async (req, res) => {
  try {
    const { admissionNumber, phoneNumber, amount } = req.body;

    if (!admissionNumber || !phoneNumber || !amount) {
      return res.status(400).json({ message: 'Missing required fields', required: ['admissionNumber', 'phoneNumber', 'amount'] });
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount < 1) {
      return res.status(400).json({ message: 'Amount must be at least KES 1' });
    }

    if (!mpesaService.isConfigured()) {
      return res.status(503).json({ message: 'M-Pesa is not configured on this server. Please contact the school.' });
    }

    const studentResult = await db.query(
      `SELECT id, first_name, last_name, admission_number, school_id
       FROM students WHERE admission_number = $1 AND status = 'active'`,
      [admissionNumber.toUpperCase()]
    );

    if (studentResult.rows.length === 0) {
      return res.status(404).json({ message: 'Student not found.' });
    }

    const student = studentResult.rows[0];

    const existing = await db.query(
      `SELECT id, mpesa_checkout_id FROM fee_payments
       WHERE student_id = $1 AND status = 'pending' AND created_at > NOW() - INTERVAL '5 minutes'`,
      [student.id]
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({
        message: 'A payment is already in progress. Please wait a few minutes.',
        checkoutRequestId: existing.rows[0].mpesa_checkout_id,
      });
    }

    const accountReference = student.admission_number;
    const transactionDesc = `${student.first_name} ${student.last_name}`.substring(0, 13);

    let stkResponse;
    try {
      stkResponse = await mpesaService.initiateSTKPush(phoneNumber, numAmount, accountReference, transactionDesc);
    } catch (mpesaError) {
      return res.status(503).json({ message: 'M-Pesa payment initiation failed', error: mpesaError.message });
    }

    if (!stkResponse.checkoutRequestId) {
      return res.status(503).json({ message: 'M-Pesa did not return a checkout ID.' });
    }

    const transactionCode = generateTransactionCode();
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `INSERT INTO fee_payments (student_id, amount, payment_method, transaction_code, mpesa_checkout_id, status, phone_number, payment_date)
         VALUES ($1, $2, 'mpesa', $3, $4, 'pending', $5, CURRENT_DATE)`,
        [student.id, numAmount, transactionCode, stkResponse.checkoutRequestId, phoneNumber]
      );
      await client.query('COMMIT');
    } catch (dbErr) {
      await client.query('ROLLBACK');
      throw dbErr;
    } finally {
      client.release();
    }

    res.status(201).json({
      message: 'STK Push sent. Please check your phone and enter your M-Pesa PIN.',
      checkoutRequestId: stkResponse.checkoutRequestId,
      transactionCode,
      student: { name: `${student.first_name} ${student.last_name}`, admissionNumber: accountReference },
      amount: numAmount,
    });
  } catch (error) {
    res.status(500).json({ message: 'Payment initiation failed', error: error.message });
  }
});

/**
 * GET /api/public/pay/status/:checkoutRequestId
 */
router.get('/pay/status/:checkoutRequestId', async (req, res) => {
  try {
    const { checkoutRequestId } = req.params;

    const result = await db.query(
      `SELECT status, mpesa_receipt_number, amount, completed_at, failure_reason
       FROM fee_payments WHERE mpesa_checkout_id = $1
       ORDER BY created_at DESC LIMIT 1`,
      [checkoutRequestId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Payment not found.' });
    }

    const payment = result.rows[0];
    res.json({
      status: payment.status,
      receiptNumber: payment.mpesa_receipt_number,
      amount: payment.amount,
      completedAt: payment.completed_at,
      failureReason: payment.failure_reason,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
