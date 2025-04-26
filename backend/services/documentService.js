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

const drive = google.drive({ version: 'v3', auth });

/**
 * Sube un documento a Google Drive
 * @param {string} docCenabast - Número de documento Cenabast
 * @param {string} rutProveedor - RUT del proveedor
 * @param {string} base64Document - Documento en formato base64
 * @returns {Promise<Object>} Información del documento subido
 */
const uploadDocument = async (docCenabast, rutProveedor, base64Document) => {
    try {
        // Convertir base64 a buffer
        const buffer = Buffer.from(base64Document, 'base64');
        
        // Crear archivo temporal
        const tempFilePath = path.join(__dirname, `temp_${docCenabast}.pdf`);
        fs.writeFileSync(tempFilePath, buffer);

        // Subir a Google Drive
        const fileMetadata = {
            name: `${docCenabast}_${rutProveedor}.pdf`,
            parents: [process.env.GOOGLE_DRIVE_FOLDER_ID]
        };

        const media = {
            mimeType: 'application/pdf',
            body: fs.createReadStream(tempFilePath)
        };

        const response = await drive.files.create({
            resource: fileMetadata,
            media: media,
            fields: 'id, name, webViewLink'
        });

        // Limpiar archivo temporal
        fs.unlinkSync(tempFilePath);

        return {
            success: true,
            fileId: response.data.id,
            fileName: response.data.name,
            webViewLink: response.data.webViewLink
        };

    } catch (error) {
        console.error('Error al subir documento:', error);
        throw new Error('Error al subir documento: ' + error.message);
    }
};

/**
 * Lista los documentos en Google Drive
 * @returns {Promise<Array>} Lista de documentos
 */
const listDriveDocuments = async () => {
    try {
        const response = await drive.files.list({
            q: `'${process.env.GOOGLE_DRIVE_FOLDER_ID}' in parents and trashed = false`,
            fields: 'files(id, name, webViewLink)',
            orderBy: 'name'
        });

        return response.data.files.map(file => ({
            id: file.id,
            name: file.name,
            webViewLink: file.webViewLink
        }));
    } catch (error) {
        console.error('Error al listar documentos:', error);
        throw new Error('Error al listar documentos: ' + error.message);
    }
};

/**
 * Descarga un documento de Google Drive
 * @param {string} fileId - ID del archivo en Google Drive
 * @returns {Promise<Buffer>} Contenido del archivo
 */
const downloadDriveDocument = async (fileId) => {
    try {
        const response = await drive.files.get({
            fileId: fileId,
            alt: 'media'
        }, { responseType: 'arraybuffer' });

        return Buffer.from(response.data);
    } catch (error) {
        console.error('Error al descargar documento:', error);
        throw new Error('Error al descargar documento: ' + error.message);
    }
};

module.exports = {
    uploadDocument,
    listDriveDocuments,
    downloadDriveDocument
}; 