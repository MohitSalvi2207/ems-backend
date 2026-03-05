const express = require('express');
const router = express.Router();
const {
    getEmployees, getEmployee, createEmployee, updateEmployee, deleteEmployee, exportCSV, exportExcel
} = require('../controllers/employeeController');
const { protect, authorize } = require('../middleware/auth');
const logActivity = require('../middleware/activityLog');

router.use(protect); // All routes require authentication

router.get('/export/csv', authorize('superadmin', 'admin'), exportCSV);
router.get('/export/excel', authorize('superadmin', 'admin'), exportExcel);

router.route('/')
    .get(authorize('superadmin', 'admin'), getEmployees)
    .post(authorize('superadmin', 'admin'), logActivity('Created new employee', 'employee'), createEmployee);

router.route('/:id')
    .get(authorize('superadmin', 'admin'), getEmployee)
    .put(authorize('superadmin', 'admin'), logActivity('Updated employee', 'employee'), updateEmployee)
    .delete(authorize('superadmin', 'admin'), logActivity('Deleted employee', 'employee'), deleteEmployee);

module.exports = router;
