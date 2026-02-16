import { callAPI } from '../lib/http-client.js';
import { MCPTool, MCPToolResult } from '../types/mcp.js';
import { handleToolCall } from './tool-factory.js';

export const capsuleTools: MCPTool[] = [
  {
    name: 'pelangi_list_capsules',
    description: 'List all capsules with status',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'pelangi_get_occupancy',
    description: 'Get current occupancy statistics',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'pelangi_check_availability',
    description: 'Get available capsules for assignment',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  }
];

export async function listCapsules(args: any): Promise<MCPToolResult> {
  return handleToolCall(() => callAPI('GET', '/api/capsules'), 'Error listing capsules');
}

export async function getOccupancy(args: any): Promise<MCPToolResult> {
  return handleToolCall(() => callAPI('GET', '/api/occupancy'), 'Error getting occupancy');
}

export async function checkAvailability(args: any): Promise<MCPToolResult> {
  return handleToolCall(() => callAPI('GET', '/api/capsules/available'), 'Error checking availability');
}
