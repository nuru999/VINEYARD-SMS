const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth.middleware');

router.post('/login', authController.login);
router.post('/signup', authController.signup);
router.post('/setup', authController.setupAdmin);
router.get('/profile', authenticate, authController.getProfile);

module.exports = router;