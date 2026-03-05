const User = require('../models/User');
const { exportToCSV, exportToExcel } = require('../utils/exportHelper');

// @desc    Get all employees
// @route   GET /api/employees
const getEmployees = async (req, res, next) => {
    try {
        const { search, department, role, status, page = 1, limit = 10, sort = '-createdAt' } = req.query;

        const query = {};

        // Search by name or email
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { position: { $regex: search, $options: 'i' } }
            ];
        }

        if (department) query.department = department;
        if (role) query.role = role;
        if (status !== undefined) query.isActive = status === 'active';

        const total = await User.countDocuments(query);
        const employees = await User.find(query)
            .populate('department', 'name')
            .sort(sort)
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        res.status(200).json({
            success: true,
            data: employees,
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

// @desc    Get single employee
// @route   GET /api/employees/:id
const getEmployee = async (req, res, next) => {
    try {
        const employee = await User.findById(req.params.id).populate('department', 'name');

        if (!employee) {
            return res.status(404).json({ success: false, message: 'Employee not found' });
        }

        res.status(200).json({ success: true, data: employee });
    } catch (error) {
        next(error);
    }
};

// @desc    Create employee
// @route   POST /api/employees
const createEmployee = async (req, res, next) => {
    try {
        const { email } = req.body;

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ success: false, message: 'Email already exists' });
        }

        const employee = await User.create(req.body);

        res.status(201).json({ success: true, data: employee });
    } catch (error) {
        next(error);
    }
};

// @desc    Update employee
// @route   PUT /api/employees/:id
const updateEmployee = async (req, res, next) => {
    try {
        // Don't allow password update through this route
        delete req.body.password;

        const employee = await User.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        }).populate('department', 'name');

        if (!employee) {
            return res.status(404).json({ success: false, message: 'Employee not found' });
        }

        res.status(200).json({ success: true, data: employee });
    } catch (error) {
        next(error);
    }
};

// @desc    Delete employee
// @route   DELETE /api/employees/:id
const deleteEmployee = async (req, res, next) => {
    try {
        const employee = await User.findById(req.params.id);

        if (!employee) {
            return res.status(404).json({ success: false, message: 'Employee not found' });
        }

        // Soft delete - deactivate instead of remove
        employee.isActive = false;
        await employee.save({ validateBeforeSave: false });

        res.status(200).json({ success: true, message: 'Employee deactivated successfully' });
    } catch (error) {
        next(error);
    }
};

// @desc    Export employees to CSV
// @route   GET /api/employees/export/csv
const exportCSV = async (req, res, next) => {
    try {
        const employees = await User.find({}).populate('department', 'name').lean();

        const data = employees.map(emp => ({
            Name: emp.name,
            Email: emp.email,
            Role: emp.role,
            Position: emp.position || '',
            Department: emp.department?.name || '',
            Phone: emp.phone || '',
            Salary: emp.salary,
            'Joining Date': new Date(emp.joiningDate).toLocaleDateString(),
            Status: emp.isActive ? 'Active' : 'Inactive'
        }));

        const csv = exportToCSV(data, Object.keys(data[0] || {}));

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=employees.csv');
        res.status(200).send(csv);
    } catch (error) {
        next(error);
    }
};

// @desc    Export employees to Excel
// @route   GET /api/employees/export/excel
const exportExcel = async (req, res, next) => {
    try {
        const employees = await User.find({}).populate('department', 'name').lean();

        const data = employees.map(emp => ({
            Name: emp.name,
            Email: emp.email,
            Role: emp.role,
            Position: emp.position || '',
            Department: emp.department?.name || '',
            Phone: emp.phone || '',
            Salary: emp.salary,
            'Joining Date': new Date(emp.joiningDate).toLocaleDateString(),
            Status: emp.isActive ? 'Active' : 'Inactive'
        }));

        const buffer = exportToExcel(data, 'Employees');

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=employees.xlsx');
        res.status(200).send(buffer);
    } catch (error) {
        next(error);
    }
};

module.exports = { getEmployees, getEmployee, createEmployee, updateEmployee, deleteEmployee, exportCSV, exportExcel };
