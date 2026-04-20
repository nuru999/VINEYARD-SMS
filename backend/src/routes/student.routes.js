const express = require('express');
const router = express.Router();
const studentController = require('../controllers/student.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const validate = require('../middleware/validation.middleware');
const { createStudentSchema } = require('../validators/schemas');

router.get('/', authenticate, studentController.getStudents);
router.get('/:id', authenticate, studentController.getStudentById);
router.post('/', authenticate, authorize('super_admin', 'principal'), validate(createStudentSchema), studentController.createStudent);
router.put('/:id', authenticate, authorize('super_admin', 'principal', 'teacher'), studentController.updateStudent);
router.delete('/:id', authenticate, authorize('super_admin', 'principal'), studentController.deleteStudent);

module.exports = router;