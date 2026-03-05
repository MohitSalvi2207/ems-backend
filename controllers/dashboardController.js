const User = require('../models/User');
const Department = require('../models/Department');
const Attendance = require('../models/Attendance');
const Task = require('../models/Task');
const Payroll = require('../models/Payroll');
const ActivityLog = require('../models/ActivityLog');

// @desc    Get dashboard analytics
// @route   GET /api/dashboard
const getDashboardStats = async (req, res, next) => {
    try {
        const today = new Date().toISOString().split('T')[0];
        const currentMonth = new Date().getMonth() + 1;
        const currentYear = new Date().getFullYear();

        // Basic counts
        const [totalEmployees, activeEmployees, totalDepartments, todayAttendance] = await Promise.all([
            User.countDocuments({}),
            User.countDocuments({ isActive: true }),
            Department.countDocuments({}),
            Attendance.countDocuments({ date: today })
        ]);

        // Task stats
        const [pendingTasks, inProgressTasks, completedTasks, overdueTasks] = await Promise.all([
            Task.countDocuments({ status: 'pending' }),
            Task.countDocuments({ status: 'in-progress' }),
            Task.countDocuments({ status: 'completed' }),
            Task.countDocuments({ status: 'overdue' })
        ]);

        // Payroll stats for current month
        const payrollStats = await Payroll.aggregate([
            { $match: { month: currentMonth, year: currentYear } },
            {
                $group: {
                    _id: null,
                    totalPayroll: { $sum: '$netSalary' },
                    paidCount: { $sum: { $cond: [{ $eq: ['$status', 'paid'] }, 1, 0] } },
                    pendingCount: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } }
                }
            }
        ]);

        // Attendance trend (last 7 days)
        const last7Days = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            last7Days.push(d.toISOString().split('T')[0]);
        }

        const attendanceTrend = await Attendance.aggregate([
            { $match: { date: { $in: last7Days } } },
            {
                $group: {
                    _id: '$date',
                    count: { $sum: 1 },
                    onTime: { $sum: { $cond: [{ $eq: ['$status', 'present'] }, 1, 0] } },
                    late: { $sum: { $cond: [{ $eq: ['$status', 'late'] }, 1, 0] } }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        // Department distribution
        const departmentDistribution = await User.aggregate([
            { $match: { isActive: true, department: { $exists: true } } },
            {
                $group: {
                    _id: '$department',
                    count: { $sum: 1 }
                }
            },
            {
                $lookup: {
                    from: 'departments',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'dept'
                }
            },
            { $unwind: '$dept' },
            {
                $project: {
                    name: '$dept.name',
                    count: 1
                }
            }
        ]);

        // Recent activity
        const recentActivity = await ActivityLog.find()
            .populate('user', 'name profileImage')
            .sort('-createdAt')
            .limit(10);

        res.status(200).json({
            success: true,
            data: {
                employees: { total: totalEmployees, active: activeEmployees },
                departments: totalDepartments,
                attendance: {
                    today: todayAttendance,
                    trend: attendanceTrend,
                    percentage: totalEmployees > 0 ? Math.round((todayAttendance / activeEmployees) * 100) : 0
                },
                tasks: {
                    pending: pendingTasks,
                    inProgress: inProgressTasks,
                    completed: completedTasks,
                    overdue: overdueTasks,
                    total: pendingTasks + inProgressTasks + completedTasks + overdueTasks
                },
                payroll: payrollStats[0] || { totalPayroll: 0, paidCount: 0, pendingCount: 0 },
                departmentDistribution,
                recentActivity
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get activity logs
// @route   GET /api/dashboard/logs
const getActivityLogs = async (req, res, next) => {
    try {
        const { page = 1, limit = 20, module: mod } = req.query;
        const query = {};
        if (mod) query.module = mod;

        const total = await ActivityLog.countDocuments(query);
        const logs = await ActivityLog.find(query)
            .populate('user', 'name email')
            .sort('-createdAt')
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        res.status(200).json({
            success: true,
            data: logs,
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

module.exports = { getDashboardStats, getActivityLogs };
