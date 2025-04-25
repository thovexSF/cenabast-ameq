import React, { useState, useEffect } from 'react';
import { Box, Typography, List, ListItem, ListItemText, ListItemIcon, IconButton, Breadcrumbs, Link, CircularProgress } from '@mui/material';
import FolderIcon from '@mui/icons-material/Folder';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import HomeIcon from '@mui/icons-material/Home';
import Checkbox from '@mui/material/Checkbox';

interface DriveItem {
  id: string;
  name: string;
  type: 'file' | 'folder';
  mimeType?: string;
  size?: string;
  createdTime?: string;
  modifiedTime?: string;
}

interface FolderPath {
  id: string;
  name: string;
}

const GoogleDriveBrowser: React.FC = () => {
  const [items, setItems] = useState<DriveItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [folderPath, setFolderPath] = useState<FolderPath[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());

  const fetchItems = async (folderId: string | null = null) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/drive/list?folderId=${folderId || ''}`);
      const data = await response.json();
      
      // Combinar carpetas y archivos en un solo array
      const allItems = [
        ...data.folders.map((folder: any) => ({ ...folder, type: 'folder' })),
        ...data.files.map((file: any) => ({ ...file, type: 'file' }))
      ];
      
      setItems(allItems);
    } catch (error) {
      console.error('Error fetching items:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems(currentFolderId);
  }, [currentFolderId]);

  const handleFolderClick = (folder: DriveItem) => {
    setCurrentFolderId(folder.id);
    setFolderPath([...folderPath, { id: folder.id, name: folder.name }]);
  };

  const handleBreadcrumbClick = (index: number) => {
    const newPath = folderPath.slice(0, index + 1);
    setFolderPath(newPath);
    setCurrentFolderId(newPath[newPath.length - 1].id);
  };

  const handleFileSelect = (fileId: string) => {
    const newSelectedFiles = new Set(selectedFiles);
    if (newSelectedFiles.has(fileId)) {
      newSelectedFiles.delete(fileId);
    } else {
      newSelectedFiles.add(fileId);
    }
    setSelectedFiles(newSelectedFiles);
  };

  const handleUploadSelected = async () => {
    try {
      const selectedItems = items.filter(item => selectedFiles.has(item.id));
      const uploadPromises = selectedItems.map(async (item) => {
        const response = await fetch('/api/drive/upload', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            fileId: item.id,
            fileName: item.name,
            docCenabast: item.name.split('.')[0],
            rutProveedor: "76209836"
          }),
        });

        if (!response.ok) {
          throw new Error(`Error al subir ${item.name}`);
        }

        return response.json();
      });

      await Promise.all(uploadPromises);
      setSelectedFiles(new Set()); // Limpiar selección después de subir
      alert('Archivos subidos exitosamente');
    } catch (error) {
      console.error('Error al subir archivos:', error);
      alert('Error al subir archivos: ' + error.message);
    }
  };

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h5" gutterBottom>
        Navegador de Google Drive
      </Typography>

      <Breadcrumbs separator={<NavigateNextIcon fontSize="small" />} sx={{ mb: 2 }}>
        <Link
          component="button"
          variant="body1"
          onClick={() => {
            setCurrentFolderId(null);
            setFolderPath([]);
          }}
          sx={{ display: 'flex', alignItems: 'center' }}
        >
          <HomeIcon sx={{ mr: 0.5 }} fontSize="inherit" />
          Inicio
        </Link>
        {folderPath.map((folder, index) => (
          <Link
            key={folder.id}
            component="button"
            variant="body1"
            onClick={() => handleBreadcrumbClick(index)}
          >
            {folder.name}
          </Link>
        ))}
      </Breadcrumbs>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
          <CircularProgress />
        </Box>
      ) : (
        <List>
          {items.map((item) => (
            <ListItem
              key={item.id}
              secondaryAction={
                item.type === 'file' && (
                  <Checkbox
                    edge="end"
                    checked={selectedFiles.has(item.id)}
                    onChange={() => handleFileSelect(item.id)}
                  />
                )
              }
            >
              <ListItemIcon>
                {item.type === 'folder' ? <FolderIcon /> : <InsertDriveFileIcon />}
              </ListItemIcon>
              <ListItemText
                primary={item.name}
                secondary={
                  item.type === 'file'
                    ? `${(Number(item.size) / 1024).toFixed(2)} KB`
                    : 'Carpeta'
                }
                onClick={() => item.type === 'folder' && handleFolderClick(item)}
                sx={{ cursor: item.type === 'folder' ? 'pointer' : 'default' }}
              />
            </ListItem>
          ))}
        </List>
      )}

      {selectedFiles.size > 0 && (
        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
          <Typography variant="body2" sx={{ mr: 2 }}>
            {selectedFiles.size} archivo(s) seleccionado(s)
          </Typography>
          <IconButton
            color="primary"
            onClick={handleUploadSelected}
            disabled={selectedFiles.size === 0}
          >
            Subir seleccionados
          </IconButton>
        </Box>
      )}
    </Box>
  );
};

export default GoogleDriveBrowser; 