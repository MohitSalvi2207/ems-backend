const express = require('express');
const router = express.Router();
const {
    generatePayroll, getPayrolls, markAsPaid, downloadPayslip, deletePayroll
} = require('../controllers/payrollController');
const { protect, authorize } = require('../middleware/auth');
const logActivity = require('../middleware/activityLog');

router.use(protect);

router.post('/generate', authorize('superadmin', 'admin'), logActivity('Generated payroll', 'payroll'), generatePayroll);
router.get('/', getPayrolls);
router.put('/:id/pay', authorize('superadmin', 'admin'), logActivity('Marked payroll as paid', 'payroll'), markAsPaid);
router.get('/:id/payslip', downloadPayslip);
router.delete('/:id', authorize('superadmin'), logActivity('Deleted payroll', 'payroll'), deletePayroll);

module.exports = router;
