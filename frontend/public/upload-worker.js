// Upload Service Worker - handles background file uploads
const CACHE_NAME = 'upload-cache-v1';
const DB_NAME = 'upload-db';
const DB_VERSION = 1;
const STORE_NAME = 'pending-uploads';

// Open IndexedDB
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
}

// Store upload in IndexedDB
async function storeUpload(uploadData) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.put(uploadData);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// Get upload from IndexedDB
async function getUpload(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(id);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Get all pending uploads
async function getAllUploads() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Delete upload from IndexedDB
async function deleteUpload(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// Update upload status
async function updateUploadStatus(id, updates) {
  const upload = await getUpload(id);
  if (upload) {
    await storeUpload({ ...upload, ...updates });
  }
}

// Upload file with progress tracking
async function uploadFile(uploadData) {
  const { id, file, apiUrl, token, uploadedBytes = 0 } = uploadData;
  
  try {
    // Update status to uploading
    await updateUploadStatus(id, { status: 'uploading', uploadedBytes });
    
    // Create form data
    const formData = new FormData();
    formData.append('file', file);
    
    // Perform the upload
    const response = await fetch(`${apiUrl}/api/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });
    
    if (response.ok) {
      const data = await response.json();
      await updateUploadStatus(id, { 
        status: 'success', 
        url: data.url,
        percent: 100,
        uploadedBytes: uploadData.totalBytes
      });
      
      // Notify clients
      self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({
            type: 'UPLOAD_COMPLETE',
            id,
            url: data.url,
            filename: uploadData.filename
          });
        });
      });
      
      // Clean up after short delay
      setTimeout(() => deleteUpload(id), 60000);
      
      return { success: true, url: data.url };
    } else {
      const error = await response.text();
      await updateUploadStatus(id, { status: 'error', error });
      return { success: false, error };
    }
  } catch (error) {
    await updateUploadStatus(id, { status: 'error', error: error.message });
    return { success: false, error: error.message };
  }
}

// Handle messages from main thread
self.addEventListener('message', async (event) => {
  const { type, data } = event.data;
  
  switch (type) {
    case 'START_UPLOAD':
      // Store file and metadata in IndexedDB
      await storeUpload({
        id: data.id,
        filename: data.filename,
        file: data.file,
        totalBytes: data.totalBytes,
        uploadedBytes: 0,
        percent: 0,
        status: 'pending',
        apiUrl: data.apiUrl,
        token: data.token,
        timestamp: Date.now()
      });
      
      // Start upload
      uploadFile(data);
      break;
      
    case 'PAUSE_UPLOAD':
      await updateUploadStatus(data.id, { status: 'paused' });
      break;
      
    case 'RESUME_UPLOAD':
      const upload = await getUpload(data.id);
      if (upload && upload.status === 'paused') {
        uploadFile(upload);
      }
      break;
      
    case 'CANCEL_UPLOAD':
      await updateUploadStatus(data.id, { status: 'cancelled' });
      await deleteUpload(data.id);
      break;
      
    case 'GET_PENDING_UPLOADS':
      const uploads = await getAllUploads();
      event.source.postMessage({
        type: 'PENDING_UPLOADS',
        uploads: uploads.map(u => ({
          id: u.id,
          filename: u.filename,
          totalBytes: u.totalBytes,
          uploadedBytes: u.uploadedBytes,
          percent: u.percent,
          status: u.status,
          error: u.error,
          url: u.url,
          timestamp: u.timestamp
        }))
      });
      break;
      
    case 'DISMISS_UPLOAD':
      await deleteUpload(data.id);
      break;
  }
});

// On activation, resume any pending uploads
self.addEventListener('activate', async (event) => {
  event.waitUntil(
    (async () => {
      const uploads = await getAllUploads();
      for (const upload of uploads) {
        if (upload.status === 'uploading' || upload.status === 'pending') {
          // Mark as interrupted - file data is lost on page close
          await updateUploadStatus(upload.id, { status: 'interrupted' });
        }
      }
    })()
  );
});

self.addEventListener('install', (event) => {
  self.skipWaiting();
});
