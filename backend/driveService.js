require('dotenv').config();
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

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

// Inicializar el servicio de Drive
const drive = google.drive({ version: 'v3', auth });

// ID de la carpeta de Drive donde están los documentos
const FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID || '11GFsUKHBvxUUY4q0rTF0iNP5oGj-qPhT';

// Función para listar documentos en la carpeta
async function listDriveDocuments() {
    try {
        console.log('Iniciando búsqueda en Drive...');
        console.log('FOLDER_ID:', FOLDER_ID);
        
        const query = `'${FOLDER_ID}' in parents and trashed = false`;
        console.log('Query de búsqueda:', query);

        const response = await drive.files.list({
            q: query,
            fields: 'files(id, name, mimeType, webViewLink)',
            orderBy: 'name'
        });

        console.log('Respuesta de Drive:', {
            totalFiles: response.data.files?.length || 0,
            files: response.data.files?.map(f => ({
                name: f.name,
                mimeType: f.mimeType,
                id: f.id
            }))
        });

        if (!response.data.files || response.data.files.length === 0) {
            console.log('No se encontraron archivos en la carpeta');
            return [];
        }

        return response.data.files.map(file => ({
            id: file.id,
            name: file.name,
            webViewLink: file.webViewLink
        }));
    } catch (error) {
        console.error('Error detallado al listar documentos de Drive:', {
            message: error.message,
            code: error.code,
            errors: error.errors
        });
        throw error;
    }
}

// Función para descargar un documento específico
async function downloadDriveDocument(fileName) {
    try {
        if (!FOLDER_ID) {
            throw new Error('GOOGLE_DRIVE_FOLDER_ID no está definido en las variables de entorno');
        }

        // Buscar el archivo por nombre
        const response = await drive.files.list({
            q: `'${FOLDER_ID}' in parents and name='${fileName}' and trashed = false`,
            fields: 'files(id)'
        });

        if (response.data.files.length === 0) {
            throw new Error('Documento no encontrado en Drive');
        }

        const fileId = response.data.files[0].id;

        // Descargar el archivo
        const file = await drive.files.get({
            fileId: fileId,
            alt: 'media'
        }, { responseType: 'arraybuffer' });

        return Buffer.from(file.data);
    } catch (error) {
        console.error('Error al descargar documento de Drive:', error);
        throw error;
    }
}

module.exports = {
    listDriveDocuments,
    downloadDriveDocument
}; 