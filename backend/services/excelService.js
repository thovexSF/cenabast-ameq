const XLSX = require('xlsx');

/**
 * Procesa un archivo Excel y extrae sus datos
 * @param {Buffer} fileBuffer - Buffer del archivo Excel
 * @returns {Array} Array de objetos con los datos del Excel
 */
const processExcelFile = async (fileBuffer) => {
    try {
        // Leer el archivo Excel desde el buffer
        const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
        
        // Obtener la primera hoja
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Convertir la hoja a JSON
        const data = XLSX.utils.sheet_to_json(worksheet);
        
        return data;
    } catch (error) {
        console.error('Error al procesar el archivo Excel:', error);
        throw new Error('Error al procesar el archivo Excel: ' + error.message);
    }
};

module.exports = {
    processExcelFile
}; 