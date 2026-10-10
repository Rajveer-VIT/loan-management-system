import axios, { AxiosError } from 'axios';
import { getStoredToken, removeStoredToken } from './auth';
import { ApiResponse, FieldError } from '../types';

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = getStoredToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// A 401 on any authenticated call means the session is gone (expired, revoked, or the
// account was deactivated): clear it and send the user to log in again.
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const isLoginCall = error.config?.url?.startsWith('/auth/login');
    if (error.response?.status === 401 && !isLoginCall && typeof window !== 'undefined') {
      removeStoredToken();
      if (!window.location.pathname.startsWith('/login')) {
        const next = encodeURIComponent(window.location.pathname);
        window.location.href = `/login?next=${next}`;
      }
    }
    return Promise.reject(error);
  }
);

export interface ApiErrorInfo {
  status?: number;
  code?: string;
  message: string;
  errors: FieldError[];
}

/** Normalises any thrown value from an API call into a displayable error. */
export function getApiError(error: unknown, fallback = 'Something went wrong. Please try again.'): ApiErrorInfo {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as ApiResponse | undefined;
    if (!error.response) {
      return { message: 'Cannot reach the server. Check your connection and that the API is running.', errors: [] };
    }
    return {
      status: error.response.status,
      code: data?.code,
      message: data?.message || fallback,
      errors: data?.errors ?? [],
    };
  }
  return { message: fallback, errors: [] };
}

/** Fetches a protected file (salary slip) with the auth header and opens it in a new tab. */
export async function openProtectedFile(path: string): Promise<void> {
  // Open the tab synchronously (inside the click handler) so pop-up blockers allow it.
  const tab = window.open('', '_blank');
  try {
    const res = await api.get<Blob>(path, { responseType: 'blob' });
    const url = URL.createObjectURL(res.data);
    if (tab) tab.location.href = url;
    else window.location.assign(url);
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  } catch (error) {
    tab?.close();
    throw error;
  }
}
