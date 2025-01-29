const XLSX = require('xlsx');

function procesarArchivoEntrega(buffer) {
    // Leer el archivo Excel
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 'A' });

    // Procesar los datos, saltando la primera fila (encabezado)
    const entregas = data.slice(1).map(row => {
        if (!row.C) return null; // Saltar si no hay Doc_Cenabast

        const docCenabast = row.C.toString();
        const fecha = row.H ? row.H.toString() : null; // Fecha de la columna H
  
        if (!fecha) return null;

        return {
            Doc_Cenabast: parseInt(docCenabast),
            Fecha: fecha.replace(/(\d{4})(\d{2})(\d{2})/, '$3-$2-$1'),
            Hora: "11:59:00",
            DescMovimiento: 1,
            RecibidoPor: "RECIBIDO"
        };
    }).filter(entrega => entrega !== null);

    if (entregas.length === 0) {
        throw new Error('No se encontraron entregas válidas en el archivo');
    }

    console.log('Entregas procesadas:', entregas);
    return entregas;
}

module.exports = {
    procesarArchivoEntrega
}; 