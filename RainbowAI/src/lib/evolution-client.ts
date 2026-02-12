import axios, { AxiosInstance } from 'axios';

const EVOLUTION_API_URL = (process.env.EVOLUTION_API_URL || 'http://localhost:8080').replace(/\/+$/, '');
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || 'pelangi-evo-2026';
const EVOLUTION_INSTANCE_NAME = process.env.EVOLUTION_INSTANCE_NAME || 'Jay xox';

export const evolutionClient: AxiosInstance = axios.create({
  baseURL: EVOLUTION_API_URL,
  headers: {
    'apikey': EVOLUTION_API_KEY,
    'Content-Type': 'application/json'
  },
  timeout: 30000
});

export function getEvolutionBaseUrl(): string {
  return EVOLUTION_API_URL;
}

export function getInstanceName(): string {
  return EVOLUTION_INSTANCE_NAME;
}

export function getEncodedInstanceName(): string {
  return encodeURIComponent(EVOLUTION_INSTANCE_NAME);
}

/**
 * Format phone number to WhatsApp JID format (countrycode + number, no +/spaces/dashes).
 * Examples: "+60 12-708 8789" → "60127088789", "60103084289" → "60103084289"
 */
export function formatPhoneNumber(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  return digits;
}

export async function callEvolutionAPI<T>(
  method: string,
  path: string,
  data?: any
): Promise<T> {
  const fullUrl = `${EVOLUTION_API_URL}${path.startsWith('/') ? '' : '/'}${path}`;
  try {
    const response = await evolutionClient.request({
      method,
      url: path,
      data
    });
    return response.data;
  } catch (error: any) {
    const status = error.response?.status;
    const bodyMessage = error.response?.data?.message || error.response?.data?.error;
    const statusText = error.response?.statusText;
    const detail = status
      ? ` ${status} ${statusText || ''}`.trim()
      : ` ${error.message}`;
    const message = bodyMessage
      ? `Evolution API Error: ${bodyMessage} (${fullUrl}${detail ? ` → ${detail}` : ''})`
      : `Evolution API Error: ${fullUrl}${detail}. Check EVOLUTION_API_URL and that Evolution API is running.`;
    console.error(`Evolution API call failed: ${method} ${path}`, error.message);
    throw new Error(message);
  }
}
