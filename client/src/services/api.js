import axios from 'axios';

function normalizeApiBaseUrl(rawUrl) {
  const trimmed = String(rawUrl || '').trim();
  if (!trimmed) return '/api';
  const withoutTrailing = trimmed.replace(/\/+$/, '');
  if (withoutTrailing === '/api' || withoutTrailing.endsWith('/api')) {
    return withoutTrailing;
  }
  if (/^https?:\/\//i.test(withoutTrailing)) {
    return `${withoutTrailing}/api`;
  }
  return withoutTrailing;
}

const baseURL = normalizeApiBaseUrl(import.meta.env.VITE_API_URL);

export const api = axios.create({
  baseURL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('tradeflow_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (config.data instanceof FormData) {
    if (typeof config.headers.delete === 'function') {
      config.headers.delete('Content-Type');
    }
    delete config.headers['Content-Type'];
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (
      error.response?.status === 401 &&
      typeof window !== 'undefined' &&
      window.location.pathname !== '/login' &&
      window.location.pathname !== '/' &&
      window.location.pathname !== '/welcome'
    ) {
      localStorage.removeItem('tradeflow_token');
      localStorage.removeItem('tradeflow_user');
      window.dispatchEvent(new CustomEvent('bims:auth-expired'));
    }
    return Promise.reject(error);
  }
);

function showDownloadToast(message, isError = false) {
  if (typeof document === 'undefined') return;
  const existing = document.getElementById('bims-download-toast');
  if (existing) existing.remove();

  const el = document.createElement('div');
  el.id = 'bims-download-toast';
  el.textContent = message;
  Object.assign(el.style, {
    position: 'fixed',
    bottom: '24px',
    left: '24px',
    zIndex: '9999',
    padding: '10px 16px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '600',
    color: '#ffffff',
    backgroundColor: isError ? '#dc2626' : '#059669',
    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.35)',
    maxWidth: '360px',
  });
  document.body.appendChild(el);
  setTimeout(() => {
    el.remove();
  }, 4000);
}

async function parseBlobError(blob, fallbackMsg) {
  try {
    const text = await blob.text();
    const parsed = JSON.parse(text);
    if (parsed?.error) return parsed.error;
  } catch {
    // Non-JSON error body
  }
  return fallbackMsg;
}

export async function fetchApiBlobUrl(endpoint) {
  const cleanPath = endpoint.startsWith('/api/') ? endpoint.slice(4) : endpoint;
  const response = await api.get(cleanPath, { responseType: 'blob' });
  const contentType = String(response.headers?.['content-type'] || 'application/octet-stream');

  if (contentType.includes('text/html')) {
    throw new Error(
      'API server did not return a file. Ensure the backend server is running and VITE_API_URL is configured.'
    );
  }
  if (contentType.includes('application/json')) {
    const msg = await parseBlobError(response.data, 'Unable to load file');
    throw new Error(msg);
  }

  const blob = new Blob([response.data], { type: contentType });
  return {
    blobUrl: URL.createObjectURL(blob),
    contentType,
    disposition: response.headers?.['content-disposition'] || '',
  };
}

export async function downloadApiFile(
  endpoint,
  fallbackFilename = 'bims-document',
  { openInNewTab = false } = {}
) {
  try {
    const { blobUrl, contentType, disposition } = await fetchApiBlobUrl(endpoint);
    const match = disposition.match(/filename="?([^";]+)"?/i);
    const filename = match?.[1] || fallbackFilename;

    if (openInNewTab && contentType.includes('pdf')) {
      window.open(blobUrl, '_blank', 'noopener,noreferrer');
    } else {
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }

    showDownloadToast(`Downloaded ${filename}`);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
    return { ok: true, filename };
  } catch (err) {
    let message = err?.message || 'Unable to download file.';
    if (err?.response?.data instanceof Blob) {
      message = await parseBlobError(
        err.response.data,
        err.response?.status === 401
          ? 'Session expired. Please sign in again to download PDFs.'
          : message
      );
    } else if (err?.response?.data?.error) {
      message = err.response.data.error;
    }
    showDownloadToast(message, true);
    return { ok: false, error: message };
  }
}
