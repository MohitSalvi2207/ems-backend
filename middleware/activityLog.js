const ActivityLog = require('../models/ActivityLog');

const logActivity = (action, module = 'system') => {
    return async (req, res, next) => {
        // Store original json method
        const originalJson = res.json.bind(res);

        res.json = function (data) {
            // Only log successful operations
            if (data.success !== false) {
                ActivityLog.create({
                    user: req.user ? req.user._id : null,
                    action,
                    details: `${req.method} ${req.originalUrl}`,
                    module,
                    ipAddress: req.ip || req.connection.remoteAddress
                }).catch(err => console.error('Activity log error:', err));
            }
            return originalJson(data);
        };

        next();
    };
};

module.exports = logActivity;
