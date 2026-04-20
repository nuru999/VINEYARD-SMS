const express = require('express');
const router = express.Router();
const feeController = require('../controllers/fee.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

router.get('/student/:studentId', authenticate, feeController.getFeeStatement);
router.get('/payments/:studentId', authenticate, feeController.getPaymentHistory);
router.post('/payment', authenticate, authorize('bursar', 'principal'), feeController.recordPayment);
router.post('/mpesa/initiate', authenticate, authorize('bursar', 'principal', 'parent'), feeController.initiateMpesaPayment);

module.exports = router;