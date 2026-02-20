import { callAPI } from '../http-client';
import { MCPTool, MCPToolResult } from '../types';

export const problemWriteTools: MCPTool[] = [
  {
    name: 'pelangi_get_problem_summary',
    description: 'Get summary of active and resolved problems',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  }
];

export async function getProblemSummary(args: any): Promise<MCPToolResult> {
  try {
    const active = await callAPI('GET', '/api/problems/active');
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          activeProblems: active,
          message: 'Problem summary retrieved'
        }, null, 2)
      }]
    };
  } catch (error: any) {
    return {
      content: [{
        type: 'text',
        text: `Error getting problem summary: ${error.message}`
      }],
      isError: true
    };
  }
}
