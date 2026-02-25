import { callAPI } from '../lib/http-client.js';
import { MCPTool, MCPToolResult } from '../types/mcp.js';

export const settingsTools: MCPTool[] = [
  {
    name: 'pelangi_get_unit_rules',
    description: 'Get unit assignment rules (deck priority, excluded units, gender preferences, maintenance deprioritization). Use this to understand how units should be assigned to guests.',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  }
];

export async function getUnitRules(args: any): Promise<MCPToolResult> {
  try {
    const rules = await callAPI('GET', '/api/settings/unit-rules');
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(rules, null, 2)
      }]
    };
  } catch (error: any) {
    return {
      content: [{
        type: 'text',
        text: `Error fetching unit rules: ${error.message}`
      }],
      isError: true
    };
  }
}
