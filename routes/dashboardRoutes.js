const express = require('express');
const router = express.Router();
const { getDashboardStats, getActivityLogs } = require('../controllers/dashboardController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.get('/', authorize('superadmin', 'admin'), getDashboardStats);
router.get('/logs', authorize('superadmin'), getActivityLogs);

module.exports = router;
