require('dotenv').config();

const { google } = require('googleapis');
const path = require('path');

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

// Inicializar el cliente de Drive
const drive = google.drive({ version: 'v3', auth });

// Función para listar documentos y carpetas
const listDriveDocuments = async (folderId = null) => {
  try {
    const targetFolderId = folderId || process.env.GOOGLE_DRIVE_FOLDER_ID;
    console.log('Buscando en la carpeta:', targetFolderId);
    
    // Obtener la lista de carpetas
    const foldersResponse = await drive.files.list({
      q: `'${targetFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: 'files(id, name, mimeType, createdTime, modifiedTime)',
      orderBy: 'name',
      pageSize: 1000
    });

    console.log('Carpetas encontradas:', foldersResponse.data.files);

    // Obtener la lista de documentos
    const filesResponse = await drive.files.list({
      q: `'${targetFolderId}' in parents and mimeType!='application/vnd.google-apps.folder' and trashed=false`,
      fields: 'files(id, name, mimeType, size, createdTime, modifiedTime)',
      orderBy: 'name',
      pageSize: 1000
    });

    console.log('Archivos encontrados:', filesResponse.data.files);

    return {
      folders: foldersResponse.data.files.map(folder => ({
        id: folder.id,
        name: folder.name,
        type: 'folder',
        createdTime: folder.createdTime,
        modifiedTime: folder.modifiedTime
      })),
      files: filesResponse.data.files.map(file => ({
        id: file.id,
        name: file.name,
        type: 'file',
        mimeType: file.mimeType,
        size: file.size,
        createdTime: file.createdTime,
        modifiedTime: file.modifiedTime
      }))
    };
  } catch (error) {
    console.error('Error al listar documentos de Drive:', error);
    throw error;
  }
};

// Función para obtener información de una carpeta específica
const getFolderInfo = async (folderId) => {
  try {
    const response = await drive.files.get({
      fileId: folderId,
      fields: 'id, name, mimeType, createdTime, modifiedTime'
    });

    return {
      id: response.data.id,
      name: response.data.name,
      type: 'folder',
      createdTime: response.data.createdTime,
      modifiedTime: response.data.modifiedTime
    };
  } catch (error) {
    console.error('Error al obtener información de la carpeta:', error);
    throw error;
  }
};

// Función para descargar un documento
const downloadDriveDocument = async (fileId) => {
  try {
    // Descargar el archivo
    const file = await drive.files.get({
      fileId: fileId,
      alt: 'media'
    }, { responseType: 'arraybuffer' });

    return file.data;
  } catch (error) {
    console.error('Error al descargar documento de Drive:', error);
    throw error;
  }
};

module.exports = {
  drive,
  listDriveDocuments,
  downloadDriveDocument,
  getFolderInfo
}; 