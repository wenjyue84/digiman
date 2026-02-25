import { callAPI } from '../lib/http-client.js';
import { MCPTool, MCPToolResult } from '../types/mcp.js';
import { handleToolCall } from './tool-factory.js';

export const problemTools: MCPTool[] = [
  {
    name: 'pelangi_list_problems',
    description: 'List active maintenance problems',
    inputSchema: {
      type: 'object',
      properties: {
        activeOnly: { type: 'boolean', description: 'Show only active problems (default: true)' }
      }
    }
  },
  {
    name: 'pelangi_export_whatsapp_issues',
    description: 'Export maintenance issues in WhatsApp-friendly format',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  }
];

export async function listProblems(args: any): Promise<MCPToolResult> {
  return handleToolCall(() => callAPI('GET', '/api/problems/active'), 'Error listing problems');
}

export async function exportWhatsappIssues(args: any): Promise<MCPToolResult> {
  try {
    const problems = await callAPI('GET', '/api/problems/active');

    if (!Array.isArray(problems) || problems.length === 0) {
      return {
        content: [{
          type: 'text',
          text: '✅ No active maintenance issues'
        }]
      };
    }

    let message = '🔧 *Pelangi Maintenance Report*\n';
    message += `📅 ${new Date().toLocaleDateString()}\n`;
    message += `⚠️ ${problems.length} Active Issue(s)\n\n`;

    problems.forEach((problem: any, index: number) => {
      message += `${index + 1}. *Unit ${problem.unitNumber}*\n`;
      message += `   Problem: ${problem.description}\n`;
      if (problem.reportedAt) {
        message += `   Reported: ${new Date(problem.reportedAt).toLocaleDateString()}\n`;
      }
      message += '\n';
    });

    message += '---\n';
    message += 'Reply with unit number when resolved';

    return {
      content: [{
        type: 'text',
        text: message
      }]
    };
  } catch (error: any) {
    return {
      content: [{
        type: 'text',
        text: `Error exporting WhatsApp issues: ${error.message}`
      }],
      isError: true
    };
  }
}
