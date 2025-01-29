const { 
    obtenerDetallesDocumento, 
    informarFechaEntrega 
} = require('./funcionesCenabast');

const informarRechazo = async (docCenabast, datos, token) => {
    try {
        // Verificar si el documento existe y sus movimientos
        const detalles = await obtenerDetallesDocumento(docCenabast, token);
        if (!detalles) {
            throw new Error(`El documento ${docCenabast} no existe en el sistema`);
        }

        // Verificar entregas existentes primero
        const tieneEntregaConfirmada = detalles?.Movimientos?.some(
            mov => mov.DescMovimiento === 1 && mov.RecibidoPor === 'RECIBIDO'
        );

        if (tieneEntregaConfirmada) {
            throw new Error('No se puede rechazar un documento que ya tiene entrega confirmada');
        }

        // Luego verificar rechazos
        const tieneRechazo = detalles?.Movimientos?.some(
            mov => mov.DescMovimiento === 3
        );
        
        if (tieneRechazo) {
            throw new Error('Ya existe un rechazo registrado para este documento');
        }

        // Si pasa las verificaciones, proceder con el rechazo usando la función existente
        const movimiento = {
            Doc_Cenabast: docCenabast,
            Fecha: datos.Fecha,
            Hora: datos.Hora || "11:59:00",
            DescMovimiento: 3,
            RecibidoPor: "RECHAZADO"
        };

        await informarFechaEntrega(docCenabast, movimiento, token);

        return {
            Doc_Cenabast: docCenabast,
            Fecha_Entrega: datos.Fecha,
            DescMovimiento: 3,
            mensaje: 'Rechazo informado exitosamente'
        };

    } catch (error) {
        console.error('Error en informarRechazo:', error);
        throw error;
    }
};

module.exports = { informarRechazo }; 