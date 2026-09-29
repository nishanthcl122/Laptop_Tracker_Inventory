import axios from 'axios';

const client = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

export const api = {
  // Dashboard
  getDashboardSummary: () => client.get('/dashboard/summary').then(res => res.data),
  getRasIdleEmployees: (params) => client.get('/dashboard/ras-idle-employees', { params }).then(res => res.data),
  getLaptopsByLocation: (location) => client.get('/dashboard/laptops-by-location', { params: { location } }).then(res => res.data),

  // Laptops
  getLaptops: (params) => client.get('/laptops', { params }).then(res => res.data),
  getLaptop: (serial) => client.get(`/laptops/${encodeURIComponent(serial)}`).then(res => res.data),
  getLaptopAudit: (serial) => client.get(`/laptops/${encodeURIComponent(serial)}/audit`).then(res => res.data),
  updateLaptop: (serial, payload) => client.put(`/laptops/${encodeURIComponent(serial)}`, payload).then(res => res.data),
  exportLaptopsUrl: (params) => {
    const query = new URLSearchParams();
    Object.entries(params || {}).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        query.append(key, val);
      }
    });
    return `/api/laptops/export?${query.toString()}`;
  },

  // Import & Reconciliation
  previewImport: (formData) => client.post('/import/preview', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }).then(res => res.data),
  confirmImport: (batchId) => client.post('/import/confirm', { batchId }).then(res => res.data),
  getBatches: () => client.get('/import/batches').then(res => res.data),
  getBatchDetails: (batchId) => client.get(`/import/batches/${batchId}`).then(res => res.data),

  // RAS Ingestion & Reconciliation
  previewRas: (formData) => client.post('/ras/preview', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }).then(res => res.data),
  confirmRas: (batchId) => client.post('/ras/confirm', { batchId }).then(res => res.data),
  getCurrentRas: (params) => client.get('/ras/current', { params }).then(res => res.data),
  getRasRecord: (sapId) => client.get(`/ras/records/${encodeURIComponent(sapId)}`).then(res => res.data)
};
