const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth.middleware');

router.get('/student/:studentId', authenticate, (req, res) => {
  res.json({ message: 'Fee statement for student' });
});

router.post('/payment', authenticate, authorize('bursar', 'principal'), (req, res) => {
  res.json({ message: 'Record payment endpoint' });
});

module.exports = router;