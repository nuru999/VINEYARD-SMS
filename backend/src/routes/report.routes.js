const express = require('express');
const router = express.Router();

router.get('/card/:studentId', (req, res) => {
  res.json({ message: `Report card for student ${req.params.studentId}` });
});

module.exports = router;