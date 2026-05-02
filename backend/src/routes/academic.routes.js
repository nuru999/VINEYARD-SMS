const express = require('express');
const router = express.Router();
const academicController = require('../controllers/academic.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

// Academic Years
router.get('/years', authenticate, academicController.getAcademicYears);
router.post('/years', authenticate, authorize('super_admin', 'principal'), academicController.createAcademicYear);
router.put('/years/:id/set-current', authenticate, authorize('super_admin', 'principal'), academicController.setCurrentAcademicYear);
router.delete('/years/:id', authenticate, authorize('super_admin', 'principal'), academicController.deleteAcademicYear);

// Terms
router.get('/terms', authenticate, academicController.getTerms);
router.post('/terms', authenticate, authorize('super_admin', 'principal'), academicController.createTerm);
router.put('/terms/:id', authenticate, authorize('super_admin', 'principal'), academicController.updateTerm);
router.put('/terms/:id/set-current', authenticate, authorize('super_admin', 'principal'), academicController.setCurrentTerm);
router.delete('/terms/:id', authenticate, authorize('super_admin', 'principal'), academicController.deleteTerm);

module.exports = router;
