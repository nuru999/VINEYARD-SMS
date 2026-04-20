const express = require('express');
const router = express.Router();
const reportController = require('../controllers/report.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

router.get('/card/:studentId', authenticate, reportController.getReportCard);
router.get('/class', authenticate, authorize('teacher', 'principal'), reportController.getClassReport);

module.exports = router;