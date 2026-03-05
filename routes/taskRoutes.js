const express = require('express');
const router = express.Router();
const { getTasks, getTask, createTask, updateTask, deleteTask } = require('../controllers/taskController');
const { protect, authorize } = require('../middleware/auth');
const logActivity = require('../middleware/activityLog');

router.use(protect);

router.route('/')
    .get(getTasks)
    .post(authorize('superadmin', 'admin'), logActivity('Created task', 'task'), createTask);

router.route('/:id')
    .get(getTask)
    .put(logActivity('Updated task', 'task'), updateTask)
    .delete(authorize('superadmin', 'admin'), logActivity('Deleted task', 'task'), deleteTask);

module.exports = router;
