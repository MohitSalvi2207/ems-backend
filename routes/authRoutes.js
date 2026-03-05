const express = require('express');
const router = express.Router();
const { register, login, logout, refreshToken, getMe } = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const logActivity = require('../middleware/activityLog');

router.post('/register', register);
router.post('/login', logActivity('User logged in', 'auth'), login);
router.post('/logout', protect, logActivity('User logged out', 'auth'), logout);
router.post('/refresh', refreshToken);
router.get('/me', protect, getMe);

module.exports = router;
