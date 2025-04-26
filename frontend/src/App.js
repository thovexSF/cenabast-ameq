import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import { Modal } from 'bootstrap';
import * as XLSX from 'xlsx';
import $ from 'jquery';

const API_URL = window.location.hostname.includes('development')
    ? `https://cenabast-ameq-development.up.railway.app/api`
    : window.location.hostname === 'localhost' || window.location.hostname.match(/^192\.168\.|^10\.|^172\.(1[6-9]|2[0-9]|3[0-1])\./)
    ? 'http://localhost:3001/api'
    : '/api';

function App() {
  const [environment, setEnvironment] = useState('PROD');
  const [file, setFile] = useState(null);
  const [processingGuia, setProcessingGuia] = useState(false);
  const [processingEntrega, setProcessingEntrega] = useState(false);
  const [processingFactura, setProcessingFactura] = useState(false);
  const [dispatches, setDispatches] = useState([]);
  const [invoiceFile, setInvoiceFile] = useState(null);
  const [activeTable, setActiveTable] = useState(null);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [deliveryFile, setDeliveryFile] = useState(null);
  const [cedibleForm, setCedibleForm] = useState({
    docCenabast: '',
    archivo: null
  });
  const [lastUploadedDoc, setLastUploadedDoc] = useState(null);
  const [uploadError, setUploadError] = useState(null);
  const [rechazoForm, setRechazoForm] = useState({
    docCenabast: '',
    fecha: ''
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [downloadData, setDownloadData] = useState(null);
  const [downloadFileName, setDownloadFileName] = useState('');
  const [driveDocuments, setDriveDocuments] = useState([]);
  const [loadingDrive, setLoadingDrive] = useState(false);
  const [showDriveSection, setShowDriveSection] = useState(false);
  const [uploadStatus, setUploadStatus] = useState({});
  const [currentFolder, setCurrentFolder] = useState(null);
  const [folderStructure, setFolderStructure] = useState([]);
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [folderPath, setFolderPath] = useState([]);

  // Referencias para los modales
  const rechazoModalRef = useRef(null);

  useEffect(() => {
    const getEnvironment = async () => {
      try {
        const response = await axios.get(`${API_URL}/environment`);
        console.log('Environment response:', response.data);
        const isLocal = window.location.hostname === 'localhost' || window.location.hostname.match(/^192\.168\.|^10\.|^172\.(1[6-9]|2[0-9]|3[0-1])\./);
        setEnvironment(response.data.environment === 'development' || isLocal ? 'DEV' : 'PROD');
      } catch (error) {
        console.error('Error al obtener el entorno:', error);
        const isLocal = window.location.hostname === 'localhost' || window.location.hostname.match(/^192\.168\.|^10\.|^172\.(1[6-9]|2[0-9]|3[0-1])\./);
        setEnvironment(isLocal ? 'DEV' : 'PROD');
      }
    };
    getEnvironment();
  }, []);

  //Informar Guía Despacho
  const handleFileChange = (event) => {
    let selectedFile;
    if (event.dataTransfer) {
      // Handle drag and drop
      event.preventDefault();
      selectedFile = event.dataTransfer.files?.[0];
    } else {
      // Handle normal file input
      selectedFile = event.target.files?.[0];
    }
    
    if (selectedFile && !selectedFile.type.match('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet|application/vnd.ms-excel')) {
      alert('Por favor, sube un archivo Excel (.xlsx, .xls)');
      return;
    }
    setFile(selectedFile);
  };

  const handleDragOver = (event) => {
    event.preventDefault();
  };

  const downloadExcel = (data, fileName) => {
    // Create a worksheet
    const ws = XLSX.utils.json_to_sheet(data);
    
    // Create a workbook
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Datos");
    
    // Generate Excel file
    XLSX.writeFile(wb, `${fileName}.xlsx`);
  };

  
  const handleProcess = async () => {
    if (!file) {
      alert('Por favor, sube un archivo primero.');
      return;
    }

    setProcessingGuia(true);
    // Limpiar variables de documentos cedibles
    setLastUploadedDoc(null);
    setUploadError(null);
    setShowDriveSection(false);
    
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post(`${API_URL}/uploadGuiaDespacho`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (response.data?.despachos) {
        const despachosConMensajes = response.data.despachos
          .map(despacho => ({
            Doc_Cenabast: despacho.Doc_Cenabast || '',
            Guia: despacho.Guia || '',
            Fecha_Guia: despacho.Fecha_Gui || '',
            oTrans: despacho['Nº Documento'] || despacho.Guia || '',
            Articulo: despacho.Articulo || despacho.Detalles?.[0]?.Articulo || '',
            Lote: despacho.Lote || despacho.Detalles?.[0]?.Lote || '',
            Cantidad: despacho.Cantidad || despacho.Detalles?.[0]?.Cantidad || '',
            mensaje: despacho.mensaje || 'El Doc_Cenabast ya existe'
          }))
          .sort((a, b) => {
            const getPrioridad = (mensaje) => {
              if (mensaje === 'Procesado exitosamente') return 1;
              if (mensaje.includes('Ya existe un movimiento')) return 2;
              return 3;
            };
            return getPrioridad(a.mensaje) - getPrioridad(b.mensaje);
          });

        // Debug para ver la estructura de los datos
        console.log('Datos recibidos del servidor:', response.data.despachos[0]);
        console.log('Datos procesados:', despachosConMensajes[0]);

        setDispatches(despachosConMensajes);
        setActiveTable('dispatches');
        setDownloadData(despachosConMensajes);
        setDownloadFileName('guias_despacho_procesadas');
      }

    } catch (error) {
      console.error('Error al procesar el archivo:', error);
      alert('Error al procesar el archivo: ' + error.message);
    } finally {
      setProcessingGuia(false);
      setFile(null);
    }
  };

  //Informar Entrega
  const handleDeliveryFileChange = (event) => {
    let selectedFile;
    if (event.dataTransfer) {
      event.preventDefault();
      selectedFile = event.dataTransfer.files?.[0];
    } else {
      selectedFile = event.target.files?.[0];
    }
    
    if (selectedFile && !selectedFile.type.match('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet|application/vnd.ms-excel')) {
      alert('Por favor, sube un archivo Excel (.xlsx, .xls)');
      event.target.value = '';
      setDeliveryFile(null);
      return;
    }
    
    setDeliveryFile(selectedFile);
  };

  const handleDeliveryProcess = async () => {
    if (!deliveryFile) {
        alert('Por favor, sube un archivo primero.');
        return;
    }

    setProcessingEntrega(true);
    // Limpiar variables de documentos cedibles
    setLastUploadedDoc(null);
    setUploadError(null);
    setShowDriveSection(false);
    
    const formData = new FormData();
    formData.append('file', deliveryFile);

    try {
        const response = await axios.post(`${API_URL}/uploadEntrega`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });

        if (response.data?.despachos) {
            setDispatches(response.data.despachos);
            setActiveTable('dispatches');
            setDownloadData(response.data.despachos);
            setDownloadFileName('entregas_procesadas');
        }

    } catch (error) {
        console.error('Error al procesar la entrega:', error);
        alert('Error al procesar la entrega: ' + error.message);
    } finally {
        setProcessingEntrega(false);
        setDeliveryFile(null);
        const fileInput = document.querySelector('input[type="file"][accept=".xlsx,.xls"]');
        if (fileInput) fileInput.value = '';
    }
  };

  //Informar Factura  
  const handleInvoiceFileChange = (event) => {
    let selectedFile;
    if (event.dataTransfer) {
      event.preventDefault();
      selectedFile = event.dataTransfer.files?.[0];
    } else {
      selectedFile = event.target.files?.[0];
    }
    
    if (selectedFile && !selectedFile.type.match('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet|application/vnd.ms-excel')) {
      alert('Por favor, sube un archivo Excel (.xlsx, .xls)');
      event.target.value = '';
      setInvoiceFile(null);
      return;
    }
    
    setInvoiceFile(selectedFile);
  };

  const handleProcessInvoice = async () => {
    if (!invoiceFile) {
        alert('Por favor, sube un archivo de factura primero.');
        return;
    }

    setProcessingFactura(true);
    // Limpiar variables de documentos cedibles
    setLastUploadedDoc(null);
    setUploadError(null);
    setShowDriveSection(false);
    
    const formData = new FormData();
    formData.append('file', invoiceFile);

    try {
        const response = await axios.post(`${API_URL}/uploadInvoice`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });

        if (response.data?.despachos) {
            const despachosOrdenados = [...response.data.despachos].sort((a, b) => {
                const getPrioridad = (mensaje) => {
                    if (mensaje === 'Procesado exitosamente') return 1;
                    if (mensaje.includes('Ya existe un movimiento')) return 2;
                    return 3;
                };
                
                return getPrioridad(a.mensaje) - getPrioridad(b.mensaje);
            }).map(despacho => {
                // Extraer solo los campos necesarios en el orden correcto
                return {
                    Doc_Cenabast: despacho.Doc_Cenabast,
                    Factura: despacho.Folio || despacho.Factura,
                    Fecha_Fac: despacho.Fecha_Emision || despacho.Fecha_Fac,
                    Guia: despacho.Guia || despacho.N_Guia,
                    Fecha_Guia: despacho.Fecha_Guia || despacho.Fecha_Gui,
                    mensaje: despacho.mensaje
                };
            });

            setDispatches(despachosOrdenados);
            setActiveTable('dispatches');
            setDownloadData(despachosOrdenados);
            setDownloadFileName('facturas_procesadas');
        }

    } catch (error) {
        console.error('Error al procesar la factura:', error);
        alert('Error al procesar la factura: ' + error.message);
    } finally {
        setProcessingFactura(false);
        setInvoiceFile(null);
        const fileInput = document.querySelector('input[type="file"][accept=".xlsx,.xls"]');
        if (fileInput) fileInput.value = '';
    }
  };

  const handleCedibleFormChange = (e) => {
    const { name, value } = e.target;
    setCedibleForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleCedibleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.type !== 'application/pdf') {
        alert('Por favor, sube un archivo PDF');
        e.target.value = '';
        return;
      }
      setCedibleForm(prev => ({
        ...prev,
        archivo: file
      }));
    }
  };

  const handleUploadCedible = async () => {
    if (!cedibleForm.docCenabast || !cedibleForm.archivo) {
      alert('Por favor, completa todos los campos');
      return;
    }

    setUploadingDoc(true);
    setUploadError(null);
    setDispatches(null);
    setActiveTable(null);

    try {
      const base64 = await fileToBase64(cedibleForm.archivo);
      
      const documentData = {
        docCenabast: cedibleForm.docCenabast,
        rutProveedor: "76209836",
        documento: base64
      };

      const response = await axios.post(`${API_URL}/uploadDocument`, documentData, {
        maxContentLength: Infinity,
        maxBodyLength: Infinity
      });
      
      if (response.data) {
        setLastUploadedDoc(cedibleForm.docCenabast);
        setUploadError(null);
        
        alert('Documento cedible subido exitosamente');
        setCedibleForm({
          docCenabast: '',
          archivo: null
        });
        const fileInput = document.querySelector('input[type="file"][accept=".pdf"]');
        if (fileInput) fileInput.value = '';
      }

    } catch (error) {
      console.error('Error al subir documento:', error);
      if (error.message.includes('PayloadTooLargeError') || error.message.includes('too large')) {
        setUploadError('El archivo es demasiado grande. Por favor, intenta con un archivo más pequeño (máximo 10MB)');
      } else {
        setUploadError(error.message || 'Error al subir documento');
      }
      setLastUploadedDoc(null);
    } finally {
      setUploadingDoc(false);
    }
  };

  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64String = reader.result.split(',')[1];
        resolve(base64String);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const handleShowModal = () => {
    try {
      const modalElement = document.getElementById('infoModalApp');
      if (!modalElement) return;
      
      // Usar jQuery para mostrar el modal de manera más segura
      $('#infoModalApp').modal({
        keyboard: false,
        backdrop: 'static'
      }).modal('show');
    } catch (error) {
      // Silently handle any errors
    }
  };

  // Inicializar los modales cuando el componente se monta
  useEffect(() => {
    const modalElement = rechazoModalRef.current;
    if (!modalElement) return;

    // Inicializar el modal si no existe
    if (!modalElement._modal) {
      const modal = new Modal(modalElement, {
        keyboard: false,
        backdrop: 'static'
      });
      modalElement._modal = modal;
    }

    // Limpiar al desmontar
    return () => {
      if (modalElement._modal) {
        modalElement._modal.dispose();
        delete modalElement._modal;
      }
    };
  }, []);

  // Función para cerrar el modal de rechazo
  const handleCloseRechazoModal = () => {
    try {
      const modalElement = document.getElementById('rechazoModal');
      if (!modalElement) return;
      
      // Usar la API de Bootstrap para cerrar el modal
      const modal = Modal.getInstance(modalElement);
      if (modal) {
        modal.hide();
      }
    } catch (error) {
      // Silently handle any errors
    }
  };

  const handleRechazoSubmit = async (e) => {
    e.preventDefault();
    setIsProcessing(true);
    
    // Limpiar variables de documentos cedibles
    setLastUploadedDoc(null);
    setUploadError(null);
    setShowDriveSection(false);
    
    // Limpiar la tabla antes de procesar
    setDispatches([]);
    
    try {
      // Asegurarnos de que la fecha tenga el formato correcto
      const fechaFormateada = rechazoForm.fecha.replace(/-/g, '');
      
      const response = await axios.post(`${API_URL}/informarRechazo`, {
        Doc_Cenabast: parseInt(rechazoForm.docCenabast),
        Fecha: fechaFormateada
      });

      if (response.data?.despachos) {
        setDispatches(response.data.despachos.map(despacho => ({
          ...despacho,
          DescMovimiento: 3,
          Fecha_Entrega: new Date(despacho.Fecha_Entrega).toLocaleDateString('es-CL')
        })));
        setActiveTable('dispatches');
        
        // Limpiar el formulario
        setRechazoForm({
          docCenabast: '',
          fecha: ''
        });

        handleCloseRechazoModal();
      }

    } catch (error) {
      console.error('Error al informar rechazo:', error);
      
      let errorMessage;
      if (error.response?.status === 500) {
        errorMessage = error.response.data.error || 
                      error.response.data.Message ||
                      error.response.data.message ||
                      error.response.data;
      } else {
        errorMessage = error.response?.data?.message || 
                      'Error al informar rechazo';
      }

      setDispatches([{
        Doc_Cenabast: rechazoForm.docCenabast,
        Fecha_Entrega: rechazoForm.fecha,
        DescMovimiento: 3,
        mensaje: errorMessage
      }]);
      setActiveTable('dispatches');
      
    } finally {
      setIsProcessing(false);
    }
  };

  // Función para inicializar los modales de Bootstrap
  useEffect(() => {
    try {
      // Inicializar todos los modales usando jQuery
      $('.modal').modal({
        keyboard: false,
        backdrop: 'static',
        show: false
      });
    } catch (error) {
      // Silently handle any errors
    }
  }, []);

  const fetchDriveDocuments = async (folderId = null) => {
    setLoadingDrive(true);
    try {
      const response = await axios.get(`${API_URL}/drive/list`, {
        params: { folderId }
      });
      
      if (response.data.folders) {
        setFolderStructure(response.data.folders);
      }
      
      if (response.data.files) {
        setDriveDocuments(response.data.files.map(file => ({
          id: file.id,
          name: file.name,
          selected: false
        })));
      }
      
      setCurrentFolder(folderId);
    } catch (error) {
      console.error('Error al obtener documentos de Drive:', error);
      alert('Error al obtener documentos de Drive: ' + error.message);
      setDriveDocuments([]);
      setFolderStructure([]);
    } finally {
      setLoadingDrive(false);
    }
  };

  const handleFolderSelect = (folder) => {
    setSelectedFolder(folder);
    setFolderPath(prev => [...prev, folder]);
    fetchDriveDocuments(folder.id);
  };

  const handleFolderBack = () => {
    if (folderPath.length > 1) {
      const newPath = folderPath.slice(0, -1);
      const parentFolder = newPath[newPath.length - 1];
      setFolderPath(newPath);
      setSelectedFolder(parentFolder);
      fetchDriveDocuments(parentFolder?.id || null);
    } else {
      setFolderPath([]);
      setSelectedFolder(null);
      fetchDriveDocuments(null);
    }
  };

  const handleSelectAllInFolder = () => {
    setDriveDocuments(prev => prev.map(doc => ({ ...doc, selected: true })));
  };

  const handleUploadDriveDocument = async () => {
    const selectedDocs = driveDocuments.filter(doc => doc.selected);
    if (selectedDocs.length === 0) {
      alert('Por favor, selecciona al menos un documento de Drive');
      return;
    }

    setUploadingDoc(true);
    setUploadError(null);
    setUploadStatus({});

    try {
      const uploadPromises = selectedDocs.map(async (doc) => {
        try {
          console.log('Intentando subir documento:', doc.name, 'ID:', doc.id);
          const response = await axios.post(`${API_URL}/uploadDriveDocument`, {
            fileId: doc.id,
            fileName: doc.name,
            docCenabast: doc.name.split('.')[0],
            rutProveedor: "76209836"
          });
          
          console.log('Respuesta del servidor:', response.data);
          
          setUploadStatus(prev => ({
            ...prev,
            [doc.name]: { 
              success: true, 
              message: response.data.message || 'Subido exitosamente',
              docCenabast: doc.name.split('.')[0],
              fecha: new Date().toLocaleString()
            }
          }));

          return {
            success: true,
            docCenabast: doc.name.split('.')[0],
            message: response.data.message || 'Documento subido exitosamente'
          };
        } catch (error) {
          console.error('Error al subir documento:', doc.name, 'ID:', doc.id, error);
          const errorMessage = error.response?.data?.message || 
                             error.response?.data?.error || 
                             error.message || 
                             'Error al subir documento';
          
          setUploadStatus(prev => ({
            ...prev,
            [doc.name]: { 
              success: false, 
              message: errorMessage,
              docCenabast: doc.name.split('.')[0],
              fecha: new Date().toLocaleString()
            }
          }));

          return {
            success: false,
            docCenabast: doc.name.split('.')[0],
            message: errorMessage
          };
        }
      });

      const results = await Promise.all(uploadPromises);
      console.log('Resultados de la subida:', results);

      // Solo limpiar la selección, mantener el módulo visible
      setDriveDocuments(prev => prev.map(doc => ({ ...doc, selected: false })));

    } catch (error) {
      console.error('Error general al subir documentos:', error);
      const errorMessage = error.response?.data?.message || 
                         error.response?.data?.error || 
                         error.message || 
                         'Error al subir documentos';
      setUploadError(errorMessage);
    } finally {
      setUploadingDoc(false);
    }
  };

  const downloadUploadSummary = () => {
    const data = Object.entries(uploadStatus).map(([fileName, status]) => ({
      'Documento': fileName,
      'Doc_Cenabast': status.docCenabast,
      'Estado': status.success ? 'Subido exitosamente' : 'Error',
      'Mensaje': status.message,
      'Fecha': status.fecha
    }));

    // Crear un nuevo libro de Excel
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    
    // Ajustar el ancho de las columnas
    const wscols = [
      {wch: 30}, // Documento
      {wch: 15}, // Doc_Cenabast
      {wch: 20}, // Estado
      {wch: 50}, // Mensaje
      {wch: 20}  // Fecha
    ];
    ws['!cols'] = wscols;

    // Agregar la hoja al libro
    XLSX.utils.book_append_sheet(wb, ws, "Resumen de Subidas");

    // Generar el archivo Excel
    XLSX.writeFile(wb, `resumen_subidas_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="App container-fluid mt-5 px-4" style={{ fontFamily: 'Poppins, sans-serif' }}>
      <div style={{
        position: 'fixed',
        top: '10px',
        right: '10px',
        backgroundColor: environment === 'DEV' ? '#0d6efd' : '#198754',
        color: 'white',
        padding: '5px 10px',
        borderRadius: '4px',
        fontWeight: 'bold',
        zIndex: 1000
      }}>
        {environment}
      </div>
      <h2 
        className="text-center mb-4" 
        style={{ 
          fontFamily: 'Montserrat, sans-serif',
          marginBottom: '2rem',
          fontWeight: '700',
          cursor: 'pointer'
        }}
        onClick={handleShowModal}
      >
        Informar Movimientos Cenabast
        <br/>
        <br/>
      </h2>
      
      <div className="row">
        {/* Columna 1: Informar Guía Despacho */}
        <div className="col-md-3">
          <div className="card h-100">
            <div className="card-header" style={{ backgroundColor: '#0d6efd', color: 'white', position: 'relative' }}>
              <h5 className="mb-0">
                Informar Guía Despacho
                <button 
                  type="button" 
                  className="btn btn-link position-absolute" 
                  style={{ 
                    top: '50%',
                    transform: 'translateY(-50%)',
                    right: '10px',
                    padding: '0',
                    color: 'white'
                  }}
                  data-bs-toggle="modal" 
                  data-bs-target="#infoModalGuia"
                >
                  <i className="bi bi-info-circle" style={{ fontSize: '1.2rem' }}></i>
                </button>
              </h5>
            </div>
            <div className="card-body">
              <div className="mb-3"
                onDrop={handleFileChange}
                onDragOver={handleDragOver}
                style={{ 
                  border: '2px dashed #ccc',
                  borderRadius: '4px',
                  padding: '41px',
                  textAlign: 'center',
                  fontSize: '0.9rem'
                }}
              >
                <input
                  type="file"
                  className="form-control form-control-sm"
                  onChange={handleFileChange}
                  accept=".xlsx,.xls"
                />
              <br></br>
                <small className="text-muted" style={{ fontSize: '0.8rem' }}>
                  Arrastra y suelta archivo Excel con Guias Despacho Bsale o haz clic para seleccionarlo desde tu PC
                </small>
              </div>
              <button
                className="btn btn-primary w-100"
                onClick={handleProcess}
                disabled={!file || processingGuia}
              >
                {processingGuia ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    Procesando...
                  </>
                ) : 'Informar Guias Despacho'}
              </button>
            </div>
          </div>
        </div>

        {/* Columna 2: Informar Entrega */}
        <div className="col-md-3">
          <div className="card h-100">
            <div className="card-header" style={{ backgroundColor: '#198754', color: 'white', position: 'relative' }}>
              <div className="d-flex justify-content-between align-items-center">
                <h5 className="mb-0">
                  Informar Entrega
                </h5>
                <div>
                  <button 
                    className="btn btn-warning btn-sm me-2"
                    data-bs-toggle="modal" 
                    data-bs-target="#rechazoModal"
                    style={{
                      padding: '0.25rem 0.5rem',
                      fontSize: '0.875rem',
                      visibility: 'visible',
                      display: 'inline-block'
                    }}
                  >
                    Rechazo
                    <button 
                      type="button" 
                      className="btn btn-link p-0 ms-2" 
                      style={{ 
                        padding: '0',
                        color: 'white'
                      }}
                      data-bs-toggle="modal" 
                      data-bs-target="#infoModalRechazo"
                    >
                      <i className="bi bi-info-circle" style={{ fontSize: '1rem' }}></i>
                    </button>
                  </button>
                  <button 
                    type="button" 
                    className="btn btn-link" 
                    style={{ 
                      padding: '0',
                      color: 'white'
                    }}
                    data-bs-toggle="modal" 
                    data-bs-target="#infoModalEntrega"
                  >
                    <i className="bi bi-info-circle" style={{ fontSize: '1.2rem' }}></i>
                  </button>
                </div>
              </div>
            </div>
            <div className="card-body">
              <div className="mb-3"
                onDrop={handleDeliveryFileChange}
                onDragOver={handleDragOver}
                style={{ 
                  border: '2px dashed #ccc',
                  borderRadius: '4px',
                  padding: '41px',
                  textAlign: 'center',
                  fontSize: '0.9rem'
                }}
              >
                <input
                  type="file"
                  className="form-control form-control-sm"
                  onChange={handleDeliveryFileChange}
                  accept=".xlsx,.xls"
                />
                <br></br>
                <small className="text-muted" style={{ fontSize: '0.8rem' }}>
                  Arrastra y suelta archivo Excel Informe Fechas Cenabast o haz clic para seleccionar desde tu PC
                </small>
              </div>
              <button
                className="btn btn-success w-100"
                onClick={handleDeliveryProcess}
                disabled={!deliveryFile || processingEntrega}
              >
                {processingEntrega ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    Procesando...
                  </>
                ) : 'Informar Entrega'}
              </button>
            </div>
          </div>
        </div>

        {/* Columna 3: Informar Factura */}
        <div className="col-md-3">
          <div className="card h-100">
            <div className="card-header" style={{ backgroundColor: '#dc3545', color: 'white', position: 'relative' }}>
              <h5 className="mb-0">
                Informar Factura
                <button 
                  type="button" 
                  className="btn btn-link position-absolute" 
                  style={{ 
                    top: '50%',
                    transform: 'translateY(-50%)',
                    right: '10px',
                    padding: '0',
                    color: 'white'
                  }}
                  data-bs-toggle="modal" 
                  data-bs-target="#infoModalFactura"
                >
                  <i className="bi bi-info-circle" style={{ fontSize: '1.2rem' }}></i>
                </button>
              </h5>
            </div>
            <div className="card-body">
              <div className="mb-3"
                onDrop={handleInvoiceFileChange}
                onDragOver={handleDragOver}
                style={{ 
                  border: '2px dashed #ccc',
                  borderRadius: '4px',
                  padding: '41px',
                  textAlign: 'center',
                  fontSize: '0.9rem'
                }}
              >
                <input
                  type="file"
                  className="form-control form-control-sm"
                  onChange={handleInvoiceFileChange}
                  accept=".xlsx,.xls"
                />
                <br></br>
                <small className="text-muted" style={{ fontSize: '0.8rem' }}>
                  Arrastra y suelta archivo Excel con Facturas Bsale o haz clic para seleccionar desde tu PC
                </small>
              </div>
              <button
                className="btn btn-danger w-100"
                onClick={handleProcessInvoice}
                disabled={!invoiceFile || processingFactura}
              >
                {processingFactura ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    Procesando...
                  </>
                ) : 'Informar Factura'}
              </button>
            </div>
          </div>
        </div>

        {/* Columna 4: Documentos Cedibles */}
        <div className="col-md-3">
          <div className="card h-100">
            <div className="card-header" style={{ backgroundColor: '#6c757d', color: 'white', position: 'relative' }}>
              <h5 className="mb-0">
                Documento Cedible
                <button 
                  type="button" 
                  className="btn btn-link position-absolute" 
                  style={{ 
                    top: '50%',
                    transform: 'translateY(-50%)',
                    right: '10px',
                    padding: '0',
                    color: 'white'
                  }}
                  data-bs-toggle="modal" 
                  data-bs-target="#infoModalCedible"
                >
                  <i className="bi bi-info-circle" style={{ fontSize: '1.2rem' }}></i>
                </button>
              </h5>
            </div>
            <div className="card-body">
              <div style={{ 
                  border: '2px dashed #ccc',
                  padding: '15px',
                  borderRadius: '5px',
                  marginBottom: '20px',
                  position: 'relative'
                }}>
                <div className="row align-items-center mb-3">
                  <div className="col-4">
                    <label className="col-form-label" style={{ 
                      fontSize: '0.9rem',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      Doc.Cenabast
                    </label>
                  </div>
                  <div className="col-8">
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      name="docCenabast"
                      value={cedibleForm.docCenabast}
                      onChange={handleCedibleFormChange}
                      placeholder="Nº documento"
                      style={{ 
                        height: '28px',
                        fontSize: '0.875rem',
                        padding: '0.25rem 0.5rem'
                      }}
                    />
                  </div>
                </div>

                <div className="row align-items-center mb-2">
                  <div className="col-12">
                    <input
                      type="file"
                      className="form-control form-control-sm"
                      accept=".pdf"
                      onChange={handleCedibleFileChange}
                      key={uploadingDoc ? 'uploading' : 'ready'}
                      placeholder="Seleccionar PDF cedible"
                      aria-label="Seleccionar PDF cedible"
                    />
                  </div>
                </div>
                
                <small className="text-muted" style={{ fontSize: '0.8rem' }}>
                  Arrastra y suelta archivo PDF con Guia de despacho firmada y Factura o haz clic para seleccionar desde tu PC
                </small>
              </div>

              <div className="d-grid gap-2">
                <button
                  className="btn btn-secondary w-100"
                  onClick={handleUploadCedible}
                  disabled={!cedibleForm.docCenabast || !cedibleForm.archivo || uploadingDoc}
                >
                  {uploadingDoc ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      Subiendo...
                    </>
                  ) : 'Subir Documentos'}
                </button>
                <button
                  className="btn btn-primary w-100"
                  onClick={() => {
                    setShowDriveSection(!showDriveSection);
                    if (!showDriveSection) {
                      fetchDriveDocuments();
                    }
                  }}
                >
                  <i className="bi bi-folder me-2"></i>
                  {showDriveSection ? 'Ocultar Carpeta' : 'Subir Carpeta'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Lista de documentos de Drive */}
      {showDriveSection && (
        <div className="row mt-4">
          <div className="col-12">
            <div className="card">
              <div className="card-header">
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <h5 className="mb-0">
                      {selectedFolder ? `Documentos en ${selectedFolder.name}` : 'Documentos disponibles en Drive'}
                    </h5>
                    {folderPath.length > 0 && (
                      <div className="mt-2">
                        <button 
                          className="btn btn-sm btn-link p-0"
                          onClick={handleFolderBack}
                        >
                          <i className="bi bi-arrow-left me-1"></i>
                          Volver
                        </button>
                        <span className="text-muted ms-2">
                          {folderPath.map((folder, index) => (
                            <span key={folder.id}>
                              {index > 0 && ' > '}
                              {folder.name}
                            </span>
                          ))}
                        </span>
                      </div>
                    )}
                  </div>
                  <div>
                    <button 
                      className="btn btn-sm btn-outline-primary me-2"
                      onClick={handleSelectAllInFolder}
                    >
                      <i className="bi bi-check-all me-1"></i>
                      Seleccionar todos
                    </button>
                    <button 
                      className="btn btn-sm btn-outline-secondary me-2"
                      onClick={() => fetchDriveDocuments(currentFolder)}
                      disabled={loadingDrive}
                    >
                      {loadingDrive ? (
                        <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                      ) : (
                        <i className="bi bi-arrow-clockwise me-1"></i>
                      )}
                      Actualizar
                    </button>
                    {Object.keys(uploadStatus).length > 0 && (
                      <button 
                        className="btn btn-sm btn-success"
                        onClick={downloadUploadSummary}
                      >
                        <i className="bi bi-file-excel me-1"></i>
                        Descargar Resumen
                      </button>
                    )}
                  </div>
                </div>
              </div>
              <div className="card-body">
                {uploadError && (
                  <div className="alert alert-danger mb-3">
                    {uploadError}
                  </div>
                )}
                
                {/* Navegación de carpetas */}
                <div className="mb-3">
                  <div className="d-flex flex-wrap gap-2">
                    {folderStructure.map((folder) => (
                      <button
                        key={folder.id}
                        className={`btn btn-sm ${selectedFolder?.id === folder.id ? 'btn-primary' : 'btn-outline-primary'}`}
                        onClick={() => handleFolderSelect(folder)}
                      >
                        <i className="bi bi-folder me-1"></i>
                        {folder.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="list-group">
                  {driveDocuments.map((doc, index) => (
                    <div 
                      key={index}
                      className={`list-group-item list-group-item-action ${doc.selected ? 'active' : ''}`}
                      onClick={() => {
                        setDriveDocuments(prev => prev.map((d, i) => 
                          i === index ? { ...d, selected: !d.selected } : d
                        ));
                      }}
                      style={{ cursor: 'pointer' }}
                    >
                      <div className="d-flex justify-content-between align-items-center">
                        <div className="form-check">
                          <input
                            className="form-check-input"
                            type="checkbox"
                            checked={doc.selected}
                            onChange={() => {
                              setDriveDocuments(prev => prev.map((d, i) => 
                                i === index ? { ...d, selected: !d.selected } : d
                              ));
                            }}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <label className="form-check-label">
                            {doc.name}
                          </label>
                        </div>
                        {uploadStatus[doc.name] && (
                          <span className={`badge ${uploadStatus[doc.name].success ? 'bg-success' : 'bg-danger'}`}>
                            {uploadStatus[doc.name].message}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                  {driveDocuments.length === 0 && !loadingDrive && (
                    <div className="list-group-item text-muted">
                      No hay documentos disponibles en esta carpeta
                    </div>
                  )}
                </div>
                <div className="mt-3">
                  <button
                    className="btn btn-primary"
                    onClick={handleUploadDriveDocument}
                    disabled={!driveDocuments.some(doc => doc.selected) || uploadingDoc}
                  >
                    {uploadingDoc ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                        Subiendo...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-upload me-2"></i>
                        Subir seleccionados
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabla de resultados */}
      <div className="row mt-4">
        <div className="col-12">
          {/* Mostrar encabezado y botón de descarga para documentos cedibles */}
          {(lastUploadedDoc || uploadError) && (
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h3 className="text-center mb-0" style={{ 
                fontFamily: 'Montserrat, sans-serif',
                fontWeight: '600'
              }}>
                Información subida
              </h3>
            </div>
          )}
          
          {uploadError && (
            <div className="alert alert-danger mb-3">
              Error al subir documento cedible: {uploadError}
            </div>
          )}
          {lastUploadedDoc && (
            <div className="alert alert-success mb-3">
              PDF con Factura y Guía de Despacho subido para Doc.Cenabast N°{lastUploadedDoc}
            </div>
          )}

          {/* Mostrar tabla y botón de descarga para otros módulos */}
          {activeTable === 'dispatches' && dispatches && dispatches.length > 0 && !lastUploadedDoc && !uploadError && (
            <>
              <div className="d-flex justify-content-between align-items-center mb-4">
                <h3 className="text-center mb-0" style={{ 
                  fontFamily: 'Montserrat, sans-serif',
                  fontWeight: '600'
                }}>
                  Información subida
                </h3>
                {downloadData && (
                  <button
                    className="btn btn-success"
                    onClick={() => downloadExcel(downloadData, downloadFileName)}
                  >
                    <i className="bi bi-download me-2"></i>
                    Descargar Excel
                  </button>
                )}
              </div>
              <div className="table-responsive">
                <table className="table table-striped">
                  <thead>
                    <tr>
                      {/* Columnas para Guías de Despacho */}
                      {!dispatches[0].Factura && !dispatches[0].Fecha_Entrega && (
                        <>
                          <th style={{ width: '15%' }}>Doc Cenabast</th>
                          <th style={{ width: '12%' }}>N° Guía</th>
                          <th style={{ width: '12%' }}>Fecha Guía</th>
                          <th style={{ width: '12%' }}>O_Trans</th>
                          <th style={{ width: '15%' }}>Artículo</th>
                          <th style={{ width: '12%' }}>Lote</th>
                          <th style={{ width: '12%' }}>Cantidad</th>
                          <th style={{ width: '22%' }}>Estado</th>
                        </>
                      )}
                      {/* Columnas para Entregas */}
                      {dispatches[0].Fecha_Entrega && (
                        <>
                          <th style={{ width: '25%' }}>Doc Cenabast</th>
                          <th style={{ width: '25%' }}>Fecha Entrega</th>
                          <th style={{ width: '50%' }}>Estado</th>
                        </>
                      )}
                      {/* Columnas para Facturas */}
                      {dispatches[0].Factura && (
                        <>
                          <th style={{ width: '15%' }}>Doc Cenabast</th>
                          <th style={{ width: '15%' }}>N° Factura</th>
                          <th style={{ width: '15%' }}>Fecha Emisión</th>
                          <th style={{ width: '15%' }}>N° Guía</th>
                          <th style={{ width: '15%' }}>Fecha Guía</th>
                          <th style={{ width: '25%' }}>Estado</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {dispatches.map((dispatch, index) => (
                      <tr key={index}>
                        {/* Filas para Guías de Despacho */}
                        {!dispatch.Factura && !dispatch.Fecha_Entrega && (
                          <>
                            <td>{dispatch.Doc_Cenabast}</td>
                            <td>{dispatch.Guia || '-'}</td>
                            <td>{dispatch.Fecha_Guia || '-'}</td>
                            <td>{dispatch.oTrans || '-'}</td>
                            <td>{dispatch.Articulo || '-'}</td>
                            <td>{dispatch.Lote || '-'}</td>
                            <td>{dispatch.Cantidad || '-'}</td>
                            <td>
                              <span className={`badge ${
                                dispatch.mensaje === 'Procesado exitosamente' 
                                  ? 'bg-success'
                                  : dispatch.mensaje.includes('no existe en el sistema')
                                    ? 'bg-danger'
                                    : 'bg-warning text-dark'
                              }`} style={{ 
                                whiteSpace: 'normal',
                                display: 'inline-block',
                                textAlign: 'left'
                              }}>
                                {dispatch.mensaje}
                              </span>
                            </td>
                          </>
                        )}
                        {/* Filas para Entregas */}
                        {dispatch.Fecha_Entrega && (
                          <>
                            <td>{dispatch.Doc_Cenabast}</td>
                            <td>{dispatch.Fecha_Entrega}</td>
                            <td>
                              <span className={`badge ${
                                dispatch.mensaje === 'Procesado exitosamente' 
                                  ? 'bg-success'
                                  : dispatch.mensaje.includes('no existe en el sistema')
                                    ? 'bg-danger'
                                    : 'bg-warning text-dark'
                              }`} style={{ 
                                whiteSpace: 'normal',
                                display: 'inline-block',
                                textAlign: 'left'
                              }}>
                                {dispatch.mensaje}
                              </span>
                            </td>
                          </>
                        )}
                        {/* Filas para Facturas */}
                        {dispatch.Factura && (
                          <>
                            <td>{dispatch.Doc_Cenabast}</td>
                            <td>{dispatch.Factura}</td>
                            <td>{dispatch.Fecha_Fac}</td>
                            <td>{dispatch.Guia || '-'}</td>
                            <td>{dispatch.Fecha_Guia || '-'}</td>
                            <td>
                              <span className={`badge ${
                                dispatch.mensaje === 'Procesado exitosamente' 
                                  ? 'bg-success'
                                  : dispatch.mensaje.includes('no existe en el sistema')
                                    ? 'bg-danger'
                                    : 'bg-warning text-dark'
                              }`} style={{ 
                                whiteSpace: 'normal',
                                display: 'inline-block',
                                textAlign: 'left'
                              }}>
                                {dispatch.mensaje}
                              </span>
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Modales */}
      <div className="modal fade" id="infoModalGuia" tabIndex="-1" aria-hidden="true" data-bs-backdrop="static" data-bs-keyboard="false">
        <div className="modal-dialog modal-lg modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header" style={{ backgroundColor: '#0d6efd', color: 'white' }}>
              <h5 className="modal-title">
                <i className="bi bi-info-circle me-2"></i>
                Informar Guía Despacho
              </h5>
              <button type="button" className="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div className="modal-body">
              <p>Sube el archivo Excel exportado desde Bsale con las guías de despacho. El sistema procesará la información y enviará el documento Cenabast, la Guía de Despacho, la fecha de la guia y el detalle de productos enviados como "Distribución" a sistema Cenabast</p>
              <hr/>
              <h6>Formato del archivo:</h6>
              <img 
                src="/formato-guia.jpg" 
                alt="Formato guía de despacho" 
                style={{ width: '100%', maxHeight: '60vh', objectFit: 'contain' }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="modal fade" id="infoModalEntrega" tabIndex="-1" aria-hidden="true" data-bs-backdrop="static" data-bs-keyboard="false">
        <div className="modal-dialog modal-lg modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header" style={{ backgroundColor: '#198754', color: 'white' }}>
              <h5 className="modal-title">
                <i className="bi bi-info-circle me-2"></i>
                Informar Entrega
              </h5>
              <button type="button" className="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div className="modal-body">
              <p>Para informar las entregas, subimos el archivo Excel "informe fechas recep.xls" de Cenabast donde aparecen las fechas de entrega para cada despacho. Esto actualizará los movimientos de la distribucion en el sistema Cenabast para los doc_Cenabast que ya hayan sido previamente ingresados. Sistema valida que no haya movimiento anterior del mismo tipo antes de actualizar la información en sistema Cenabast.</p>
              <hr/>
              <h6>Formato del archivo:</h6>
              <img 
                src="/formato-entrega.jpg" 
                alt="Formato informe de entrega" 
                style={{ width: '100%', maxHeight: '60vh', objectFit: 'contain' }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="modal fade" id="infoModalRechazo" tabIndex="-1" aria-hidden="true" data-bs-backdrop="static" data-bs-keyboard="false">
        <div className="modal-dialog modal-lg modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header" style={{ backgroundColor: '#ffc107', color: 'black' }}>
              <h5 className="modal-title">
                <i className="bi bi-info-circle me-2"></i>
                Informar Rechazo
              </h5>
              <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div className="modal-body">
              <p>En caso de existir algun rechazo, este se puede informar en con el boton de rechazo en la pantalla principal, indicando el Doc Cenabast y la fecha de rechazo. No se puede informar un rechazo para un documento que ya fue informado como entregado.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="modal fade" id="infoModalFactura" tabIndex="-1" aria-hidden="true" data-bs-backdrop="static" data-bs-keyboard="false">
        <div className="modal-dialog modal-lg modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header" style={{ backgroundColor: '#dc3545', color: 'white' }}>
              <h5 className="modal-title">
                <i className="bi bi-info-circle me-2"></i>
                Informar Factura
              </h5>
              <button type="button" className="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div className="modal-body">
              <p>Para informar las facturas, se sube archivo Excel de facturación de Bsale (filtrado por docs Cenabast) con la información de las facturas emitidas. El sistema vinculará las facturas con los documentos Cenabast del informe y agregara esta información a cada Distribución.</p>
              <p>Si subimos el excel nuevamente con otra factura para un mismo documento Cenabast, el sistema actualizará la información de la factura anterior. Esto solo sirve si se ingreso mal por error, pero <span style={{ color: 'red', textTransform: 'uppercase' }}>si se quiere cambiar la factura con una nota de crédito de por medio (refacturación), se debe contactar a Cenabast, para que ellos autoricen el cambio.</span></p>
              <hr/>
              <h6>Formato del archivo:</h6>
              <img 
                src="/formato-factura.jpg" 
                alt="Formato factura" 
                style={{ width: '100%', maxHeight: '60vh', objectFit: 'contain' }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="modal fade" id="infoModalCedible" tabIndex="-1" aria-hidden="true" data-bs-backdrop="static" data-bs-keyboard="false">
        <div className="modal-dialog modal-lg modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header" style={{ backgroundColor: '#6c757d', color: 'white' }}>
              <h5 className="modal-title">
                <i className="bi bi-info-circle me-2"></i>
                Documento Cedible
              </h5>
              <button type="button" className="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div className="modal-body">
              <p>Sube el PDF que contiene la guía de despacho firmada y la factura (Se pueden subir hasta 10 archivos). Este documento es necesario para completar el proceso.</p>
              <hr/>
              <h6>Formato del documento:</h6>
              <embed 
                src="/formato-cedible.pdf"
                type="application/pdf"
                style={{ 
                  width: '100%',
                  height: '60vh'
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Modal de información general */}
      <div className="modal fade" id="infoModalApp" tabIndex="-1" aria-hidden="true" data-bs-backdrop="static" data-bs-keyboard="false">
        <div className="modal-dialog modal-lg modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title" style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: '600' }}>
                ¿Para qué sirve esta aplicación?
              </h5>
              <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div className="modal-body">
              <div className="container">
                <div className="row mb-4">
                  <div className="col-12">
                    <h6 className="fw-bold text-primary">1. Informar Guía Despacho</h6>
                    <p>Sube el archivo Excel exportado desde Bsale con las guías de despacho. El sistema procesará la información y enviará el documento Cenabast, la Guía de Despacho, la fecha de la guia y el detalle de productos enviados como "Distribución" a sistema Cenabast</p>
                  </div>
                </div>
                <div className="row mb-4">
                  <div className="col-12">
                    <h6 className="fw-bold text-success">2. Informar Entrega</h6>
                    <p>Para informar las entregas, subimos el archivo Excel "informe fechas recep.xls" de Cenabast donde aparecen las fechas de entrega para cada despacho. Esto actualizará los movimientos de la distribucion en el sistema Cenabast para los doc_Cenabast que ya hayan sido previamente ingresados. Sistema valida que no haya movimiento anterior del mismo tipo antes de actualizar la información en sistema Cenabast. </p>
                  </div>
                </div>
                <div className="row mb-4">
                  <div className="col-12">
                    <h6 className="fw-bold text-warning">3. Informar Rechazo</h6>
                    <p>En caso de existir algun rechazo, este se puede informar en con el boton de rechazo en la pantalla principal, indicando el Doc Cenabast y la fecha de rechazo. No se puede informar un rechazo para un documento que ya fue informado como entregado.</p>
                  </div>
                </div>
                <div className="row mb-4">
                  <div className="col-12">
                    <h6 className="fw-bold text-danger">4. Informar Factura</h6>
                    <p>Para informar las facturas, se sube archivo Excel de facturación de Bsale (filtrado por docs Cenabast)con la información de las facturas emitidas. El sistema vinculará las facturas con los documentos Cenabast del informe y agregara esta información a cada Distribución. Si subimos el excel nuevamente con otra factura para un mismo documento Cenabast, el sistema actualizará la información de la factura anterior. Esto solo sirve si se ingreso mal por error, pero <span style={{ color: 'red', textTransform: 'uppercase' }}>si se quiere cambiar la factura con una nota de crédito de por medio (refacturación), se debe contactar a Cenabast, para que ellos autoricen el cambio.</span></p>
                  </div>
                </div>
                <div className="row mb-4">
                  <div className="col-12">
                    <h6 className="fw-bold text-secondary">5. Subir Documento Cedible</h6>
                    <p>Sube el PDF que contiene la guía de despacho firmada y la factura (Se pueden subir hasta 10 archivos). Este documento es necesario para completar el proceso.</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Rechazo */}
      <div 
        className="modal fade" 
        id="rechazoModal" 
        tabIndex="-1" 
        aria-labelledby="rechazoModalLabel" 
        aria-hidden="true"
        data-bs-backdrop="static"
        data-bs-keyboard="false"
      >
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title" id="rechazoModalLabel">Informar Rechazo</h5>
              <button 
                type="button" 
                className="btn-close" 
                data-bs-dismiss="modal"
                aria-label="Close"
                disabled={isProcessing}
              ></button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleRechazoSubmit}>
                <div className="mb-3">
                  <label className="form-label">Doc. Cenabast</label>
                  <input
                    type="number"
                    className="form-control"
                    value={rechazoForm.docCenabast}
                    onChange={(e) => setRechazoForm(prev => ({
                      ...prev,
                      docCenabast: e.target.value
                    }))}
                    required
                    disabled={isProcessing}
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Fecha de Rechazo</label>
                  <input
                    type="date"
                    className="form-control"
                    value={rechazoForm.fecha}
                    onChange={(e) => setRechazoForm(prev => ({
                      ...prev,
                      fecha: e.target.value
                    }))}
                    required
                    disabled={isProcessing}
                  />
                </div>
                <div className="d-grid gap-2">
                  <button 
                    type="submit" 
                    className="btn btn-warning"
                    disabled={isProcessing}
                  >
                    {isProcessing ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                        Procesando...
                      </>
                    ) : (
                      'Informar Rechazo'
                    )}
                  </button>
                  <button 
                    type="button" 
                    className="btn btn-secondary" 
                    data-bs-dismiss="modal"
                    disabled={isProcessing}
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}

export default App;