import axios, { AxiosInstance } from 'axios';
import http from 'node:http';
import https from 'node:https';

// Keep-alive agents reuse TCP connections, avoiding handshake overhead per request
const httpAgent = new http.Agent({ keepAlive: true, maxSockets: 20 });
const httpsAgent = new https.Agent({ keepAlive: true, maxSockets: 20 });

// MCP tools on port 5000 call the same server's API routes (self-call).
// This is a mechanical copy from RainbowAI — a future refactor can replace
// these HTTP self-calls with direct storage.* calls.
const API_URL = 'http://localhost:5000';

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 30000,
  httpAgent,
  httpsAgent
});

export async function callAPI<T>(
  method: string,
  path: string,
  data?: any
): Promise<T> {
  const fullUrl = `${API_URL}${path.startsWith('/') ? '' : '/'}${path}`;
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
      : `API Error: ${fullUrl}${detail}`;
    console.error(`MCP API call failed: ${method} ${path}`, error.message);
    throw new Error(message);
  }
}
