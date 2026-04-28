const express = require('express');
const router = express.Router();
const reportController = require('../controllers/report.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

router.get('/terms', authenticate, reportController.getReportTerms);
router.get('/card/:studentId', authenticate, reportController.getReportCard);
router.get('/class', authenticate, authorize('teacher', 'principal', 'super_admin'), reportController.getClassReport);

module.exports = router;