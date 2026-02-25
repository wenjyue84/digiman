import { callAPI } from '../http-client';
import { MCPTool, MCPToolResult } from '../types';
import { handleToolCall } from '../tool-factory';

export const unitTools: MCPTool[] = [
  {
    name: 'pelangi_list_units',
    description: 'List all units with status',
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
    description: 'Get available units for assignment',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  }
];

export async function listUnits(args: any): Promise<MCPToolResult> {
  return handleToolCall(() => callAPI('GET', '/api/units'), 'Error listing units');
}

export async function getOccupancy(args: any): Promise<MCPToolResult> {
  return handleToolCall(() => callAPI('GET', '/api/occupancy'), 'Error getting occupancy');
}

export async function checkAvailability(args: any): Promise<MCPToolResult> {
  return handleToolCall(() => callAPI('GET', '/api/units/available'), 'Error checking availability');
}
