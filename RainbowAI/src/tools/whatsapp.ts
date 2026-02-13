import { getWhatsAppStatus, sendWhatsAppMessage, formatPhoneNumber, whatsappManager } from '../lib/baileys-client.js';
import { callAPI } from '../lib/http-client.js';
import { sendDailyReport } from '../lib/daily-report.js';
import { MCPTool, MCPToolResult } from '../types/mcp.js';

export const whatsappTools: MCPTool[] = [
  {
    name: 'pelangi_whatsapp_status',
    description: 'Check WhatsApp connection status for all instances (multiple numbers)',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'pelangi_whatsapp_qrcode',
    description: 'Get QR code status for all WhatsApp instances',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'pelangi_whatsapp_send',
    description: 'Send a WhatsApp text message to a phone number (optionally via a specific instance)',
    inputSchema: {
      type: 'object',
      properties: {
        phone: { type: 'string', description: 'Recipient phone number (e.g. "60127088789" or "+60 12-708 8789")' },
        message: { type: 'string', description: 'Text message to send' },
        instance: { type: 'string', description: 'Instance ID to send from (optional, defaults to first connected)' }
      },
      required: ['phone', 'message']
    }
  },
  {
    name: 'pelangi_whatsapp_send_guest_status',
    description: 'Fetch current guest/capsule status from PelangiManager and send as WhatsApp message',
    inputSchema: {
      type: 'object',
      properties: {
        phone: { type: 'string', description: 'Recipient phone number (default: Jay\'s number 60127088789)' }
      }
    }
  }
];

export async function whatsappStatus(args: any): Promise<MCPToolResult> {
  try {
    const statuses = whatsappManager.getAllStatuses();
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          instanceCount: statuses.length,
          instances: statuses.map(s => ({
            id: s.id,
            label: s.label,
            state: s.state,
            user: s.user
          }))
        }, null, 2)
      }]
    };
  } catch (error: any) {
    return {
      content: [{
        type: 'text',
        text: `Error checking WhatsApp status: ${error.message}`
      }],
      isError: true
    };
  }
}

export async function whatsappQrcode(args: any): Promise<MCPToolResult> {
  const statuses = whatsappManager.getAllStatuses();
  const needsQR = statuses.filter(s => s.state !== 'open');
  const connected = statuses.filter(s => s.state === 'open');

  if (needsQR.length === 0 && connected.length > 0) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          message: 'All WhatsApp instances are connected. No QR code needed.',
          instances: connected.map(s => ({ id: s.id, label: s.label, user: s.user }))
        }, null, 2)
      }]
    };
  }

  return {
    content: [{
      type: 'text',
      text: JSON.stringify({
        message: 'Visit the Rainbow Admin dashboard to scan QR codes for disconnected instances.',
        url: '/admin/rainbow/dashboard',
        disconnected: needsQR.map(s => ({ id: s.id, label: s.label, state: s.state, hasQR: !!s.qr })),
        connected: connected.map(s => ({ id: s.id, label: s.label, user: s.user }))
      }, null, 2)
    }]
  };
}

export async function whatsappSend(args: any): Promise<MCPToolResult> {
  try {
    const phone = formatPhoneNumber(args.phone);
    const result = await sendWhatsAppMessage(phone, args.message, args.instance);
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          to: phone,
          instance: args.instance || '(first connected)',
          message: args.message.substring(0, 100) + (args.message.length > 100 ? '...' : ''),
          messageId: result?.key?.id
        }, null, 2)
      }]
    };
  } catch (error: any) {
    return {
      content: [{
        type: 'text',
        text: `Error sending WhatsApp message: ${error.message}`
      }],
      isError: true
    };
  }
}

export async function whatsappSendGuestStatus(args: any): Promise<MCPToolResult> {
  try {
    const phone = args.phone ? formatPhoneNumber(args.phone) : undefined;
    const result = await sendDailyReport(phone);

    if (!result.success) {
      return {
        content: [{
          type: 'text',
          text: `Error sending guest status: ${result.error}`
        }],
        isError: true
      };
    }

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          to: phone || '60127088789',
          messageSent: result.message
        }, null, 2)
      }]
    };
  } catch (error: any) {
    return {
      content: [{
        type: 'text',
        text: `Error sending guest status via WhatsApp: ${error.message}`
      }],
      isError: true
    };
  }
}
