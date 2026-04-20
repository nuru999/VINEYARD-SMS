const express = require('express');
const router = express.Router();
const db = require('../config/database');
const mpesaService = require('../services/mpesa.service');

/**
 * M-Pesa STK Push callback
 * This endpoint receives payment confirmation from M-Pesa
 */
router.post('/mpesa', async (req, res) => {
  try {
    const callbackData = req.body;

    console.log('\n═══════════════════════════════════════════════');
    console.log('📱 M-Pesa Callback Received');
    console.log('═══════════════════════════════════════════════');
    console.log(JSON.stringify(callbackData, null, 2));

    // Validate callback structure
    const validation = mpesaService.validateCallback(callbackData);
    if (!validation.valid) {
      console.error('❌ Invalid callback structure:', validation.error);
      // Still respond with 200 to prevent M-Pesa retries
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
      // Payment successful
      console.log('🎉 Payment successful!');
      
      const transactionDetails = mpesaService.extractTransactionDetails(stkCallback.CallbackMetadata);

      // Update payment record
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
      console.log(`✅ Payment record updated in database`);

      // Log successful payment
      console.log('═══════════════════════════════════════════════\n');
    } else {
      // Payment failed
      console.warn(`⚠️  Payment failed with code: ${resultCode}`);
      console.warn(`Reason: ${stkCallback.ResultDesc}`);

      // Update payment record with failure status
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

    // Always respond with 200 to acknowledge receipt
    res.json({ ResultCode: 0, ResultDesc: 'Callback received and processed' });
  } catch (error) {
    console.error('❌ Error processing M-Pesa callback:', error);
    console.log('═══════════════════════════════════════════════\n');
    // Still respond with 200 to prevent retries
    res.json({ ResultCode: 0, ResultDesc: 'Callback received' });
  }
});

/**
 * M-Pesa C2B validation endpoint
 * Used for PayBill payments
 */
router.post('/mpesa/validation', (req, res) => {
  try {
    const validation = req.body;
    console.log('🔍 M-Pesa Validation Request:', validation);

    // Accept all validations (in production, add business logic)
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
 * Receives confirmed payments
 */
router.post('/mpesa/confirmation', async (req, res) => {
  try {
    const confirmation = req.body;
    console.log('✅ M-Pesa Confirmation Received:', confirmation);

    // Process C2B payment confirmation
    // This would typically match the AccountReference to a student and record payment
    const accountReference = confirmation.BillRefNumber;
    const amount = confirmation.TransAmount;
    const transactionId = confirmation.TransID;
    const phoneNumber = confirmation.MSISDN;

    // Find student by admission number (if stored in AccountReference)
    const studentResult = await db.query(
      'SELECT id, school_id FROM students WHERE admission_number = $1',
      [accountReference]
    );

    if (studentResult.rows.length > 0) {
      const student = studentResult.rows[0];

      // Record payment
      await db.query(
        `INSERT INTO fee_payments
         (student_id, amount, payment_method, transaction_code, status, phone_number, recorded_by)
         VALUES ($1, $2, 'mpesa', $3, 'completed', $4, (SELECT id FROM users WHERE school_id = $5 AND role = 'bursar' LIMIT 1))
         ON CONFLICT DO NOTHING`,
        [student.id, amount, transactionId, phoneNumber, student.school_id]
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