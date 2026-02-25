import { callAPI } from '../lib/http-client.js';
import { MCPTool, MCPToolResult } from '../types/mcp.js';

export const dashboardTools: MCPTool[] = [
  {
    name: 'pelangi_get_dashboard',
    description: 'Bulk fetch dashboard data (occupancy, guests, tokens, notifications)',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'pelangi_get_overdue_guests',
    description: 'List guests past expected checkout date',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  }
];

export async function getDashboard(args: any): Promise<MCPToolResult> {
  try {
    const [occupancy, guestResponse, units] = await Promise.all([
      callAPI('GET', '/api/occupancy'),
      callAPI('GET', '/api/guests/checked-in?page=1&limit=100'),
      callAPI('GET', '/api/units')
    ]);

    const guests = (guestResponse as any).data || guestResponse;

    const dashboard = {
      occupancy,
      guests,
      units,
      timestamp: new Date().toISOString()
    };

    return {
      content: [{
        type: 'text',
        text: JSON.stringify(dashboard, null, 2)
      }]
    };
  } catch (error: any) {
    return {
      content: [{
        type: 'text',
        text: `Error fetching dashboard: ${error.message}`
      }],
      isError: true
    };
  }
}

export async function getOverdueGuests(args: any): Promise<MCPToolResult> {
  try {
    const response = await callAPI('GET', '/api/guests/checked-in?page=1&limit=100');
    const guests = (response as any).data || [];
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const overdue = (guests as any[]).filter((g: any) => {
      if (!g.expectedCheckoutDate) return false;
      try {
        const checkoutDate = new Date(g.expectedCheckoutDate + 'T00:00:00');
        return checkoutDate < today;
      } catch {
        return false;
      }
    });

    return {
      content: [{
        type: 'text',
        text: JSON.stringify(overdue, null, 2)
      }]
    };
  } catch (error: any) {
    return {
      content: [{
        type: 'text',
        text: `Error getting overdue guests: ${error.message}`
      }],
      isError: true
    };
  }
}
