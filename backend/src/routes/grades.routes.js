const express = require('express');
const router = express.Router();
const gradeController = require('../controllers/grade.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

router.get('/assessments', authenticate, gradeController.getAssessments);
router.post('/assessments', authenticate, authorize('teacher', 'principal'), gradeController.createAssessment);
router.get('/assessment/:assessmentId', authenticate, gradeController.getAssessmentGrades);
router.post('/844/:assessmentId', authenticate, authorize('teacher', 'principal'), gradeController.enterGrades844);
router.post('/cbc/:assessmentId', authenticate, authorize('teacher', 'principal'), gradeController.enterGradesCBC);

module.exports = router;