import axios from 'axios';
import { MCPTool, MCPToolResult } from '../types';

/**
 * WhatsApp MCP tools that proxy to Rainbow AI (port 3002).
 *
 * These 4 tools need the WhatsApp/Baileys connection which lives in Rainbow AI.
 * Instead of importing whatsappManager directly (tight coupling), we call
 * Rainbow AI's admin API endpoints over HTTP.
 */

const RAINBOW_URL = process.env.RAINBOW_AI_URL || 'http://localhost:3002';
const ADMIN_KEY = process.env.RAINBOW_ADMIN_KEY || '';

function rainbowHeaders() {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (ADMIN_KEY) {
    headers['X-Admin-Key'] = ADMIN_KEY;
  }
  return headers;
}

export const whatsappProxyTools: MCPTool[] = [
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
    const { data: statuses } = await axios.get(
      `${RAINBOW_URL}/api/rainbow/whatsapp/instances`,
      { headers: rainbowHeaders(), timeout: 10000 }
    );

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          instanceCount: statuses.length,
          instances: statuses.map((s: any) => ({
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
        text: `Error checking WhatsApp status (Rainbow AI at ${RAINBOW_URL} may be down): ${error.message}`
      }],
      isError: true
    };
  }
}

export async function whatsappQrcode(args: any): Promise<MCPToolResult> {
  try {
    const { data: statuses } = await axios.get(
      `${RAINBOW_URL}/api/rainbow/whatsapp/instances`,
      { headers: rainbowHeaders(), timeout: 10000 }
    );

    const needsQR = statuses.filter((s: any) => s.state !== 'open');
    const connected = statuses.filter((s: any) => s.state === 'open');

    if (needsQR.length === 0 && connected.length > 0) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            message: 'All WhatsApp instances are connected. No QR code needed.',
            instances: connected.map((s: any) => ({ id: s.id, label: s.label, user: s.user }))
          }, null, 2)
        }]
      };
    }

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          message: 'Visit the Rainbow Admin dashboard to scan QR codes for disconnected instances.',
          url: `${RAINBOW_URL}/admin/rainbow/dashboard`,
          disconnected: needsQR.map((s: any) => ({ id: s.id, label: s.label, state: s.state, hasQR: !!s.qr })),
          connected: connected.map((s: any) => ({ id: s.id, label: s.label, user: s.user }))
        }, null, 2)
      }]
    };
  } catch (error: any) {
    return {
      content: [{
        type: 'text',
        text: `Error getting QR codes (Rainbow AI at ${RAINBOW_URL} may be down): ${error.message}`
      }],
      isError: true
    };
  }
}

export async function whatsappSend(args: any): Promise<MCPToolResult> {
  try {
    const { data } = await axios.post(
      `${RAINBOW_URL}/api/rainbow/whatsapp/send`,
      { phone: args.phone, message: args.message, instance: args.instance },
      { headers: rainbowHeaders(), timeout: 15000 }
    );

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          to: data.to || args.phone,
          instance: data.instance || args.instance || '(first connected)',
          message: args.message.substring(0, 100) + (args.message.length > 100 ? '...' : ''),
          messageId: data.messageId
        }, null, 2)
      }]
    };
  } catch (error: any) {
    return {
      content: [{
        type: 'text',
        text: `Error sending WhatsApp message (Rainbow AI at ${RAINBOW_URL} may be down): ${error.message}`
      }],
      isError: true
    };
  }
}

export async function whatsappSendGuestStatus(args: any): Promise<MCPToolResult> {
  try {
    const { data } = await axios.post(
      `${RAINBOW_URL}/api/rainbow/whatsapp/send-daily-report`,
      { phone: args.phone },
      { headers: rainbowHeaders(), timeout: 30000 }
    );

    if (!data.success) {
      return {
        content: [{
          type: 'text',
          text: `Error sending guest status: ${data.error}`
        }],
        isError: true
      };
    }

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          to: data.to || args.phone || '60127088789',
          messageSent: data.message
        }, null, 2)
      }]
    };
  } catch (error: any) {
    return {
      content: [{
        type: 'text',
        text: `Error sending guest status via WhatsApp (Rainbow AI at ${RAINBOW_URL} may be down): ${error.message}`
      }],
      isError: true
    };
  }
}
