const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const User = require('../models/User');
const Department = require('../models/Department');
const Attendance = require('../models/Attendance');
const Task = require('../models/Task');
const Payroll = require('../models/Payroll');
const ActivityLog = require('../models/ActivityLog');
const Notification = require('../models/Notification');

const seedDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB Connected for seeding...');

        // Clear all collections
        await Promise.all([
            User.deleteMany({}),
            Department.deleteMany({}),
            Attendance.deleteMany({}),
            Task.deleteMany({}),
            Payroll.deleteMany({}),
            ActivityLog.deleteMany({}),
            Notification.deleteMany({})
        ]);
        console.log('Cleared all collections');

        // Create departments
        const departments = await Department.insertMany([
            { name: 'Engineering', description: 'Software Development & Engineering' },
            { name: 'Human Resources', description: 'HR and People Operations' },
            { name: 'Marketing', description: 'Marketing & Brand Management' },
            { name: 'Finance', description: 'Finance & Accounting' },
            { name: 'Design', description: 'UI/UX & Product Design' }
        ]);
        console.log('Created departments');

        // Create users (password is hashed by pre-save hook)
        const superAdmin = await User.create({
            name: 'Mohit Kumar',
            email: 'superadmin@ems.com',
            password: 'admin123',
            role: 'superadmin',
            phone: '9876543210',
            position: 'CEO',
            salary: 150000,
            joiningDate: new Date('2023-01-01')
        });

        const admin1 = await User.create({
            name: 'Priya Sharma',
            email: 'admin@ems.com',
            password: 'admin123',
            role: 'admin',
            department: departments[1]._id,
            phone: '9876543211',
            position: 'HR Manager',
            salary: 80000,
            joiningDate: new Date('2023-06-15')
        });

        const admin2 = await User.create({
            name: 'Rahul Verma',
            email: 'manager@ems.com',
            password: 'admin123',
            role: 'admin',
            department: departments[0]._id,
            phone: '9876543212',
            position: 'Engineering Manager',
            salary: 100000,
            joiningDate: new Date('2023-03-10')
        });

        const employeeData = [
            { name: 'Ankit Singh', email: 'ankit@ems.com', position: 'Senior Developer', department: departments[0]._id, salary: 70000 },
            { name: 'Sneha Patel', email: 'sneha@ems.com', position: 'Frontend Developer', department: departments[0]._id, salary: 55000 },
            { name: 'Vikas Gupta', email: 'vikas@ems.com', position: 'Backend Developer', department: departments[0]._id, salary: 60000 },
            { name: 'Pooja Rao', email: 'pooja@ems.com', position: 'UI/UX Designer', department: departments[4]._id, salary: 50000 },
            { name: 'Amit Joshi', email: 'amit@ems.com', position: 'Marketing Lead', department: departments[2]._id, salary: 65000 },
            { name: 'Neha Kapoor', email: 'neha@ems.com', position: 'HR Executive', department: departments[1]._id, salary: 45000 },
            { name: 'Sanjay Mishra', email: 'sanjay@ems.com', position: 'Accountant', department: departments[3]._id, salary: 48000 },
            { name: 'Kavita Nair', email: 'kavita@ems.com', position: 'Senior Designer', department: departments[4]._id, salary: 58000 },
            { name: 'Deepak Yadav', email: 'deepak@ems.com', position: 'DevOps Engineer', department: departments[0]._id, salary: 72000 },
            { name: 'Ritu Agarwal', email: 'ritu@ems.com', position: 'Finance Analyst', department: departments[3]._id, salary: 52000 }
        ];

        const employees = [];
        for (const empData of employeeData) {
            const emp = await User.create({
                ...empData,
                password: 'emp123',
                role: 'employee',
                phone: `98${Math.floor(10000000 + Math.random() * 90000000)}`,
                joiningDate: new Date(2024, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1)
            });
            employees.push(emp);
        }
        console.log('Created users');

        // Assign department heads
        await Department.findByIdAndUpdate(departments[0]._id, { head: admin2._id });
        await Department.findByIdAndUpdate(departments[1]._id, { head: admin1._id });
        await Department.findByIdAndUpdate(departments[2]._id, { head: employees[4]._id });
        await Department.findByIdAndUpdate(departments[3]._id, { head: employees[6]._id });
        await Department.findByIdAndUpdate(departments[4]._id, { head: employees[7]._id });
        console.log('Assigned department heads');

        // Create attendance records (last 30 days)
        const attendanceRecords = [];
        const allUsers = [superAdmin, admin1, admin2, ...employees];

        for (let i = 30; i >= 1; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            const dayOfWeek = date.getDay();

            // Skip weekends
            if (dayOfWeek === 0 || dayOfWeek === 6) continue;

            for (const user of allUsers) {
                // Random chance of absence (10%)
                if (Math.random() < 0.1) continue;

                const checkInHour = 8 + Math.floor(Math.random() * 3); // 8-10 AM
                const checkInMin = Math.floor(Math.random() * 60);
                const checkIn = new Date(date);
                checkIn.setHours(checkInHour, checkInMin, 0);

                const workHours = 7 + Math.random() * 3; // 7-10 hours
                const checkOut = new Date(checkIn.getTime() + workHours * 60 * 60 * 1000);

                let status = 'present';
                if (checkInHour >= 10) status = 'late';

                attendanceRecords.push({
                    user: user._id,
                    date: dateStr,
                    checkIn,
                    checkOut,
                    status,
                    workHours: Math.round(workHours * 100) / 100
                });
            }
        }
        await Attendance.insertMany(attendanceRecords);
        console.log(`Created ${attendanceRecords.length} attendance records`);

        // Create tasks
        const taskTitles = [
            { title: 'Implement user authentication', desc: 'Add JWT-based authentication system', priority: 'high' },
            { title: 'Design dashboard UI', desc: 'Create modern dashboard layout with charts', priority: 'high' },
            { title: 'Setup CI/CD pipeline', desc: 'Configure GitHub Actions for deployment', priority: 'medium' },
            { title: 'Write API documentation', desc: 'Document all REST API endpoints', priority: 'medium' },
            { title: 'Fix login page bugs', desc: 'Resolve responsive issues on mobile', priority: 'urgent' },
            { title: 'Create marketing campaign', desc: 'Q2 social media campaign planning', priority: 'medium' },
            { title: 'Quarterly budget report', desc: 'Prepare Q1 financial summary', priority: 'high' },
            { title: 'Employee onboarding docs', desc: 'Update onboarding documentation', priority: 'low' },
            { title: 'Database optimization', desc: 'Add indexes and optimize queries', priority: 'medium' },
            { title: 'Design new logo', desc: 'Create refreshed brand identity', priority: 'low' },
            { title: 'Performance review forms', desc: 'Prepare annual review templates', priority: 'medium' },
            { title: 'Security audit', desc: 'Run security scan on production', priority: 'urgent' }
        ];

        const statuses = ['pending', 'in-progress', 'completed', 'overdue'];
        const tasks = [];
        for (let i = 0; i < taskTitles.length; i++) {
            const dueDate = new Date();
            dueDate.setDate(dueDate.getDate() + Math.floor(Math.random() * 30) - 10);

            tasks.push({
                title: taskTitles[i].title,
                description: taskTitles[i].desc,
                assignedTo: employees[i % employees.length]._id,
                assignedBy: [admin1._id, admin2._id, superAdmin._id][i % 3],
                department: employees[i % employees.length].department,
                priority: taskTitles[i].priority,
                status: statuses[Math.floor(Math.random() * statuses.length)],
                dueDate
            });
        }
        await Task.insertMany(tasks);
        console.log('Created tasks');

        // Create payroll records (last 3 months)
        const payrollRecords = [];
        const currentMonth = new Date().getMonth() + 1;
        const currentYear = new Date().getFullYear();

        for (let m = 0; m < 3; m++) {
            let month = currentMonth - m;
            let year = currentYear;
            if (month <= 0) { month += 12; year -= 1; }

            for (const user of allUsers) {
                const basicSalary = user.salary;
                const allowances = {
                    hra: Math.round(basicSalary * 0.2),
                    transport: 2500,
                    medical: 1500,
                    other: 1000
                };
                const deductions = {
                    tax: Math.round(basicSalary * 0.1),
                    pf: Math.round(basicSalary * 0.12),
                    insurance: 500,
                    other: 0
                };
                const totalAllowances = allowances.hra + allowances.transport + allowances.medical + allowances.other;
                const totalDeductions = deductions.tax + deductions.pf + deductions.insurance + deductions.other;
                const netSalary = basicSalary + totalAllowances - totalDeductions;

                payrollRecords.push({
                    user: user._id,
                    month,
                    year,
                    basicSalary,
                    allowances,
                    deductions,
                    totalAllowances,
                    totalDeductions,
                    netSalary,
                    status: m > 0 ? 'paid' : 'pending',
                    paidDate: m > 0 ? new Date(year, month - 1, 28) : null
                });
            }
        }
        await Payroll.insertMany(payrollRecords);
        console.log('Created payroll records');

        // Create sample notifications
        const notifData = [
            { user: superAdmin._id, title: 'Welcome to EMS', message: 'Your system is set up and ready to go!', type: 'success' },
            { user: superAdmin._id, title: 'New Employee Joined', message: 'Ankit Singh has been added to Engineering', type: 'info', link: '/employees' },
            { user: superAdmin._id, title: 'Security Alert', message: '3 failed login attempts detected', type: 'danger' },
            { user: admin1._id, title: 'Task Overdue', message: '"Quarterly budget report" is past its due date', type: 'warning', link: '/tasks' },
            { user: admin1._id, title: 'Payroll Pending', message: 'March payroll is ready for review', type: 'payroll', link: '/payroll' },
            { user: admin2._id, title: 'Task Completed', message: '"Implement user authentication" marked as done', type: 'task', link: '/tasks' },
            { user: admin2._id, title: 'Attendance Alert', message: '2 employees were late today', type: 'attendance', link: '/attendance' },
            { user: employees[0]._id, title: 'New Task Assigned', message: 'You have been assigned: "Database optimization"', type: 'task', link: '/tasks' },
            { user: employees[0]._id, title: 'Salary Credited', message: 'Your February salary has been processed', type: 'payroll', link: '/payroll' },
            { user: employees[1]._id, title: 'New Task Assigned', message: 'You have been assigned: "Design dashboard UI"', type: 'task', link: '/tasks' },
        ];
        await Notification.insertMany(notifData);
        console.log('Created notifications');

        console.log('\n========================================');
        console.log('  DATABASE SEEDED SUCCESSFULLY!');
        console.log('========================================');
        console.log('\nLogin Credentials:');
        console.log('─────────────────────────────────────');
        console.log('Super Admin:  superadmin@ems.com / admin123');
        console.log('Admin (HR):   admin@ems.com / admin123');
        console.log('Admin (Eng):  manager@ems.com / admin123');
        console.log('Employee:     ankit@ems.com / emp123');
        console.log('─────────────────────────────────────\n');

        process.exit(0);
    } catch (error) {
        console.error('Seeding error:', error);
        process.exit(1);
    }
};

seedDB();
