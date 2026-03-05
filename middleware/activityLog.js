const ActivityLog = require('../models/ActivityLog');

const logActivity = (action, module = 'system') => {
    return (req, res, next) => {
        // Hook into response finish event - never blocks or crashes the request
        res.on('finish', () => {
            try {
                // Only log successful responses (2xx status codes)
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    ActivityLog.create({
                        user: req.user ? req.user._id : null,
                        action,
                        details: `${req.method} ${req.originalUrl}`,
                        module,
                        ipAddress: req.ip || req.socket?.remoteAddress
                    }).catch(err => console.error('Activity log error:', err));
                }
            } catch (err) {
                console.error('Activity log error:', err);
            }
        });

        next();
    };
};

module.exports = logActivity;
