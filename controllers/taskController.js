const Task = require('../models/Task');
const { sendNotification } = require('./notificationController');

// @desc    Get all tasks (Admin) or my tasks (Employee)
// @route   GET /api/tasks
const getTasks = async (req, res, next) => {
    try {
        const { status, priority, assignedTo, page = 1, limit = 10 } = req.query;
        const query = {};

        // Employees can only see their own tasks
        if (req.user.role === 'employee') {
            query.assignedTo = req.user._id;
        }

        if (status) query.status = status;
        if (priority) query.priority = priority;
        if (assignedTo && req.user.role !== 'employee') query.assignedTo = assignedTo;

        const total = await Task.countDocuments(query);
        const tasks = await Task.find(query)
            .populate('assignedTo', 'name email profileImage')
            .populate('assignedBy', 'name email')
            .populate('department', 'name')
            .sort('-createdAt')
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        res.status(200).json({
            success: true,
            data: tasks,
            pagination: {
                total,
                page: parseInt(page),
                pages: Math.ceil(total / limit),
                limit: parseInt(limit)
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get single task
// @route   GET /api/tasks/:id
const getTask = async (req, res, next) => {
    try {
        const task = await Task.findById(req.params.id)
            .populate('assignedTo', 'name email profileImage')
            .populate('assignedBy', 'name email')
            .populate('department', 'name');

        if (!task) {
            return res.status(404).json({ success: false, message: 'Task not found' });
        }

        // Employees can only see their own tasks
        if (req.user.role === 'employee' && task.assignedTo._id.toString() !== req.user._id.toString()) {
            return res.status(403).json({ success: false, message: 'Not authorized to view this task' });
        }

        res.status(200).json({ success: true, data: task });
    } catch (error) {
        next(error);
    }
};

// @desc    Create task
// @route   POST /api/tasks
const createTask = async (req, res, next) => {
    try {
        req.body.assignedBy = req.user._id;

        const task = await Task.create(req.body);

        const populatedTask = await Task.findById(task._id)
            .populate('assignedTo', 'name email')
            .populate('assignedBy', 'name email');

        // Notify the assigned employee
        if (req.body.assignedTo) {
            sendNotification(req.io, req.body.assignedTo,
                'New Task Assigned',
                `You have been assigned: "${task.title}"`,
                'task', '/tasks'
            );
        }

        res.status(201).json({ success: true, data: populatedTask });
    } catch (error) {
        next(error);
    }
};

// @desc    Update task
// @route   PUT /api/tasks/:id
const updateTask = async (req, res, next) => {
    try {
        let task = await Task.findById(req.params.id);

        if (!task) {
            return res.status(404).json({ success: false, message: 'Task not found' });
        }

        // Employees can only update status of their own tasks
        if (req.user.role === 'employee') {
            if (task.assignedTo.toString() !== req.user._id.toString()) {
                return res.status(403).json({ success: false, message: 'Not authorized' });
            }
            // Only allow status update for employees
            req.body = { status: req.body.status };
        }

        // Set completedAt if task is being marked as completed
        if (req.body.status === 'completed') {
            req.body.completedAt = new Date();
        }

        const oldStatus = task.status;
        task = await Task.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        })
            .populate('assignedTo', 'name email profileImage')
            .populate('assignedBy', 'name email');

        // Notify about status changes
        if (req.body.status && req.body.status !== oldStatus) {
            if (task.assignedBy) {
                sendNotification(req.io, task.assignedBy._id,
                    'Task Status Updated',
                    `"${task.title}" changed to ${req.body.status}`,
                    'task', '/tasks'
                );
            }
        }

        res.status(200).json({ success: true, data: task });
    } catch (error) {
        next(error);
    }
};

// @desc    Delete task
// @route   DELETE /api/tasks/:id
const deleteTask = async (req, res, next) => {
    try {
        const task = await Task.findById(req.params.id);

        if (!task) {
            return res.status(404).json({ success: false, message: 'Task not found' });
        }

        await Task.findByIdAndDelete(req.params.id);

        res.status(200).json({ success: true, message: 'Task deleted successfully' });
    } catch (error) {
        next(error);
    }
};

module.exports = { getTasks, getTask, createTask, updateTask, deleteTask };
