const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendance.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

router.get('/by-date', authenticate, attendanceController.getAttendanceByDate);
router.get('/student/:studentId', authenticate, attendanceController.getStudentAttendance);
router.get('/summary', authenticate, attendanceController.getAttendanceSummary);
router.post('/mark', authenticate, authorize('super_admin', 'principal', 'teacher'), attendanceController.markAttendance);
router.post('/bulk-mark', authenticate, authorize('super_admin', 'principal', 'teacher'), attendanceController.bulkMarkAttendance);

module.exports = router;
