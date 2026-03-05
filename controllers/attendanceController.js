const Attendance = require('../models/Attendance');

// @desc    Check in
// @route   POST /api/attendance/checkin
const checkIn = async (req, res, next) => {
    try {
        const today = new Date().toISOString().split('T')[0];
        const now = new Date();
        const checkInHour = now.getHours();

        // Check if already checked in today
        const existing = await Attendance.findOne({ user: req.user._id, date: today });
        if (existing) {
            return res.status(400).json({ success: false, message: 'Already checked in today' });
        }

        // Determine status based on check-in time (9 AM = on time)
        let status = 'present';
        if (checkInHour >= 10) status = 'late';
        if (checkInHour >= 13) status = 'half-day';

        const attendance = await Attendance.create({
            user: req.user._id,
            date: today,
            checkIn: now,
            status
        });

        // Emit socket event for real-time update
        if (req.io) {
            req.io.emit('attendance:checkin', {
                userId: req.user._id,
                userName: req.user.name,
                time: now,
                status
            });
        }

        res.status(201).json({ success: true, data: attendance });
    } catch (error) {
        next(error);
    }
};

// @desc    Check out
// @route   POST /api/attendance/checkout
const checkOut = async (req, res, next) => {
    try {
        const today = new Date().toISOString().split('T')[0];
        const now = new Date();

        const attendance = await Attendance.findOne({ user: req.user._id, date: today });

        if (!attendance) {
            return res.status(400).json({ success: false, message: 'No check-in record found for today' });
        }

        if (attendance.checkOut) {
            return res.status(400).json({ success: false, message: 'Already checked out today' });
        }

        attendance.checkOut = now;
        // Calculate work hours
        const diffMs = now - attendance.checkIn;
        attendance.workHours = Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100;
        await attendance.save();

        // Emit socket event
        if (req.io) {
            req.io.emit('attendance:checkout', {
                userId: req.user._id,
                userName: req.user.name,
                time: now,
                workHours: attendance.workHours
            });
        }

        res.status(200).json({ success: true, data: attendance });
    } catch (error) {
        next(error);
    }
};

// @desc    Get my attendance
// @route   GET /api/attendance/me
const getMyAttendance = async (req, res, next) => {
    try {
        const { month, year } = req.query;
        const query = { user: req.user._id };

        if (month && year) {
            const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
            const endDate = `${year}-${String(month).padStart(2, '0')}-31`;
            query.date = { $gte: startDate, $lte: endDate };
        }

        const attendance = await Attendance.find(query).sort('-date');

        res.status(200).json({ success: true, data: attendance });
    } catch (error) {
        next(error);
    }
};

// @desc    Get today's attendance status for current user
// @route   GET /api/attendance/today
const getTodayStatus = async (req, res, next) => {
    try {
        const today = new Date().toISOString().split('T')[0];
        const attendance = await Attendance.findOne({ user: req.user._id, date: today });

        res.status(200).json({ success: true, data: attendance });
    } catch (error) {
        next(error);
    }
};

// @desc    Get all attendance (Admin)
// @route   GET /api/attendance
const getAllAttendance = async (req, res, next) => {
    try {
        const { date, month, year, department, page = 1, limit = 20 } = req.query;
        const query = {};

        if (date) {
            query.date = date;
        } else if (month && year) {
            const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
            const endDate = `${year}-${String(month).padStart(2, '0')}-31`;
            query.date = { $gte: startDate, $lte: endDate };
        }

        let attendanceQuery = Attendance.find(query)
            .populate('user', 'name email department profileImage')
            .sort('-date -checkIn')
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        const total = await Attendance.countDocuments(query);
        const attendance = await attendanceQuery;

        // Filter by department if needed
        let filteredData = attendance;
        if (department) {
            filteredData = attendance.filter(a => a.user?.department?.toString() === department);
        }

        res.status(200).json({
            success: true,
            data: filteredData,
            pagination: {
                total,
                page: parseInt(page),
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get monthly report
// @route   GET /api/attendance/report
const getMonthlyReport = async (req, res, next) => {
    try {
        const { month, year } = req.query;

        if (!month || !year) {
            return res.status(400).json({ success: false, message: 'Month and year are required' });
        }

        const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
        const endDate = `${year}-${String(month).padStart(2, '0')}-31`;

        const report = await Attendance.aggregate([
            { $match: { date: { $gte: startDate, $lte: endDate } } },
            {
                $group: {
                    _id: '$user',
                    totalDays: { $sum: 1 },
                    presentDays: { $sum: { $cond: [{ $eq: ['$status', 'present'] }, 1, 0] } },
                    lateDays: { $sum: { $cond: [{ $eq: ['$status', 'late'] }, 1, 0] } },
                    halfDays: { $sum: { $cond: [{ $eq: ['$status', 'half-day'] }, 1, 0] } },
                    absentDays: { $sum: { $cond: [{ $eq: ['$status', 'absent'] }, 1, 0] } },
                    totalWorkHours: { $sum: '$workHours' },
                    avgWorkHours: { $avg: '$workHours' }
                }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'employee'
                }
            },
            { $unwind: '$employee' },
            {
                $project: {
                    employeeName: '$employee.name',
                    employeeEmail: '$employee.email',
                    totalDays: 1,
                    presentDays: 1,
                    lateDays: 1,
                    halfDays: 1,
                    absentDays: 1,
                    totalWorkHours: { $round: ['$totalWorkHours', 2] },
                    avgWorkHours: { $round: ['$avgWorkHours', 2] }
                }
            }
        ]);

        res.status(200).json({ success: true, data: report });
    } catch (error) {
        next(error);
    }
};

module.exports = { checkIn, checkOut, getMyAttendance, getTodayStatus, getAllAttendance, getMonthlyReport };
