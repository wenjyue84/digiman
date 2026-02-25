import { callAPI } from '../http-client';
import { MCPTool, MCPToolResult } from '../types';
import { handleToolCall } from '../tool-factory';

export const guestTools: MCPTool[] = [
  {
    name: 'pelangi_list_guests',
    description: 'List all checked-in guests with pagination',
    inputSchema: {
      type: 'object',
      properties: {
        page: { type: 'number', description: 'Page number (default: 1)' },
        limit: { type: 'number', description: 'Items per page (default: 50)' }
      }
    }
  },
  {
    name: 'pelangi_get_guest',
    description: 'Get specific guest details by ID number (IC/Passport)',
    inputSchema: {
      type: 'object',
      properties: {
        guestId: { type: 'string', description: 'Guest IC number or passport number' }
      },
      required: ['guestId']
    }
  },
  {
    name: 'pelangi_search_guests',
    description: 'Search guests by name, unit, or nationality',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query' },
        field: { type: 'string', description: 'Field to search (name, unit, nationality)' }
      },
      required: ['query']
    }
  }
];

export async function listGuests(args: any): Promise<MCPToolResult> {
  try {
    const page = args.page || 1;
    const limit = args.limit || 50;
    const guests = await callAPI('GET', `/api/guests/checked-in?page=${page}&limit=${limit}`);
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(guests, null, 2)
      }]
    };
  } catch (error: any) {
    return {
      content: [{
        type: 'text',
        text: `Error listing guests: ${error.message}`
      }],
      isError: true
    };
  }
}

export async function getGuest(args: any): Promise<MCPToolResult> {
  return handleToolCall(() => callAPI('GET', `/api/guests/profiles/${args.guestId}`), 'Error getting guest');
}

export async function searchGuests(args: any): Promise<MCPToolResult> {
  try {
    const guests = await callAPI('GET', '/api/guests/history');
    const filtered = (guests as any[]).filter((g: any) => {
      const searchValue = args.query.toLowerCase();
      if (args.field === 'name') {
        return g.name?.toLowerCase().includes(searchValue);
      } else if (args.field === 'unit') {
        return g.unitNumber?.toString().includes(searchValue);
      } else if (args.field === 'nationality') {
        return g.nationality?.toLowerCase().includes(searchValue);
      } else {
        return g.name?.toLowerCase().includes(searchValue) ||
               g.unitNumber?.toString().includes(searchValue) ||
               g.nationality?.toLowerCase().includes(searchValue);
      }
    });
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(filtered, null, 2)
      }]
    };
  } catch (error: any) {
    return {
      content: [{
        type: 'text',
        text: `Error searching guests: ${error.message}`
      }],
      isError: true
    };
  }
}
