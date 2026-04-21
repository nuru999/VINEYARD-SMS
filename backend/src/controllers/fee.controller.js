const db = require('../config/database');
const mpesaService = require('../services/mpesa.service');
const { generateTransactionCode } = require('../utils/helpers');

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

    // Validate input
    if (!studentId || !amount || !phoneNumber) {
      return res.status(400).json({
        message: 'Missing required fields',
        required: ['studentId', 'amount', 'phoneNumber']
      });
    }

    // Validate amount
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount < 1) {
      return res.status(400).json({
        message: 'Amount must be a valid number greater than 0'
      });
    }

    // Check if M-Pesa is configured
    if (!mpesaService.isConfigured()) {
      return res.status(503).json({
        message: 'M-Pesa is not configured',
        details: 'Please configure M-Pesa credentials in .env file',
        configStatus: mpesaService.getConfigStatus()
      });
    }

    // Verify student
    const student = await db.query(
      'SELECT id, first_name, last_name, admission_number FROM students WHERE id = $1 AND school_id = $2',
      [studentId, schoolId]
    );

    if (student.rows.length === 0) {
      return res.status(404).json({ message: 'Student not found' });
    }

    const studentData = student.rows[0];
    const accountReference = studentData.admission_number;
        // ✅ NEW: Prevent duplicate STK push within 5 minutes
    const existingPending = await db.query(
      `SELECT id, mpesa_checkout_id, created_at 
       FROM fee_payments 
       WHERE student_id = $1 AND status = 'pending' 
       AND created_at > NOW() - INTERVAL '5 minutes'`,
      [studentId]
    );

    if (existingPending.rows.length > 0) {
      return res.status(409).json({
        message: 'A payment is already in progress for this student',
        checkoutRequestId: existingPending.rows[0].mpesa_checkout_id,
        initiatedAt: existingPending.rows[0].created_at
      });
    }
    const transactionDesc = `${studentData.first_name} ${studentData.last_name}`.substring(0, 13);

    console.log(`\n💳 Processing M-Pesa payment:`);
    console.log(`   Student: ${studentData.first_name} ${studentData.last_name}`);
    console.log(`   Amount: KES ${numAmount}`);
    console.log(`   Phone: ${phoneNumber}`);

    // Initiate M-Pesa STK Push
    let stkResponse;
    try {
      stkResponse = await mpesaService.initiateSTKPush(
        phoneNumber,
        numAmount,
        accountReference,
        transactionDesc
      );
    } catch (mpesaError) {
      console.error(`❌ M-Pesa Error: ${mpesaError.message}`);
      return res.status(503).json({
        message: 'M-Pesa payment initiation failed',
        error: mpesaError.message,
        details: 'Check your M-Pesa credentials and try again'
      });
    }

    // Verify M-Pesa response
    if (!stkResponse.checkoutRequestId) {
      return res.status(503).json({
        message: 'M-Pesa did not return checkout ID',
        response: stkResponse
      });
    }

    // Record pending payment
    const transactionCode = generateTransactionCode();
    const client = await db.pool.connect();
    
    try {
      await client.query('BEGIN');

      const paymentInsert = await client.query(
        `INSERT INTO fee_payments
         (student_id, amount, payment_method, transaction_code, mpesa_checkout_id,
          status, phone_number, recorded_by, payment_date)
         VALUES ($1, $2, 'mpesa', $3, $4, 'pending', $5, $6, CURRENT_DATE)
         RETURNING id`,
        [studentId, numAmount, transactionCode, stkResponse.checkoutRequestId, phoneNumber, req.user.id]
      );

      await client.query('COMMIT');

      console.log(`✅ Payment initiated with CheckoutID: ${stkResponse.checkoutRequestId}`);
      console.log(`✅ Payment record created: ${paymentInsert.rows[0].id}\n`);

      res.status(201).json({
        message: 'M-Pesa payment initiated successfully',
        checkoutRequestId: stkResponse.checkoutRequestId,
        merchantRequestId: stkResponse.merchantRequestId,
        responseCode: stkResponse.responseCode,
        responseDescription: stkResponse.responseDescription,
        transactionCode: transactionCode,
        student: {
          id: studentId,
          name: `${studentData.first_name} ${studentData.last_name}`,
          admissionNumber: accountReference
        },
        payment: {
          amount: numAmount,
          phoneNumber: phoneNumber,
          status: 'pending',
          nextStep: 'Customer will receive STK prompt. Payment will be confirmed when completed.'
        }
      });
    } catch (dbError) {
      await client.query('ROLLBACK');
      throw dbError;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error(`❌ Payment initiation error: ${error.message}`);
    res.status(500).json({
      message: 'Payment initiation failed',
      error: error.message
    });
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