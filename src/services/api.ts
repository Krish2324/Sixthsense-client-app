import { getSecureItem, clearAuthData } from './secureStorage';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://192.168.29.227:8000';
const TIMEOUT_MS = 25000; // 25s resilient network timeout (CLI-022)
const CACHE_TTL_MS = 30000; // 30s response cache (CLI-023)

interface CacheEntry {
  data: any;
  expiresAt: number;
}

const responseCache = new Map<string, CacheEntry>();

let _onUnauthorized: (() => void) | null = null;

// Register 401 auto-logout callback (CLI-019)
export function registerUnauthorizedHandler(handler: () => void) {
  _onUnauthorized = handler;
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const token = await getSecureItem('__6th_sense_client_token');
  const timestamp = Date.now().toString();
  const nonce = Math.random().toString(36).substring(2, 12);
  const signaturePayload = `6th_sense_sig_${timestamp}_${nonce}`;
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Timestamp': timestamp,
    'X-Client-Nonce': nonce,
    'X-Signature': signaturePayload,
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

async function fetchWithTimeout(url: string, options: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

function parseErrorMessage(err: any, status: number): string {
  if (!err) return `Request failed: ${status}`;
  if (typeof err === 'string') return err;
  if (typeof err.detail === 'string') return err.detail;
  if (Array.isArray(err.detail)) {
    return err.detail.map((d: any) => d.msg || (typeof d === 'string' ? d : JSON.stringify(d))).join(', ');
  }
  if (err.detail && typeof err.detail === 'object') {
    return err.detail.msg || JSON.stringify(err.detail);
  }
  if (typeof err.message === 'string') return err.message;
  return `Request failed: ${status}`;
}

// Core API client with Bearer injection, timeout, cache, and 401 handling (CLI-022, CLI-023)
export const apiClient = {
  async get<T = any>(path: string, useCache = true): Promise<T> {
    const url = `${BACKEND_URL}${path}`;

    // Check cache first
    if (useCache) {
      const cached = responseCache.get(url);
      if (cached && cached.expiresAt > Date.now()) {
        return cached.data as T;
      }
    }

    const headers = await getAuthHeaders();
    const response = await fetchWithTimeout(url, { method: 'GET', headers });

    if (response.status === 401) {
      await clearAuthData();
      _onUnauthorized?.();
      throw new Error('Session expired. Please login again.');
    }

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(parseErrorMessage(err, response.status));
    }

    const data = await response.json();

    // Cache successful GET responses
    if (useCache) {
      responseCache.set(url, { data, expiresAt: Date.now() + CACHE_TTL_MS });
    }

    return data as T;
  },

  async post<T = any>(path: string, body: any): Promise<T> {
    const url = `${BACKEND_URL}${path}`;
    const headers = await getAuthHeaders();
    const response = await fetchWithTimeout(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (response.status === 401) {
      await clearAuthData();
      _onUnauthorized?.();
      throw new Error('Session expired. Please login again.');
    }

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(parseErrorMessage(err, response.status));
    }

    return response.json() as Promise<T>;
  },

  async put<T = any>(path: string, body: any): Promise<T> {
    const url = `${BACKEND_URL}${path}`;
    const headers = await getAuthHeaders();
    const response = await fetchWithTimeout(url, {
      method: 'PUT',
      headers,
      body: JSON.stringify(body),
    });

    if (response.status === 401) {
      await clearAuthData();
      _onUnauthorized?.();
      throw new Error('Session expired. Please login again.');
    }

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(parseErrorMessage(err, response.status));
    }

    return response.json() as Promise<T>;
  },

  async delete<T = any>(path: string): Promise<T> {
    const url = `${BACKEND_URL}${path}`;
    const headers = await getAuthHeaders();
    const response = await fetchWithTimeout(url, { method: 'DELETE', headers });

    if (response.status === 401) {
      await clearAuthData();
      _onUnauthorized?.();
      throw new Error('Session expired. Please login again.');
    }

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(parseErrorMessage(err, response.status));
    }

    return response.json() as Promise<T>;
  },

  clearCache() {
    responseCache.clear();
  },
};
