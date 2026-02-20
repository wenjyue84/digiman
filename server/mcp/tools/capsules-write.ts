import { callAPI } from '../http-client';
import { MCPTool, MCPToolResult } from '../types';

export const capsuleWriteTools: MCPTool[] = [
  {
    name: 'pelangi_mark_cleaned',
    description: 'Mark a capsule as cleaned',
    inputSchema: {
      type: 'object',
      properties: {
        capsuleNumber: { type: 'number', description: 'Capsule number' }
      },
      required: ['capsuleNumber']
    }
  },
  {
    name: 'pelangi_bulk_mark_cleaned',
    description: 'Mark all capsules as cleaned',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  }
];

export async function markCleaned(args: any): Promise<MCPToolResult> {
  try {
    const result = await callAPI('POST', `/api/capsules/${args.capsuleNumber}/mark-cleaned`, {});
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          capsuleNumber: args.capsuleNumber,
          message: `Capsule ${args.capsuleNumber} marked as cleaned`
        }, null, 2)
      }]
    };
  } catch (error: any) {
    return {
      content: [{
        type: 'text',
        text: `Error marking capsule as cleaned: ${error.message}`
      }],
      isError: true
    };
  }
}

export async function bulkMarkCleaned(args: any): Promise<MCPToolResult> {
  try {
    const result = await callAPI('POST', '/api/capsules/mark-cleaned-all', {});
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          result,
          message: 'All capsules marked as cleaned'
        }, null, 2)
      }]
    };
  } catch (error: any) {
    return {
      content: [{
        type: 'text',
        text: `Error bulk marking capsules: ${error.message}`
      }],
      isError: true
    };
  }
}
