/**
 * Helper function for fetching from MCP server
 */
export async function mcpFetch(
  endpoint: string,
  options?: RequestInit
): Promise<any> {
  const url = `http://localhost:3001/api/rainbow${endpoint}`;

  const response = await fetch(url, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Request failed" }));
    throw new Error(error.error || error.message || `Request failed with status ${response.status}`);
  }

  return response.json();
}
