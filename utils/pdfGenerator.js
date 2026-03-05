const PDFDocument = require('pdfkit');

const generatePayslipPDF = (payrollData, userData) => {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({ margin: 50, size: 'A4' });
            const buffers = [];

            doc.on('data', (chunk) => buffers.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(buffers)));

            const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                'July', 'August', 'September', 'October', 'November', 'December'];

            // Header
            doc.fontSize(22).font('Helvetica-Bold').fillColor('#1a1a2e')
                .text('EMPLOYEE MANAGEMENT SYSTEM', { align: 'center' });
            doc.moveDown(0.3);
            doc.fontSize(14).font('Helvetica').fillColor('#16213e')
                .text('Salary Slip', { align: 'center' });
            doc.moveDown(0.3);
            doc.fontSize(10).fillColor('#666')
                .text(`${monthNames[payrollData.month - 1]} ${payrollData.year}`, { align: 'center' });

            // Divider
            doc.moveDown(1);
            doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#e0e0e0').lineWidth(1).stroke();
            doc.moveDown(1);

            // Employee Info
            doc.fontSize(11).font('Helvetica-Bold').fillColor('#1a1a2e').text('Employee Details');
            doc.moveDown(0.5);
            doc.fontSize(10).font('Helvetica').fillColor('#333');

            const infoY = doc.y;
            doc.text(`Name: ${userData.name}`, 50, infoY);
            doc.text(`Email: ${userData.email}`, 50, infoY + 18);
            doc.text(`Position: ${userData.position || 'N/A'}`, 50, infoY + 36);
            doc.text(`Employee ID: ${userData._id}`, 300, infoY);
            doc.text(`Department: ${userData.department?.name || 'N/A'}`, 300, infoY + 18);
            doc.text(`Status: ${payrollData.status.toUpperCase()}`, 300, infoY + 36);

            doc.moveDown(4);
            doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#e0e0e0').lineWidth(1).stroke();
            doc.moveDown(1);

            // Earnings Table
            doc.fontSize(11).font('Helvetica-Bold').fillColor('#1a1a2e').text('Earnings');
            doc.moveDown(0.5);
            doc.fontSize(10).font('Helvetica').fillColor('#333');

            const drawRow = (label, amount, y) => {
                doc.text(label, 50, y);
                doc.text(`₹ ${amount.toLocaleString('en-IN')}`, 400, y, { align: 'right', width: 145 });
            };

            let y = doc.y;
            drawRow('Basic Salary', payrollData.basicSalary, y);
            drawRow('HRA', payrollData.allowances.hra, y + 20);
            drawRow('Transport Allowance', payrollData.allowances.transport, y + 40);
            drawRow('Medical Allowance', payrollData.allowances.medical, y + 60);
            drawRow('Other Allowances', payrollData.allowances.other, y + 80);

            doc.moveDown(6);
            doc.font('Helvetica-Bold').fillColor('#1a1a2e');
            drawRow('Total Earnings', payrollData.basicSalary + payrollData.totalAllowances, doc.y);

            // Deductions
            doc.moveDown(2);
            doc.fontSize(11).font('Helvetica-Bold').fillColor('#1a1a2e').text('Deductions');
            doc.moveDown(0.5);
            doc.fontSize(10).font('Helvetica').fillColor('#333');

            y = doc.y;
            drawRow('Tax', payrollData.deductions.tax, y);
            drawRow('Provident Fund', payrollData.deductions.pf, y + 20);
            drawRow('Insurance', payrollData.deductions.insurance, y + 40);
            drawRow('Other Deductions', payrollData.deductions.other, y + 60);

            doc.moveDown(5);
            doc.font('Helvetica-Bold').fillColor('#d32f2f');
            drawRow('Total Deductions', payrollData.totalDeductions, doc.y);

            // Net Salary
            doc.moveDown(2);
            doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#1a1a2e').lineWidth(2).stroke();
            doc.moveDown(1);
            doc.fontSize(14).font('Helvetica-Bold').fillColor('#1a1a2e');
            drawRow('Net Salary', payrollData.netSalary, doc.y);

            // Footer
            doc.moveDown(4);
            doc.fontSize(8).font('Helvetica').fillColor('#999')
                .text('This is a system-generated payslip and does not require a signature.', { align: 'center' });
            doc.text(`Generated on: ${new Date().toLocaleDateString('en-IN')}`, { align: 'center' });

            doc.end();
        } catch (error) {
            reject(error);
        }
    });
};

module.exports = { generatePayslipPDF };
