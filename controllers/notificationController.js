const Notification = require('../models/Notification');

// @desc    Get my notifications
// @route   GET /api/notifications
const getNotifications = async (req, res, next) => {
    try {
        const { page = 1, limit = 20, unreadOnly } = req.query;
        const query = { user: req.user._id };
        if (unreadOnly === 'true') query.isRead = false;

        const total = await Notification.countDocuments(query);
        const unreadCount = await Notification.countDocuments({ user: req.user._id, isRead: false });
        const notifications = await Notification.find(query)
            .sort('-createdAt')
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        res.status(200).json({
            success: true,
            data: notifications,
            unreadCount,
            pagination: { total, page: parseInt(page), pages: Math.ceil(total / limit) }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Mark notification as read
// @route   PUT /api/notifications/:id/read
const markAsRead = async (req, res, next) => {
    try {
        const notification = await Notification.findOneAndUpdate(
            { _id: req.params.id, user: req.user._id },
            { isRead: true },
            { new: true }
        );
        if (!notification) {
            return res.status(404).json({ success: false, message: 'Notification not found' });
        }
        res.status(200).json({ success: true, data: notification });
    } catch (error) {
        next(error);
    }
};

// @desc    Mark all notifications as read
// @route   PUT /api/notifications/read-all
const markAllAsRead = async (req, res, next) => {
    try {
        await Notification.updateMany(
            { user: req.user._id, isRead: false },
            { isRead: true }
        );
        res.status(200).json({ success: true, message: 'All notifications marked as read' });
    } catch (error) {
        next(error);
    }
};

// @desc    Delete a notification
// @route   DELETE /api/notifications/:id
const deleteNotification = async (req, res, next) => {
    try {
        const notification = await Notification.findOneAndDelete({ _id: req.params.id, user: req.user._id });
        if (!notification) {
            return res.status(404).json({ success: false, message: 'Notification not found' });
        }
        res.status(200).json({ success: true, message: 'Notification deleted' });
    } catch (error) {
        next(error);
    }
};

// @desc    Create notification (internal helper, also used by admin)
// @route   POST /api/notifications
const createNotification = async (req, res, next) => {
    try {
        const notification = await Notification.create(req.body);
        // Emit via Socket.io if available
        if (req.io) {
            req.io.emit(`notification:${req.body.user}`, notification);
        }
        res.status(201).json({ success: true, data: notification });
    } catch (error) {
        next(error);
    }
};

// Helper function to create notifications programmatically (used by other controllers)
const sendNotification = async (io, userId, title, message, type = 'info', link = '') => {
    try {
        const notification = await Notification.create({ user: userId, title, message, type, link });
        if (io) {
            io.emit(`notification:${userId}`, notification);
        }
        return notification;
    } catch (error) {
        console.error('Failed to send notification:', error);
    }
};

module.exports = { getNotifications, markAsRead, markAllAsRead, deleteNotification, createNotification, sendNotification };
