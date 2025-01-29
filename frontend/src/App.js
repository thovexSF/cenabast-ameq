import React, { useState } from 'react';
import axios from 'axios';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import { Modal } from 'bootstrap';

const API_URL = process.env.RAILWAY_ENVIRONMENT === 'development'
    ? `https://cenabast-ameq-development.up.railway.app/api`
    : `/api`;

function App() {
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

  const handleProcess = async () => {
    if (!file) {
      alert('Por favor, sube un archivo primero.');
      return;
    }

    setProcessingGuia(true);
    // Limpiar mensajes anteriores
    setLastUploadedDoc(null);
    setUploadError(null);
    
    const formData = new FormData();
    formData.append('file', file);

    

    try {
      const response = await axios.post(`${API_URL}/uploadGuiaDespacho`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (response.data?.despachos) {
        // Primero, vamos a imprimir los datos que recibimos para debug
        console.log('Datos recibidos:', response.data.despachos[0]);

        const despachosConMensajes = response.data.despachos
          .map(despacho => {
            // Creamos un nuevo objeto solo con las propiedades que queremos
            const despachoLimpio = {
              Doc_Cenabast: despacho.Doc_Cenabast || '',
              Guia: despacho.Guia || '',
              Fecha_Guia: despacho.Fecha_Gui || '',
              Articulo: despacho.Articulo || despacho.Detalles?.[0]?.Articulo || '',
              Lote: despacho.Lote || despacho.Detalles?.[0]?.Lote || '',
              Cantidad: despacho.Cantidad || despacho.Detalles?.[0]?.Cantidad || '',
              mensaje: despacho.mensaje || 'El Doc_Cenabast ya existe'
            };
            
            // Imprimimos el objeto limpio para debug
            console.log('Objeto limpio:', despachoLimpio);
            
            return despachoLimpio;
          })
          .sort((a, b) => {
            const getPrioridad = (mensaje) => {
              if (mensaje === 'Procesado exitosamente') return 1;
              if (mensaje.includes('Ya existe un movimiento')) return 2;
              return 3;
            };
            return getPrioridad(a.mensaje) - getPrioridad(b.mensaje);
          });

        setDispatches(despachosConMensajes);
        setActiveTable('dispatches');
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
    // Limpiar mensajes anteriores
    setLastUploadedDoc(null);
    setUploadError(null);
    
    const formData = new FormData();
    formData.append('file', deliveryFile);

    try {
        const response = await axios.post(`${API_URL}/uploadEntrega`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });

        if (response.data?.despachos) {
            setDispatches(response.data.despachos);
            setActiveTable('dispatches');
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
    // Limpiar mensajes anteriores
    setLastUploadedDoc(null);
    setUploadError(null);
    
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
            }).map(despacho => ({
                ...despacho,
                Doc_Cenabast: despacho.Doc_Cenabast,
                Factura: despacho.Folio || despacho.Factura,
                Fecha_Fac: despacho.Fecha_Emision || despacho.Fecha_Fac,
                Guia: despacho.Guia || despacho.N_Guia,
                Fecha_Guia: despacho.Fecha_Guia || despacho.Fecha_Gui,
                mensaje: despacho.mensaje
            }));

            setDispatches(despachosOrdenados);
            setActiveTable('dispatches');
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

  //Subir Documentos Cedibles
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
    // Limpiar la tabla anterior
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
    const modal = new Modal(document.getElementById('infoModalApp'));
    modal.show();
  };

  // Agregar la función cleanupModal
  const cleanupModal = () => {
    // Remover todos los backdrops
    document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
      backdrop.remove();
    });
    
    // Limpiar clases y estilos del body
    document.body.classList.remove('modal-open');
    document.body.removeAttribute('style');
    
    // Asegurarse que el modal esté cerrado y limpio
    const modalElement = document.getElementById('rechazoModal');
    if (modalElement) {
      modalElement.classList.remove('show');
      modalElement.style.display = 'none';
      modalElement.setAttribute('aria-hidden', 'true');
    }
  };

  const handleRechazoSubmit = async (e) => {
    e.preventDefault();
    setIsProcessing(true);
    
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
        
        // Limpiar el formulario y modal
        setRechazoForm({
          docCenabast: '',
          fecha: ''
        });
        cleanupModal();
      }

    } catch (error) {
      console.error('Error al informar rechazo:', error);
      
      // Para errores 500, mostrar el mensaje completo del error
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

  return (
    <div className="App container-fluid mt-5 px-4" style={{ fontFamily: 'Poppins, sans-serif' }}>
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
                    style={{  // Agregamos estilos explícitos
                      padding: '0.25rem 0.5rem',
                      fontSize: '0.875rem',
                      visibility: 'visible',  // Forzamos la visibilidad
                      display: 'inline-block' // Aseguramos que se muestre como bloque en línea
                    }}
                  >
                    Rechazo
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
            <div className="card-body" >
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
            </div>
          </div>
        </div>
      </div>

      {/* Tabla de resultados */}
      <div className="row mt-4">
        <div className="col-12">
          {(activeTable === 'dispatches' && dispatches && dispatches.length > 0) || 
           lastUploadedDoc || 
           uploadError ? (
            <h3 className="text-center mb-4" style={{ 
              fontFamily: 'Montserrat, sans-serif',
              fontWeight: '600'
            }}>
              Información subida
            </h3>
          ) : null}
          
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
          {activeTable === 'dispatches' && dispatches && dispatches.length > 0 && (
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
          )}
        </div>
      </div>

      {/* Modales */}
      <div className="modal" id="infoModalGuia" tabIndex="-1">
        <div className="modal-dialog modal-fullscreen-xl-down modal-dialog-centered" style={{ maxWidth: '90vw', margin: '20px auto' }}>
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">Formato Informe Guías de Despacho Bsale</h5>
              <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div className="modal-body">
              <img 
                src="/formato-guia.jpg" 
                alt="Formato guía de despacho" 
                style={{ width: '100%', height: '85vh', objectFit: 'contain' }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="modal" id="infoModalEntrega" tabIndex="-1">
        <div className="modal-dialog modal-fullscreen-xl-down modal-dialog-centered" style={{ maxWidth: '90vw', margin: '20px auto' }}>
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">Formato Informe de Entrega Bsale</h5>
              <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div className="modal-body">
              <img 
                src="/formato-entrega.jpg" 
                alt="Formato informe de entrega" 
                style={{ width: '100%', height: '85vh', objectFit: 'contain' }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="modal" id="infoModalFactura" tabIndex="-1">
        <div className="modal-dialog modal-fullscreen-xl-down modal-dialog-centered" style={{ maxWidth: '90vw', margin: '20px auto' }}>
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">Formato Informe Facturas</h5>
              <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div className="modal-body">
              <img 
                src="/formato-factura.jpg" 
                alt="Formato factura" 
                style={{ width: '100%', height: '85vh', objectFit: 'contain' }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="modal" id="infoModalCedible" tabIndex="-1">
        <div className="modal-dialog modal-fullscreen-xl-down modal-dialog-centered" style={{ maxWidth: '90vw', margin: '20px auto' }}>
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">Formato Documento Cedible</h5>
              <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div className="modal-body">
              <embed 
                src="/formato-cedible.pdf"
                type="application/pdf"
                style={{ 
                  width: '100%', 
                  height: '85vh'
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Modal de información general */}
      <div className="modal" id="infoModalApp" tabIndex="-1">
        <div className="modal-dialog modal-lg modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title" style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: '600' }}>
            ¿Cómo usar esta aplicación?
          </h5>
              <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div className="modal-body">
              <div className="container">
                <div className="row mb-4">
                  <div className="col-12">
                    <h6 className="fw-bold text-primary">1. Informar Guía Despacho</h6>
                    <p>Sube el archivo Excel exportado desde Bsale con las guías de despacho. El sistema procesará la información y la enviará a sistema Cenabast</p>
                  </div>
                </div>
                <div className="row mb-4">
                  <div className="col-12">
                    <h6 className="fw-bold text-success">2. Informar Entrega</h6>
                    <p>Para informar las entregas, subimos el archivo Excel "informe fechas recep.xls" de Cenabast donde aparecen las fechas de entrega para cada despacho. Esto actualizará para los documentos Cenabast que ahi se encuentren, la fecha de entrega. Para ingresar un </p>
                  </div>
                </div>
                <div className="row mb-4">
                  <div className="col-12">
                    <h6 className="fw-bold text-danger">3. Informar Factura</h6>
                    <p>Finalmente, sube el archivo Excel con la información de las facturas emitidas. El sistema vinculará las facturas con las guías correspondientes.</p>
                  </div>
                </div>
                <div className="row">
                  <div className="col-12">
                    <h6 className="fw-bold text-secondary">4. Documento Cedible</h6>
                    <p>Sube el PDF que contiene la guía de despacho firmada y la factura. Este documento es necesario para completar el proceso.</p>
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
        style={{ display: 'none' }} // Aseguramos que inicialmente esté oculto
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