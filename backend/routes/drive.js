const express = require('express');
const router = express.Router();
const { listDriveDocuments, getFolderInfo } = require('../services/googleDriveService');

// Listar documentos y carpetas
router.get('/list', async (req, res) => {
  try {
    const folderId = req.query.folderId || null;
    const items = await listDriveDocuments(folderId);
    res.json(items);
  } catch (error) {
    console.error('Error al listar documentos:', error);
    res.status(500).json({ error: 'Error al listar documentos' });
  }
});

// Obtener información de una carpeta específica
router.get('/folder/:id', async (req, res) => {
  try {
    const folderInfo = await getFolderInfo(req.params.id);
    res.json(folderInfo);
  } catch (error) {
    console.error('Error al obtener información de la carpeta:', error);
    res.status(500).json({ error: 'Error al obtener información de la carpeta' });
  }
});

module.exports = router; 