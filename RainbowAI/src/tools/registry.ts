import { MCPTool, MCPToolResult, ToolHandler } from '../types/mcp.js';

// Phase 1: Read-only tools
import { guestTools, listGuests, getGuest, searchGuests } from './guests.js';
import { unitTools, listUnits, getOccupancy, checkAvailability } from './units.js';
import { dashboardTools, getDashboard, getOverdueGuests } from './dashboard.js';
import { problemTools, listProblems, exportWhatsappIssues } from './problems.js';

// Phase 2: Write operation tools (HTTP API based)
import {
  guestWriteTools,
  checkinGuest,
  checkoutGuest,
  bulkCheckout
} from './guests-write.js';

import {
  unitWriteTools,
  markCleaned,
  bulkMarkCleaned
} from './units-write.js';

import {
  problemWriteTools,
  getProblemSummary
} from './problems-write.js';

import {
  analyticsTools,
  capsuleUtilization,
  guestStatistics,
  exportGuestsCSV
} from './analytics.js';

import {
  settingsTools,
  getCapsuleRules
} from './settings-tools.js';

// Phase 3: WhatsApp integration tools
import {
  whatsappTools,
  whatsappStatus,
  whatsappQrcode,
  whatsappSend,
  whatsappSendGuestStatus
} from './whatsapp.js';

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

    this.register(unitTools[0], listUnits);
    this.register(unitTools[1], getOccupancy);
    this.register(unitTools[2], checkAvailability);

    this.register(dashboardTools[0], getDashboard);
    this.register(dashboardTools[1], getOverdueGuests);

    this.register(problemTools[0], listProblems);
    this.register(problemTools[1], exportWhatsappIssues);

    // Phase 2: Guest write operations (3 tools)
    this.register(guestWriteTools[0], checkinGuest);
    this.register(guestWriteTools[1], checkoutGuest);
    this.register(guestWriteTools[2], bulkCheckout);

    // Phase 2: Unit write operations (2 tools)
    this.register(unitWriteTools[0], markCleaned);
    this.register(unitWriteTools[1], bulkMarkCleaned);

    // Phase 2: Problem operations (1 tool)
    this.register(problemWriteTools[0], getProblemSummary);

    // Phase 2: Analytics & reporting (3 tools)
    this.register(analyticsTools[0], capsuleUtilization);
    this.register(analyticsTools[1], guestStatistics);
    this.register(analyticsTools[2], exportGuestsCSV);

    // Phase 2: Settings tools (1 tool)
    this.register(settingsTools[0], getCapsuleRules);

    // Phase 3: WhatsApp integration (4 tools)
    this.register(whatsappTools[0], whatsappStatus);
    this.register(whatsappTools[1], whatsappQrcode);
    this.register(whatsappTools[2], whatsappSend);
    this.register(whatsappTools[3], whatsappSendGuestStatus);
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

  getToolCount(): { total: number; phase1: number; phase2: number; phase3: number } {
    return {
      total: this.tools.size,
      phase1: 10,
      phase2: 10,
      phase3: 4
    };
  }
}

export const toolRegistry = new ToolRegistry();
