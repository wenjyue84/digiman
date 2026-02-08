import { getWhatsAppStatus, sendWhatsAppMessage, formatPhoneNumber } from '../lib/baileys-client.js';
import { callAPI } from '../lib/http-client.js';
import { sendDailyReport } from '../lib/daily-report.js';
import { MCPTool, MCPToolResult } from '../types/mcp.js';

export const whatsappTools: MCPTool[] = [
  {
    name: 'pelangi_whatsapp_status',
    description: 'Check WhatsApp connection status (is the number connected/authenticated?)',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'pelangi_whatsapp_qrcode',
    description: 'Get instructions for WhatsApp QR code pairing (run pair-whatsapp.cjs script)',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'pelangi_whatsapp_send',
    description: 'Send a WhatsApp text message to a phone number',
    inputSchema: {
      type: 'object',
      properties: {
        phone: { type: 'string', description: 'Recipient phone number (e.g. "60127088789" or "+60 12-708 8789")' },
        message: { type: 'string', description: 'Text message to send' }
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
    const status = getWhatsAppStatus();
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(status, null, 2)
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
  const status = getWhatsAppStatus();
  if (status.state === 'open') {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          message: 'WhatsApp is already connected. No QR code needed.',
          user: status.user
        }, null, 2)
      }]
    };
  }
  return {
    content: [{
      type: 'text',
      text: JSON.stringify({
        message: 'To pair WhatsApp, run the pairing script on the server:',
        command: 'cd mcp-server && node pair-whatsapp.cjs',
        instructions: [
          '1. Run the command above on the server host',
          '2. Open the QR code PNG saved to Desktop',
          '3. Scan with WhatsApp (Settings > Linked Devices > Link a Device)',
          '4. Auth is saved to whatsapp-auth/ for auto-reconnect'
        ],
        currentState: status.state
      }, null, 2)
    }]
  };
}

export async function whatsappSend(args: any): Promise<MCPToolResult> {
  try {
    const phone = formatPhoneNumber(args.phone);
    const result = await sendWhatsAppMessage(phone, args.message);
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          to: phone,
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
