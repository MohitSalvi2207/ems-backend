const express = require('express');
const router = express.Router();
const {
    getNotifications, markAsRead, markAllAsRead, deleteNotification, createNotification
} = require('../controllers/notificationController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.route('/')
    .get(getNotifications)
    .post(authorize('superadmin', 'admin'), createNotification);

router.put('/read-all', markAllAsRead);
router.put('/:id/read', markAsRead);
router.delete('/:id', deleteNotification);

module.exports = router;
