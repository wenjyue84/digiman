import { MCPToolResult } from '../types/mcp.js';

/**
 * Wraps data in the standard MCP success result format.
 */
export function createToolResult(data: unknown): MCPToolResult {
  return {
    content: [{
      type: 'text',
      text: JSON.stringify(data, null, 2)
    }]
  };
}

/**
 * Wraps an error in the standard MCP error result format.
 */
export function createErrorResult(errorPrefix: string, error: any): MCPToolResult {
  return {
    content: [{
      type: 'text',
      text: `${errorPrefix}: ${error.message}`
    }],
    isError: true
  };
}

/**
 * Wraps the common try/catch + callAPI + JSON.stringify pattern into a single call.
 * Use for simple handlers that fetch data and return it as-is.
 */
export async function handleToolCall<T>(
  apiCall: () => Promise<T>,
  errorPrefix: string
): Promise<MCPToolResult> {
  try {
    const data = await apiCall();
    return createToolResult(data);
  } catch (error: any) {
    return createErrorResult(errorPrefix, error);
  }
}
