const express = require('express');
const router = express.Router();
const subjectController = require('../controllers/subject.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

router.get('/', authenticate, subjectController.getSubjects);
router.post('/', authenticate, authorize('super_admin', 'principal'), subjectController.createSubject);
router.put('/:id', authenticate, authorize('super_admin', 'principal'), subjectController.updateSubject);
router.delete('/:id', authenticate, authorize('super_admin', 'principal'), subjectController.deleteSubject);

module.exports = router;
