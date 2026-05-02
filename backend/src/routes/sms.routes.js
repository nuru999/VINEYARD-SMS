const express = require('express');
const router = express.Router();
const smsController = require('../controllers/sms.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

router.post('/send', authenticate, authorize('super_admin', 'principal', 'bursar'), smsController.sendSMS);
router.post('/send-bulk', authenticate, authorize('super_admin', 'principal', 'bursar'), smsController.sendBulkSMS);
router.post('/send-fee-reminder', authenticate, authorize('super_admin', 'principal', 'bursar'), smsController.sendFeeReminder);
router.get('/history', authenticate, smsController.getSMSHistory);
router.get('/stats', authenticate, smsController.getSMSStats);

module.exports = router;
