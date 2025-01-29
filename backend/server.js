const express = require('express');
const cors = require('cors');
const path = require('path');
const uploadRoutes = require('./routes/upload');
const multer = require('multer');
require('dotenv').config();

const BASEURL = process.env.NODE_ENV === 'production' 
    ? process.env.CENABAST_PRODUCTION_BASEURL 
    : process.env.CENABAST_DEVELOPMENT_BASEURL;

const app = express();

// Middleware para parsear JSON y form data
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Rutas de la API - con prefijo /api
app.use('/api', uploadRoutes);

// Middleware para servir archivos estáticos
app.use(express.static(path.join(__dirname, 'public')));

// Esta ruta DEBE ir después de todas las rutas de API
// Maneja cualquier otra solicitud enviando el index.html
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Manejo de errores de multer
app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                error: 'Archivo demasiado grande',
                message: 'El archivo no debe superar los 10MB'
            });
        }
        return res.status(400).json({
            error: 'Error al subir archivo',
            message: err.message
        });
    }
    next(err);
});

// Manejo de errores global
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({
        error: 'Error interno del servidor',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Algo salió mal'
    });
});

// Iniciar servidor
const port = process.env.PORT || 3002;
app.listen(port, () => {
    console.log(`Servidor corriendo en el puerto ${port}`);
    console.log(`Ambiente: ${process.env.NODE_ENV}`);
    console.log(`URL Cenabast: ${BASEURL}`);
});