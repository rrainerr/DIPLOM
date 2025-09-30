import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

export const exportToExcel = (data, fileName = 'export.xlsx') => {
    // Создаем новую рабочую книгу
    const workbook = XLSX.utils.book_new();

    // Обрабатываем каждый лист данных
    Object.keys(data).forEach(sheetName => {
        const sheetData = data[sheetName];
        if (sheetData && sheetData.length > 0) {
            // Создаем рабочий лист из данных
            const worksheet = XLSX.utils.json_to_sheet(sheetData);

            // Добавляем рабочий лист в книгу
            XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
        }
    });

    // Генерируем Excel файл
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

    // Сохраняем файл
    saveAs(blob, `${fileName}_${new Date().toISOString().split('T')[0]}.xlsx`);
};