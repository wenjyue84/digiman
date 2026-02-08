import axios, { AxiosInstance } from 'axios';

// Prefer Zeabur internal host when set (service-to-service); else use public API URL
const internalHost = process.env.PELANGI_MANAGER_HOST;
const internalPort = process.env.PELANGI_MANAGER_PORT || '5000';
const rawApiUrl = internalHost
  ? `http://${internalHost.replace(/\/+$/, '')}:${internalPort}`
  : (process.env.PELANGI_API_URL || 'http://localhost:5000');
const API_URL = rawApiUrl.replace(/\/+$/, '');
const API_TOKEN = process.env.PELANGI_API_TOKEN;

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Authorization': API_TOKEN ? `Bearer ${API_TOKEN}` : undefined,
    'Content-Type': 'application/json'
  },
  timeout: 30000
});

export function getApiBaseUrl(): string {
  return API_URL;
}

export async function callAPI<T>(
  method: string,
  path: string,
  data?: any
): Promise<T> {
  const fullUrl = path.startsWith('http') ? path : `${API_URL}${path.startsWith('/') ? '' : '/'}${path}`;
  try {
    const response = await apiClient.request({
      method,
      url: path,
      data
    });
    return response.data;
  } catch (error: any) {
    const status = error.response?.status;
    const bodyMessage = error.response?.data?.message;
    const statusText = error.response?.statusText;
    const detail = status
      ? ` ${status} ${statusText || ''}`.trim()
      : ` ${error.message}`;
    const message = bodyMessage
      ? `API Error: ${bodyMessage} (${fullUrl}${detail ? ` → ${detail}` : ''})`
      : `API Error: ${fullUrl}${detail}. Check PELANGI_API_URL and that PelangiManager is deployed there.`;
    console.error(`API call failed: ${method} ${path}`, error.message);
    throw new Error(message);
  }
}
