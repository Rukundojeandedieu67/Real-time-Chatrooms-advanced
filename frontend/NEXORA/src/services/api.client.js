const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

const ACCESS_KEY = 'nexora_access_token';
const REFRESH_KEY = 'nexora_refresh_token';
const EMAIL_KEY = 'nexora_email';

export class ApiError extends Error {
  constructor(message, { status, code, details } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details || {};
  }
}

export function getAccessToken() {
  return localStorage.getItem(ACCESS_KEY);
}

export function storedEmail() {
  return localStorage.getItem(EMAIL_KEY) || '';
}

export function saveSession({ access_token, refresh_token, email } = {}) {
  if (access_token) localStorage.setItem(ACCESS_KEY, access_token);
  if (refresh_token) localStorage.setItem(REFRESH_KEY, refresh_token);
  if (email) localStorage.setItem(EMAIL_KEY, email);
}

export function clearSession() {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(EMAIL_KEY);
}

function errorFromBody(data, status) {
  const error = data?.error || {};
  const details = error.details && typeof error.details === 'object' ? error.details : {};
  const fieldText = Object.values(details)
    .flat()
    .filter((item) => typeof item === 'string')
    .join(' ');
  return new ApiError(fieldText || error.message || 'Request failed', {
    status,
    code: error.code,
    details,
  });
}

let refreshPromise = null;

async function refreshAccess() {
  const refreshToken = localStorage.getItem(REFRESH_KEY);
  if (!refreshToken) {
    clearSession();
    throw new ApiError('Session expired', { status: 401, code: 'invalid_token' });
  }
  const response = await fetch(`${API_BASE}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.access_token) {
    clearSession();
    throw errorFromBody(data, response.status);
  }
  saveSession(data);
  return data.access_token;
}

export async function apiClient(path, { method = 'GET', body, form, auth = true, retry = true } = {}) {
  const headers = {};
  if (auth) {
    const token = getAccessToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let payload;
  if (form) {
    payload = form;
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }

  const response = await fetch(`${API_BASE}${path}`, { method, headers, body: payload });

  if (response.status === 401 && auth && retry && localStorage.getItem(REFRESH_KEY)) {
    if (!refreshPromise) {
      refreshPromise = refreshAccess().finally(() => {
        refreshPromise = null;
      });
    }
    await refreshPromise;
    return apiClient(path, { method, body, form, auth, retry: false });
  }

  if (response.status === 204) return null;

  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw errorFromBody(data, response.status);
  return data;
}

export async function fetchPages(path) {
  const separator = path.includes('?') ? '&' : '?';
  const data = await apiClient(`${path}${separator}page_size=100`);
  return data.results || [];
}
