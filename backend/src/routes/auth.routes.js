const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth.middleware');
const validate = require('../middleware/validation.middleware');
const { signupSchema } = require('../validators/schemas');

// Keep login behavior consistent for existing API clients/tests.
router.post('/login', authController.login);
router.post('/signup', validate(signupSchema), authController.signup);
router.post('/setup', authController.setupAdmin);
router.get('/profile', authenticate, authController.getProfile);

module.exports = router;