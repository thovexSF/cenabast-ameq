const express = require('express');
const cors = require('cors');
const path = require('path');
const uploadRoutes = require('./routes/upload');
const multer = require('multer');
require('dotenv').config();
const { google } = require('googleapis');
const driveRoutes = require('./routes/drive');

// Verificar que las variables de entorno estén definidas
const requiredEnvVars = [
  'GOOGLE_CLIENT_EMAIL',
  'GOOGLE_PRIVATE_KEY',
  'GOOGLE_PROJECT_ID',
  'GOOGLE_CLIENT_ID'
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`Error: La variable de entorno ${envVar} no está definida`);
    process.exit(1);
  }
}

// Configuración de autenticación
const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    project_id: process.env.GOOGLE_PROJECT_ID,
    client_id: process.env.GOOGLE_CLIENT_ID
  },
  scopes: ['https://www.googleapis.com/auth/drive']
});

const BASEURL = process.env.REACT_APP_RAILWAY_ENVIRONMENT === 'development'
    ? process.env.CENABAST_DEVELOPMENT_BASEURL 
    : process.env.CENABAST_PRODUCTION_BASEURL;

const app = express();

// Middleware para parsear JSON y form data
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Ruta para obtener el entorno
app.get('/api/environment', (req, res) => {
  res.json({
    environment: process.env.REACT_APP_RAILWAY_ENVIRONMENT || 'production'
  });
});

app.get('/api/driveDocuments', async (req, res) => {
  try {
    const drive = google.drive({ version: 'v3', auth });
    const response = await drive.files.list({
      q: "mimeType='application/pdf'",
      fields: 'files(name)',
    });
    const documents = response.data.files.map(file => file.name);
    res.json({ documents });
  } catch (error) {
    console.error('Error al obtener documentos de Drive:', error);
    res.status(500).json({ error: 'Error al obtener documentos de Drive' });
  }
});

// Rutas de la API - con prefijo /api
app.use('/api', uploadRoutes);
app.use('/api/drive', driveRoutes);

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
const port = process.env.PORT || 3001;
app.listen(port, () => {
    console.log(`Servidor corriendo en el puerto ${port}`);
    console.log(`Ambiente: ${process.env.REACT_APP_RAILWAY_ENVIRONMENT === 'development' ? 'DEVELOPMENT' : 'PRODUCTION'}`);
    if (process.env.RAILWAY_ENVIRONMENT) {
        console.log(`Ambiente Railway: ${process.env.RAILWAY_ENVIRONMENT}`);
    }
    console.log(`URL Cenabast: ${BASEURL}`);
});