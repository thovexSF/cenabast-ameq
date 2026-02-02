require('dotenv').config();

const { google } = require('googleapis');
const path = require('path');

// Validar variables de entorno requeridas
const requiredEnvVars = [
  'GOOGLE_CLIENT_EMAIL',
  'GOOGLE_PRIVATE_KEY',
  'GOOGLE_PROJECT_ID',
  'GOOGLE_CLIENT_ID'
];

const missingVars = requiredEnvVars.filter(varName => {
  const value = process.env[varName];
  return !value || (typeof value === 'string' && value.trim() === '');
});

if (missingVars.length > 0) {
  console.warn(`⚠️  Advertencia: Variables de entorno faltantes para Google Drive: ${missingVars.join(', ')}`);
  console.warn('El servicio de Google Drive no estará disponible hasta que se configuren estas variables.');
}

// Configuración de autenticación (solo si todas las variables están presentes)
let auth = null;
let drive = null;

if (missingVars.length === 0) {
  try {
    // Procesar la clave privada de forma segura
    const privateKey = process.env.GOOGLE_PRIVATE_KEY;
    const processedPrivateKey = privateKey && typeof privateKey === 'string' 
      ? privateKey.replace(/\\n/g, '\n') 
      : undefined;

    auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: processedPrivateKey,
        project_id: process.env.GOOGLE_PROJECT_ID,
        client_id: process.env.GOOGLE_CLIENT_ID
      },
      scopes: ['https://www.googleapis.com/auth/drive']
    });

    // Inicializar el cliente de Drive
    drive = google.drive({ version: 'v3', auth });
  } catch (error) {
    console.error('Error al inicializar Google Drive:', error);
    console.error('Asegúrate de que todas las variables de entorno de Google Drive estén configuradas correctamente.');
  }
}


// Función para listar documentos y carpetas
const listDriveDocuments = async (folderId = null) => {
  if (!drive) {
    throw new Error('Google Drive no está configurado. Por favor, configure las variables de entorno: GOOGLE_CLIENT_EMAIL, GOOGLE_PRIVATE_KEY, GOOGLE_PROJECT_ID, GOOGLE_CLIENT_ID');
  }

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
  if (!drive) {
    throw new Error('Google Drive no está configurado. Por favor, configure las variables de entorno: GOOGLE_CLIENT_EMAIL, GOOGLE_PRIVATE_KEY, GOOGLE_PROJECT_ID, GOOGLE_CLIENT_ID');
  }

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
  if (!drive) {
    throw new Error('Google Drive no está configurado. Por favor, configure las variables de entorno: GOOGLE_CLIENT_EMAIL, GOOGLE_PRIVATE_KEY, GOOGLE_PROJECT_ID, GOOGLE_CLIENT_ID');
  }

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