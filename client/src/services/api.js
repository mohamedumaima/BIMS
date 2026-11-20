import axios from 'axios';

const baseURL = import.meta.env.VITE_API_URL || '/api';

export const api = axios.create({
  baseURL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('tradeflow_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && window.location.pathname !== '/login') {
      localStorage.removeItem('tradeflow_token');
      localStorage.removeItem('tradeflow_user');
    }
    return Promise.reject(error);
  }
);

export async function downloadApiFile(endpoint, fallbackFilename = 'bims-document') {
  try {
    const cleanPath = endpoint.startsWith('/api/') ? endpoint.slice(4) : endpoint;
    const response = await api.get(cleanPath, { responseType: 'blob' });
    const contentType = response.headers?.['content-type'] || 'application/octet-stream';
    const disposition = response.headers?.['content-disposition'] || '';
    const match = disposition.match(/filename="?([^";]+)"?/i);
    const filename = match?.[1] || fallbackFilename;

    const blob = new Blob([response.data], { type: contentType });
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
  } catch {
    // Fallback if blob download fails
  }
}
