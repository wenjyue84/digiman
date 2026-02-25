import { callAPI } from '../http-client';
import { MCPTool, MCPToolResult } from '../types';

export const unitWriteTools: MCPTool[] = [
  {
    name: 'pelangi_mark_cleaned',
    description: 'Mark a unit as cleaned',
    inputSchema: {
      type: 'object',
      properties: {
        unitNumber: { type: 'number', description: 'Unit number' }
      },
      required: ['unitNumber']
    }
  },
  {
    name: 'pelangi_bulk_mark_cleaned',
    description: 'Mark all units as cleaned',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  }
];

export async function markCleaned(args: any): Promise<MCPToolResult> {
  try {
    const result = await callAPI('POST', `/api/units/${args.unitNumber}/mark-cleaned`, {});
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          unitNumber: args.unitNumber,
          message: `Unit ${args.unitNumber} marked as cleaned`
        }, null, 2)
      }]
    };
  } catch (error: any) {
    return {
      content: [{
        type: 'text',
        text: `Error marking unit as cleaned: ${error.message}`
      }],
      isError: true
    };
  }
}

export async function bulkMarkCleaned(args: any): Promise<MCPToolResult> {
  try {
    const result = await callAPI('POST', '/api/units/mark-cleaned-all', {});
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          result,
          message: 'All units marked as cleaned'
        }, null, 2)
      }]
    };
  } catch (error: any) {
    return {
      content: [{
        type: 'text',
        text: `Error bulk marking units: ${error.message}`
      }],
      isError: true
    };
  }
}
