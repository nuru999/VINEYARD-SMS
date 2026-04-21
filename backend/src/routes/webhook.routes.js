const express = require('express');
const router = express.Router();
const db = require('../config/database');
const mpesaService = require('../services/mpesa.service');

/**
 * M-Pesa STK Push callback
 */
router.post('/mpesa', async (req, res) => {
  try {
    const callbackData = req.body;

    console.log('\n═══════════════════════════════════════════════');
    console.log('📱 M-Pesa Callback Received');
    console.log('═══════════════════════════════════════════════');
    console.log(JSON.stringify(callbackData, null, 2));

    const validation = mpesaService.validateCallback(callbackData);
    if (!validation.valid) {
      console.error('❌ Invalid callback structure:', validation.error);
      return res.json({ ResultCode: 0, ResultDesc: 'Callback received' });
    }

    const stkCallback = callbackData.Body.stkCallback;
    const checkoutRequestId = validation.checkoutRequestId;
    const resultCode = validation.resultCode;

    console.log(`CheckoutRequestID: ${checkoutRequestId}`);
    console.log(`ResultCode: ${resultCode}`);

    // Find pending payment
    const paymentResult = await db.query(
      `SELECT fp.*, s.first_name, s.last_name, s.admission_number
       FROM fee_payments fp
       JOIN students s ON fp.student_id = s.id
       WHERE fp.mpesa_checkout_id = $1`,
      [checkoutRequestId]
    );

    if (paymentResult.rows.length === 0) {
      console.warn(`⚠️  No pending payment found for CheckoutRequestID: ${checkoutRequestId}`);
      return res.json({ ResultCode: 0, ResultDesc: 'Callback received' });
    }

    const payment = paymentResult.rows[0];
    console.log(`✅ Payment found for ${payment.first_name} ${payment.last_name}`);

    if (resultCode === 0) {
      console.log('🎉 Payment successful!');
      
      const transactionDetails = mpesaService.extractTransactionDetails(stkCallback.CallbackMetadata);

      // ✅ NEW: VERIFY AMOUNT MATCHES (prevent tampering)
      const callbackAmount = transactionDetails?.amount || 0;
      const expectedAmount = parseFloat(payment.amount);
      
      if (callbackAmount !== expectedAmount) {
        console.error(`🚨 AMOUNT MISMATCH! Expected: ${expectedAmount}, Got: ${callbackAmount}`);
        await db.query(
          `UPDATE fee_payments
           SET status = 'disputed',
               failure_reason = $1,
               completed_at = CURRENT_TIMESTAMP
           WHERE mpesa_checkout_id = $2`,
          [`Amount mismatch: expected ${expectedAmount}, got ${callbackAmount}`, checkoutRequestId]
        );
        return res.json({ ResultCode: 0, ResultDesc: 'Amount mismatch logged' });
      }

      await db.query(
        `UPDATE fee_payments
         SET status = 'completed',
             mpesa_receipt_number = $1,
             mpesa_transaction_date = $2,
             phone_number = $3,
             completed_at = CURRENT_TIMESTAMP
         WHERE mpesa_checkout_id = $4`,
        [
          transactionDetails?.mpesaReceiptNumber || 'PENDING',
          transactionDetails?.transactionDate || null,
          transactionDetails?.phoneNumber || null,
          checkoutRequestId
        ]
      );

      console.log(`💰 Amount: KES ${payment.amount}`);
      console.log(`📜 Receipt: ${transactionDetails?.mpesaReceiptNumber || 'PENDING'}`);
      console.log(`✅ Payment record updated`);
      console.log('═══════════════════════════════════════════════\n');
    } else {
      console.warn(`⚠️  Payment failed with code: ${resultCode}`);
      console.warn(`Reason: ${stkCallback.ResultDesc}`);

      await db.query(
        `UPDATE fee_payments
         SET status = 'failed',
             failure_reason = $1,
             completed_at = CURRENT_TIMESTAMP
         WHERE mpesa_checkout_id = $2`,
        [stkCallback.ResultDesc, checkoutRequestId]
      );

      console.log(`❌ Payment failed - Record updated`);
      console.log('═══════════════════════════════════════════════\n');
    }

    res.json({ ResultCode: 0, ResultDesc: 'Callback received and processed' });
  } catch (error) {
    console.error('❌ Error processing M-Pesa callback:', error);
    console.log('═══════════════════════════════════════════════\n');
    res.json({ ResultCode: 0, ResultDesc: 'Callback received' });
  }
});

/**
 * M-Pesa C2B validation endpoint
 */
router.post('/mpesa/validation', async (req, res) => {
  try {
    const validation = req.body;
    console.log('🔍 M-Pesa Validation Request:', validation);

    const { BillRefNumber } = validation;

    // ✅ NEW: Verify student exists before accepting
    if (BillRefNumber) {
      const student = await db.query(
        'SELECT id FROM students WHERE admission_number = $1',
        [BillRefNumber]
      );
      
      if (student.rows.length === 0) {
        console.warn(`❌ Invalid AccountReference: ${BillRefNumber}`);
        return res.json({ 
          ResultCode: 1, 
          ResultDesc: 'Invalid account reference' 
        });
      }
    }

    res.json({ 
      ResultCode: 0, 
      ResultDesc: 'Validation Accepted',
      ThirdPartyTransID: validation.TransID || 'ACCEPTED'
    });
  } catch (error) {
    console.error('❌ Validation error:', error);
    res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
  }
});

/**
 * M-Pesa C2B confirmation endpoint
 */
router.post('/mpesa/confirmation', async (req, res) => {
  try {
    const confirmation = req.body;
    console.log('✅ M-Pesa Confirmation Received:', confirmation);

    const accountReference = confirmation.BillRefNumber;
    const amount = confirmation.TransAmount;
    const transactionId = confirmation.TransID;
    const phoneNumber = confirmation.MSISDN;

    // ✅ NEW: IDEMPOTENCY CHECK — prevent duplicate payments
    const existing = await db.query(
      'SELECT id FROM fee_payments WHERE mpesa_receipt_number = $1',
      [transactionId]
    );

    if (existing.rows.length > 0) {
      console.log(`⚠️  Payment ${transactionId} already recorded. Ignoring duplicate.`);
      return res.json({ 
        ResultCode: 0, 
        ResultDesc: 'Duplicate ignored',
        ThirdPartyTransID: transactionId
      });
    }

    const studentResult = await db.query(
      'SELECT id, school_id FROM students WHERE admission_number = $1',
      [accountReference]
    );

    if (studentResult.rows.length > 0) {
      const student = studentResult.rows[0];

      await db.query(
        `INSERT INTO fee_payments
         (student_id, amount, payment_method, transaction_code, mpesa_receipt_number, status, phone_number, recorded_by)
         VALUES ($1, $2, 'mpesa', $3, $4, 'completed', $5, (SELECT id FROM users WHERE school_id = $6 AND role = 'bursar' LIMIT 1))`,
        [student.id, amount, transactionId, transactionId, phoneNumber, student.school_id]
      );

      console.log(`✅ Payment recorded for student: ${accountReference}`);
    }

    res.json({ 
      ResultCode: 0, 
      ResultDesc: 'Confirmation received',
      ThirdPartyTransID: transactionId
    });
  } catch (error) {
    console.error('❌ Confirmation error:', error);
    res.json({ ResultCode: 0, ResultDesc: 'Received' });
  }
});

module.exports = router;