const express = require('express');
const router = express.Router();

// M-Pesa STK Push callback
router.post('/mpesa', (req, res) => {
  const callback = req.body;
  
  console.log('M-Pesa Callback received:', JSON.stringify(callback, null, 2));
  
  // TODO: Process payment confirmation
  // 1. Verify transaction
  // 2. Update fee_payments table
  // 3. Send SMS receipt to parent
  
  // Must respond with 200 or M-Pesa will retry
  res.json({ ResultCode: 0, ResultDesc: 'Success' });
});

module.exports = router;