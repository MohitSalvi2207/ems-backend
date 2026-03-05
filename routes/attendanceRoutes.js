const express = require('express');
const router = express.Router();
const {
    checkIn, checkOut, getMyAttendance, getTodayStatus, getAllAttendance, getMonthlyReport
} = require('../controllers/attendanceController');
const { protect, authorize } = require('../middleware/auth');
const logActivity = require('../middleware/activityLog');

router.use(protect);

router.post('/checkin', logActivity('Checked in', 'attendance'), checkIn);
router.post('/checkout', logActivity('Checked out', 'attendance'), checkOut);
router.get('/me', getMyAttendance);
router.get('/today', getTodayStatus);
router.get('/', authorize('superadmin', 'admin'), getAllAttendance);
router.get('/report', authorize('superadmin', 'admin'), getMonthlyReport);

module.exports = router;
