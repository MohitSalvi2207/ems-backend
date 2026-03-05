const express = require('express');
const router = express.Router();
const {
    getDepartments, getDepartment, createDepartment, updateDepartment, deleteDepartment
} = require('../controllers/departmentController');
const { protect, authorize } = require('../middleware/auth');
const logActivity = require('../middleware/activityLog');

router.use(protect);

router.route('/')
    .get(getDepartments)
    .post(authorize('superadmin', 'admin'), logActivity('Created department', 'department'), createDepartment);

router.route('/:id')
    .get(getDepartment)
    .put(authorize('superadmin', 'admin'), logActivity('Updated department', 'department'), updateDepartment)
    .delete(authorize('superadmin', 'admin'), logActivity('Deleted department', 'department'), deleteDepartment);

module.exports = router;
