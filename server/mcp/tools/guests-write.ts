import { callAPI } from '../http-client';
import { MCPTool, MCPToolResult } from '../types';

export const guestWriteTools: MCPTool[] = [
  {
    name: 'pelangi_checkin_guest',
    description: 'Check in a new guest with automatic or manual capsule assignment',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Guest full name' },
        idNumber: { type: 'string', description: 'IC or passport number' },
        nationality: { type: 'string', description: 'Guest nationality' },
        phoneNumber: { type: 'string', description: 'Contact phone number' },
        email: { type: 'string', description: 'Email address (optional)' },
        expectedCheckoutDate: { type: 'string', description: 'Expected checkout date (YYYY-MM-DD)' },
        capsuleNumber: { type: 'number', description: 'Specific capsule to assign (optional, auto-assigned if not provided)' },
        paymentAmount: { type: 'number', description: 'Payment amount' },
        paymentMethod: { type: 'string', description: 'Payment method (cash, card, online)' }
      },
      required: ['name', 'idNumber', 'nationality', 'phoneNumber', 'expectedCheckoutDate', 'paymentAmount', 'paymentMethod']
    }
  },
  {
    name: 'pelangi_checkout_guest',
    description: 'Check out a guest by ID number',
    inputSchema: {
      type: 'object',
      properties: {
        idNumber: { type: 'string', description: 'Guest IC or passport number' }
      },
      required: ['idNumber']
    }
  },
  {
    name: 'pelangi_bulk_checkout',
    description: 'Bulk checkout guests (overdue, today, or all)',
    inputSchema: {
      type: 'object',
      properties: {
        type: { type: 'string', description: 'Checkout type: overdue, today, or all' }
      },
      required: ['type']
    }
  }
];

export async function checkinGuest(args: any): Promise<MCPToolResult> {
  try {
    const result = await callAPI('POST', '/api/guests/checkin', args);
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          guest: result,
          message: `Guest ${args.name} checked in successfully`
        }, null, 2)
      }]
    };
  } catch (error: any) {
    return {
      content: [{
        type: 'text',
        text: `Error checking in guest: ${error.message}`
      }],
      isError: true
    };
  }
}

export async function checkoutGuest(args: any): Promise<MCPToolResult> {
  try {
    const result = await callAPI('POST', '/api/guests/checkout', { idNumber: args.idNumber });
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          guest: result,
          message: 'Guest checked out successfully'
        }, null, 2)
      }]
    };
  } catch (error: any) {
    return {
      content: [{
        type: 'text',
        text: `Error checking out guest: ${error.message}`
      }],
      isError: true
    };
  }
}

export async function bulkCheckout(args: any): Promise<MCPToolResult> {
  try {
    const type = args.type || 'overdue';
    let endpoint = '/api/guests/checkout-overdue';

    if (type === 'today') {
      endpoint = '/api/guests/checkout-today';
    } else if (type === 'all') {
      endpoint = '/api/guests/checkout-all';
    }

    const result = await callAPI('POST', endpoint, {});
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          result,
          type,
          message: `Bulk checkout completed: ${type}`
        }, null, 2)
      }]
    };
  } catch (error: any) {
    return {
      content: [{
        type: 'text',
        text: `Error bulk checkout: ${error.message}`
      }],
      isError: true
    };
  }
}
