//Este script recibe un archivo con formato de reporte Guias de Despacho de BSALE 
const xlsx = require('xlsx');

function formatDate(excelDate) {
    const date = xlsx.SSF.parse_date_code(excelDate);
    const day = String(date.d).padStart(2, '0');
    const month = String(date.m).padStart(2, '0');
    const year = date.y;

    return `${month}-${day}-${year}`;
}

// Función para extraer el número después de "DOC. VENTA"
function extractDocVenta(text) {
    const match = text.match(/DOC\.\s*VENTA:?\s*(\d+)/);
    return match ? match[1] : null;
}

// Función para leer y procesar el archivo Excel de facturas
function readInvoiceFile(buffer) {
    const workbook = xlsx.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    const data = xlsx.utils.sheet_to_json(worksheet, { header: 1, range: 11 });
    data.shift();

    const facturas = [];
    
    data.forEach(row => {
        const folio = row[1];
        const fechaEmision = formatDate(row[6]);
        const docVenta = extractDocVenta(row[39]);

        if (docVenta) {
            const factura = {
                IdDistribucion: null, // Se llenará en el servidor
                Rut_Proveedor: "76209836",
                Doc_Cenabast: parseInt(docVenta),
                Factura: parseInt(folio),
                Fecha_Fac: fechaEmision + " 0:00:00",
                Guia: null, // Se llenará con datos de Cenabast
                Fecha_Gui: null, // Se llenará con datos de Cenabast
                O_Trans: null, // Se llenará con datos de Cenabast
                Detalles: [], // Se llenará con datos de Cenabast
                Movimientos: [] // Se llenará con datos de Cenabast
            };
            facturas.push(factura);
        }
    });

    return facturas;
}

module.exports = {
    readInvoiceFile,
};
