const express = require('express');
const router = express.Router();
const auditController = require('../controllers/audit.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

router.get('/', authenticate, authorize('super_admin', 'principal'), auditController.getAuditLogs);
router.get('/summary', authenticate, authorize('super_admin', 'principal'), auditController.getAuditSummary);
router.get('/user/:userId', authenticate, authorize('super_admin', 'principal'), auditController.getUserActivity);
router.get('/resource', authenticate, authorize('super_admin', 'principal'), auditController.getResourceHistory);
router.delete('/old-logs', authenticate, authorize('super_admin'), auditController.deleteOldLogs);

module.exports = router;
