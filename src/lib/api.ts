export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4001';

// Get auth token from localStorage
function getAuthToken(): string | null {
  return localStorage.getItem('auth_token');
}

// Set auth token in localStorage
export function setAuthToken(token: string): void {
  localStorage.setItem('auth_token', token);
}

// Remove auth token from localStorage
export function removeAuthToken(): void {
  localStorage.removeItem('auth_token');
}

// Get headers with auth token
function getHeaders(): HeadersInit {
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  const token = getAuthToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, { 
    credentials: 'include',
    headers: getHeaders()
  });
  if (!res.ok) {
    let errorMessage = 'Request failed';
    try {
      const errorData = await res.json();
      errorMessage = errorData.error || errorData.message || errorMessage;
    } catch {
      errorMessage = `Request failed with status ${res.status}`;
    }
    throw new Error(errorMessage);
  }
  return res.json();
}

export async function apiPost<T>(path: string, body: any): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: getHeaders(),
    credentials: 'include',
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    let errorMessage = 'Request failed';
    try {
      const errorData = await res.json();
      errorMessage = errorData.error || errorData.message || errorMessage;
    } catch {
      errorMessage = `Request failed with status ${res.status}`;
    }
    throw new Error(errorMessage);
  }
  return res.json();
}

export async function apiPatch<T>(path: string, body: any): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: 'PATCH',
    headers: getHeaders(),
    credentials: 'include',
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    let errorMessage = 'Request failed';
    try {
      const errorData = await res.json();
      errorMessage = errorData.error || errorData.message || errorMessage;
    } catch {
      errorMessage = `Request failed with status ${res.status}`;
    }
    throw new Error(errorMessage);
  }
  return res.json();
}

export async function apiPut<T>(path: string, body: any): Promise<T> {
  const headers = getHeaders();
  console.log('[API PUT]', path);
  console.log('[API PUT] Auth token present:', !!headers['Authorization']);

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: 'PUT',
    headers,
    credentials: 'include',
    body: JSON.stringify(body),
  });

  console.log('[API PUT] Response status:', res.status, res.statusText);
  console.log('[API PUT] Response headers:', Object.fromEntries(res.headers.entries()));

  if (!res.ok) {
    let errorMessage = 'Request failed';
    const responseText = await res.text();
    console.log('[API PUT] Raw response text:', responseText);

    try {
      const errorData = JSON.parse(responseText);
      console.log('[API PUT] Parsed error response:', errorData);
      errorMessage = errorData.error || errorData.message || errorMessage;
    } catch (e) {
      console.error('[API PUT] Failed to parse error response as JSON:', e);
      console.error('[API PUT] Response was:', responseText);
      errorMessage = responseText || `Request failed with status ${res.status}`;
    }
    throw new Error(errorMessage);
  }

  const data = await res.json();
  console.log('[API PUT] Success:', data);
  return data;
}

export async function apiDelete<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: 'DELETE',
    headers: getHeaders(),
    credentials: 'include',
  });
  if (!res.ok) {
    let errorMessage = 'Request failed';
    try {
      const errorData = await res.json();
      errorMessage = errorData.error || errorData.message || errorMessage;
    } catch {
      errorMessage = `Request failed with status ${res.status}`;
    }
    throw new Error(errorMessage);
  }
  return res.json();
}
