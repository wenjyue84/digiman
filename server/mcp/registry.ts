import { MCPTool, MCPToolResult, ToolHandler } from './types';

// Phase 1: Read-only tools
import { guestTools, listGuests, getGuest, searchGuests } from './tools/guests';
import { capsuleTools, listCapsules, getOccupancy, checkAvailability } from './tools/capsules';
import { dashboardTools, getDashboard, getOverdueGuests } from './tools/dashboard';
import { problemTools, listProblems, exportWhatsappIssues } from './tools/problems';

// Phase 2: Write operation tools
import {
  guestWriteTools,
  checkinGuest,
  checkoutGuest,
  bulkCheckout
} from './tools/guests-write';

import {
  capsuleWriteTools,
  markCleaned,
  bulkMarkCleaned
} from './tools/capsules-write';

import {
  problemWriteTools,
  getProblemSummary
} from './tools/problems-write';

import {
  analyticsTools,
  capsuleUtilization,
  guestStatistics,
  exportGuestsCSV
} from './tools/analytics';

import {
  settingsTools,
  getCapsuleRules
} from './tools/settings-tools';

// Phase 3: WhatsApp integration tools (proxied to Rainbow AI)
import {
  whatsappProxyTools,
  whatsappStatus,
  whatsappQrcode,
  whatsappSend,
  whatsappSendGuestStatus
} from './tools/whatsapp-proxy';

class ToolRegistry {
  private tools: Map<string, MCPTool> = new Map();
  private handlers: Map<string, ToolHandler> = new Map();

  constructor() {
    this.registerTools();
  }

  private registerTools() {
    // Phase 1: Read-only tools (10 tools)
    this.register(guestTools[0], listGuests);
    this.register(guestTools[1], getGuest);
    this.register(guestTools[2], searchGuests);

    this.register(capsuleTools[0], listCapsules);
    this.register(capsuleTools[1], getOccupancy);
    this.register(capsuleTools[2], checkAvailability);

    this.register(dashboardTools[0], getDashboard);
    this.register(dashboardTools[1], getOverdueGuests);

    this.register(problemTools[0], listProblems);
    this.register(problemTools[1], exportWhatsappIssues);

    // Phase 2: Guest write operations (3 tools)
    this.register(guestWriteTools[0], checkinGuest);
    this.register(guestWriteTools[1], checkoutGuest);
    this.register(guestWriteTools[2], bulkCheckout);

    // Phase 2: Capsule write operations (2 tools)
    this.register(capsuleWriteTools[0], markCleaned);
    this.register(capsuleWriteTools[1], bulkMarkCleaned);

    // Phase 2: Problem operations (1 tool)
    this.register(problemWriteTools[0], getProblemSummary);

    // Phase 2: Analytics & reporting (3 tools)
    this.register(analyticsTools[0], capsuleUtilization);
    this.register(analyticsTools[1], guestStatistics);
    this.register(analyticsTools[2], exportGuestsCSV);

    // Phase 2: Settings tools (1 tool)
    this.register(settingsTools[0], getCapsuleRules);

    // Phase 3: WhatsApp integration (4 tools, proxied to Rainbow AI)
    this.register(whatsappProxyTools[0], whatsappStatus);
    this.register(whatsappProxyTools[1], whatsappQrcode);
    this.register(whatsappProxyTools[2], whatsappSend);
    this.register(whatsappProxyTools[3], whatsappSendGuestStatus);
  }

  private register(tool: MCPTool, handler: ToolHandler) {
    this.tools.set(tool.name, tool);
    this.handlers.set(tool.name, handler);
  }

  listTools(): MCPTool[] {
    return Array.from(this.tools.values());
  }

  async executeTool(name: string, args: any): Promise<MCPToolResult> {
    const handler = this.handlers.get(name);
    if (!handler) {
      return {
        content: [{
          type: 'text',
          text: `Tool not found: ${name}`
        }],
        isError: true
      };
    }

    try {
      return await handler(args || {});
    } catch (error: any) {
      return {
        content: [{
          type: 'text',
          text: `Error executing tool ${name}: ${error.message}`
        }],
        isError: true
      };
    }
  }

  getToolCount(): { total: number; hotel: number; whatsapp: number } {
    return {
      total: this.tools.size,
      hotel: 20,
      whatsapp: 4
    };
  }
}

export const toolRegistry = new ToolRegistry();
