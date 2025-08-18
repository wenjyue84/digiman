// Simple API request utility for server-side testing
// This is a basic implementation since we're mainly testing the storage layer directly

export async function apiRequest(method: string, url: string, data?: any) {
  // For server-side tests, we primarily use storage layer directly
  // This is a placeholder for future server-to-server API testing
  return {
    json: () => Promise.resolve(data),
    ok: true,
    status: 200
  };
}