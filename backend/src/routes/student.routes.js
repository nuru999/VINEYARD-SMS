const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth.middleware');

// Placeholder - create student.controller.js next
router.get('/', authenticate, (req, res) => {
  res.json({ message: 'Students list endpoint' });
});

router.post('/', authenticate, authorize('super_admin', 'principal'), (req, res) => {
  res.json({ message: 'Create student endpoint' });
});

module.exports = router;