const { Parser } = require('json2csv');
const XLSX = require('xlsx');

const exportToCSV = (data, fields) => {
    const parser = new Parser({ fields });
    return parser.parse(data);
};

const exportToExcel = (data, sheetName = 'Sheet1') => {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
};

module.exports = { exportToCSV, exportToExcel };
