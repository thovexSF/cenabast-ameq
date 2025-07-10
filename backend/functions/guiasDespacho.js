// Este script recibe un archivo con formato de reporte Guias de Despacho de BSALE 
const XLSX = require('xlsx');

// Función principal para generar despachos
async function generarDespachos(buffer) {
    try {
        // Leer el archivo Excel (soporta tanto .xls como .xlsx)
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        
        // Convertir los datos de la hoja en un arreglo de objetos JSON, iniciando en la fila 9
        const data = XLSX.utils.sheet_to_json(worksheet, { 
            range: 8  // 'range: 8' comienza en la fila 9
        });

        console.log('=== Procesando archivo de guías de despacho ===');
        console.log('Tipo de archivo:', workbook.SheetNames[0]);
        console.log('Número de filas:', data.length);

        return generarDistribucion(data);
    } catch (error) {
        console.error('Error al procesar archivo de guías:', error);
        throw new Error(`Error al procesar el archivo: ${error.message}`);
    }
}

// Función para extraer DOC. VENTA y Cantidad desde la columna 'Otros Atributos'
function parseOtrosAtributos(otrosAtributos) {
    const docVentaRegex = /(Doc\.venta|DOC\.\s*VENTA:?)\s*(\d+)/gi;
    const cantidadRegex = /(Cant\.|CANT\.)\s*(\d+)/g;
    const loteRegex = /LOTE:\s+(\S+)/gi;

    let docsVenta = [];
    let docVentaMatch, cantidadMatch, loteMatch;

    // Extraer todos los DOC. VENTA
    let docVentas = [];
    while ((docVentaMatch = docVentaRegex.exec(otrosAtributos)) !== null) {
        docVentas.push(docVentaMatch[2]);
    }

    // Extraer todas las cantidades
    let cantidades = [];
    while ((cantidadMatch = cantidadRegex.exec(otrosAtributos)) !== null) {
        cantidades.push(cantidadMatch[2]);
    }

    let lote = '';
    loteMatch = loteRegex.exec(otrosAtributos);
    if (loteMatch) {
        lote = loteMatch[1];
    }

    // Asegurar que se itera por la mayor longitud
    const maxLength = Math.max(docVentas.length, cantidades.length, 1);

    for (let i = 0; i < maxLength; i++) {
        docsVenta.push({
            Doc_Cenabast: docVentas[i] || null,
            Cantidad: cantidades[i] || 0,
            Lote: lote || ''
        });
    }
    return docsVenta;
}

// Función para formatear la fecha al formato DDMMYYYY
function formatDate(excelDate) {
    const date = XLSX.SSF.parse_date_code(excelDate);
    const day = String(date.d).padStart(2, '0');
    const month = String(date.m).padStart(2, '0');
    const year = date.y;

    return `${day}-${month}-${year}`;
}

// Función para generar el JSON de salida
function generarDistribucion(formattedData) {
    const distribuciones = [];

    formattedData.forEach(row => {
        const docsVenta = parseOtrosAtributos(row['Otros Atributos']);
        const guia = row['Nº Documento'];
        const fechaGui = formatDate(row['Fecha Emisión']);
        const oTrans = row['Nº Documento'];
        const articulo = row['SKU'];
        const fechaDist = formatDate(row['Fecha Emisión']);

        docsVenta.forEach(docVenta => {
            const distribucion = {
                "Rut_Proveedor": "76209836",
                "Doc_Cenabast": docVenta.Doc_Cenabast,
                "Factura": 0,
                "Fecha_Fac": "",
                "Guia": guia,
                "Fecha_Gui": fechaGui,
                "O_Trans": oTrans,
                "Detalles": [
                    {
                        "Doc_Cenabast": docVenta.Doc_Cenabast,
                        "Articulo": articulo,
                        "Lote": docVenta.Lote,
                        "Cantidad": docVenta.Cantidad
                    }
                ],
                "Movimientos": [
                    {
                        "Doc_Cenabast": docVenta.Doc_Cenabast,
                        "Fecha": fechaDist,
                        "Hora": "00:00:00",
                        "DescMovimiento": 2,
                        "RecibidoPor": "EN TRANSITO"
                    }
                ],
            };
            distribuciones.push(distribucion);
        });
    });
    console.log(distribuciones)
    return distribuciones;
}

module.exports = {
    generarDespachos,
};
