const express = require('express');
const router = express.Router();
const curriculumController = require('../controllers/curriculum.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

// CBC Strands
router.get('/strands', authenticate, curriculumController.getStrands);
router.post('/strands', authenticate, authorize('super_admin', 'principal'), curriculumController.createStrand);
router.put('/strands/:id', authenticate, authorize('super_admin', 'principal'), curriculumController.updateStrand);
router.delete('/strands/:id', authenticate, authorize('super_admin', 'principal'), curriculumController.deleteStrand);

// CBC Sub-Strands
router.get('/sub-strands', authenticate, curriculumController.getSubStrands);
router.post('/sub-strands', authenticate, authorize('super_admin', 'principal'), curriculumController.createSubStrand);
router.put('/sub-strands/:id', authenticate, authorize('super_admin', 'principal'), curriculumController.updateSubStrand);
router.delete('/sub-strands/:id', authenticate, authorize('super_admin', 'principal'), curriculumController.deleteSubStrand);

// Teacher Assignments
router.get('/assignments', authenticate, curriculumController.getAssignments);
router.post('/assignments', authenticate, authorize('super_admin', 'principal'), curriculumController.createAssignment);
router.put('/assignments/:id', authenticate, authorize('super_admin', 'principal'), curriculumController.updateAssignment);
router.delete('/assignments/:id', authenticate, authorize('super_admin', 'principal'), curriculumController.deleteAssignment);

module.exports = router;
