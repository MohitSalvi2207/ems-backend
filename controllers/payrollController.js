const Payroll = require('../models/Payroll');
const User = require('../models/User');
const { generatePayslipPDF } = require('../utils/pdfGenerator');

// @desc    Generate payroll for an employee
// @route   POST /api/payroll/generate
const generatePayroll = async (req, res, next) => {
    try {
        const { userId, month, year, allowances = {}, deductions = {} } = req.body;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'Employee not found' });
        }

        // Check if payroll already exists for this month
        const existing = await Payroll.findOne({ user: userId, month, year });
        if (existing) {
            return res.status(400).json({ success: false, message: 'Payroll already generated for this month' });
        }

        const basicSalary = user.salary;
        const totalAllowances = (allowances.hra || 0) + (allowances.transport || 0) +
            (allowances.medical || 0) + (allowances.other || 0);
        const totalDeductions = (deductions.tax || 0) + (deductions.pf || 0) +
            (deductions.insurance || 0) + (deductions.other || 0);
        const netSalary = basicSalary + totalAllowances - totalDeductions;

        const payroll = await Payroll.create({
            user: userId,
            month,
            year,
            basicSalary,
            allowances,
            deductions,
            totalAllowances,
            totalDeductions,
            netSalary
        });

        res.status(201).json({ success: true, data: payroll });
    } catch (error) {
        next(error);
    }
};

// @desc    Get all payroll records
// @route   GET /api/payroll
const getPayrolls = async (req, res, next) => {
    try {
        const { month, year, status, page = 1, limit = 10 } = req.query;
        const query = {};

        if (req.user.role === 'employee') {
            query.user = req.user._id;
        }

        if (month) query.month = parseInt(month);
        if (year) query.year = parseInt(year);
        if (status) query.status = status;

        const total = await Payroll.countDocuments(query);
        const payrolls = await Payroll.find(query)
            .populate('user', 'name email position department profileImage')
            .sort('-year -month')
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        res.status(200).json({
            success: true,
            data: payrolls,
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

// @desc    Update payroll status (mark as paid)
// @route   PUT /api/payroll/:id/pay
const markAsPaid = async (req, res, next) => {
    try {
        const payroll = await Payroll.findById(req.params.id);

        if (!payroll) {
            return res.status(404).json({ success: false, message: 'Payroll record not found' });
        }

        payroll.status = 'paid';
        payroll.paidDate = new Date();
        await payroll.save();

        res.status(200).json({ success: true, data: payroll });
    } catch (error) {
        next(error);
    }
};

// @desc    Download payslip PDF
// @route   GET /api/payroll/:id/payslip
const downloadPayslip = async (req, res, next) => {
    try {
        const payroll = await Payroll.findById(req.params.id);

        if (!payroll) {
            return res.status(404).json({ success: false, message: 'Payroll record not found' });
        }

        // Employees can only download their own payslips
        if (req.user.role === 'employee' && payroll.user.toString() !== req.user._id.toString()) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        const user = await User.findById(payroll.user).populate('department', 'name');

        const pdfBuffer = await generatePayslipPDF(payroll.toObject(), user);

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=payslip_${payroll.month}_${payroll.year}.pdf`);
        res.send(pdfBuffer);
    } catch (error) {
        next(error);
    }
};

// @desc    Delete payroll
// @route   DELETE /api/payroll/:id
const deletePayroll = async (req, res, next) => {
    try {
        const payroll = await Payroll.findById(req.params.id);

        if (!payroll) {
            return res.status(404).json({ success: false, message: 'Payroll record not found' });
        }

        if (payroll.status === 'paid') {
            return res.status(400).json({ success: false, message: 'Cannot delete a paid payroll record' });
        }

        await Payroll.findByIdAndDelete(req.params.id);
        res.status(200).json({ success: true, message: 'Payroll record deleted' });
    } catch (error) {
        next(error);
    }
};

module.exports = { generatePayroll, getPayrolls, markAsPaid, downloadPayslip, deletePayroll };
