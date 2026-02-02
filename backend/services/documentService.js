require('dotenv').config();
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

// Variables de Google Drive opcionales: no salir si faltan
const requiredEnvVars = ['GOOGLE_CLIENT_EMAIL', 'GOOGLE_PRIVATE_KEY', 'GOOGLE_PROJECT_ID', 'GOOGLE_CLIENT_ID'];
const hasAll = requiredEnvVars.every(name => {
  const v = process.env[name];
  return v && (typeof v !== 'string' || v.trim() !== '');
});

let auth = null;
let drive = null;

if (hasAll) {
  try {
    const pk = process.env.GOOGLE_PRIVATE_KEY;
    const key = pk && typeof pk === 'string' ? pk.replace(/\\n/g, '\n') : undefined;
    auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: key,
        project_id: process.env.GOOGLE_PROJECT_ID,
        client_id: process.env.GOOGLE_CLIENT_ID
      },
      scopes: ['https://www.googleapis.com/auth/drive']
    });
    drive = google.drive({ version: 'v3', auth });
  } catch (e) {
    console.warn('documentService: Google Drive no inicializado:', e.message);
  }
}

/**
 * Sube un documento a Google Drive
 * @param {string} docCenabast - Número de documento Cenabast
 * @param {string} rutProveedor - RUT del proveedor
 * @param {string} base64Document - Documento en formato base64
 * @returns {Promise<Object>} Información del documento subido
 */
const uploadDocument = async (docCenabast, rutProveedor, base64Document) => {
    if (!drive) throw new Error('Google Drive no está configurado. Configure las variables de entorno.');
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
    if (!drive) throw new Error('Google Drive no está configurado. Configure las variables de entorno.');
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
    if (!drive) throw new Error('Google Drive no está configurado. Configure las variables de entorno.');
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