const Department = require('../models/Department');
const User = require('../models/User');

// @desc    Get all departments
// @route   GET /api/departments
const getDepartments = async (req, res, next) => {
    try {
        const departments = await Department.find()
            .populate('head', 'name email profileImage')
            .populate('employeeCount');

        res.status(200).json({ success: true, data: departments });
    } catch (error) {
        next(error);
    }
};

// @desc    Get single department
// @route   GET /api/departments/:id
const getDepartment = async (req, res, next) => {
    try {
        const department = await Department.findById(req.params.id)
            .populate('head', 'name email profileImage position')
            .populate('employeeCount');

        if (!department) {
            return res.status(404).json({ success: false, message: 'Department not found' });
        }

        // Get employees in this department
        const employees = await User.find({ department: req.params.id })
            .select('name email position profileImage isActive');

        res.status(200).json({ success: true, data: { ...department.toObject(), employees } });
    } catch (error) {
        next(error);
    }
};

// @desc    Create department
// @route   POST /api/departments
const createDepartment = async (req, res, next) => {
    try {
        const department = await Department.create(req.body);
        res.status(201).json({ success: true, data: department });
    } catch (error) {
        next(error);
    }
};

// @desc    Update department
// @route   PUT /api/departments/:id
const updateDepartment = async (req, res, next) => {
    try {
        const department = await Department.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        }).populate('head', 'name email');

        if (!department) {
            return res.status(404).json({ success: false, message: 'Department not found' });
        }

        res.status(200).json({ success: true, data: department });
    } catch (error) {
        next(error);
    }
};

// @desc    Delete department
// @route   DELETE /api/departments/:id
const deleteDepartment = async (req, res, next) => {
    try {
        const department = await Department.findById(req.params.id);

        if (!department) {
            return res.status(404).json({ success: false, message: 'Department not found' });
        }

        // Check if any employees are assigned
        const employeeCount = await User.countDocuments({ department: req.params.id });
        if (employeeCount > 0) {
            return res.status(400).json({
                success: false,
                message: `Cannot delete department with ${employeeCount} assigned employees. Reassign them first.`
            });
        }

        await Department.findByIdAndDelete(req.params.id);

        res.status(200).json({ success: true, message: 'Department deleted successfully' });
    } catch (error) {
        next(error);
    }
};

module.exports = { getDepartments, getDepartment, createDepartment, updateDepartment, deleteDepartment };
