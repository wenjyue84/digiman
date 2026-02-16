/**
 * Node-Based Workflow System (n8n-inspired)
 *
 * Defines a graph-based workflow format where each workflow is a set of
 * typed nodes connected by edges. Supports: message, wait_reply,
 * whatsapp_send, pelangi_api, and condition node types.
 *
 * The executor walks the graph from startNodeId, following `next` pointers.
 * For backward compatibility, workflows can use either 'steps' (legacy)
 * or 'nodes' (new) format — auto-detected at runtime.
 */

import type { WorkflowStep } from './config-store.js';

// ============================================================================
// Node Type Enum
// ============================================================================

export type NodeType = 'message' | 'wait_reply' | 'whatsapp_send' | 'pelangi_api' | 'condition';

// ============================================================================
// Node Config Types (per node type)
// ============================================================================

/** Trilingual message — matches the Zod trilingualSchema (all required) */
export interface TrilingualMessage {
  en: string;
  ms: string;
  zh: string;
}

/** Config for 'message' node — sends a multilang message to the guest */
export interface MessageNodeConfig {
  message: TrilingualMessage;
}

/** Config for 'wait_reply' node — pauses execution until guest replies */
export interface WaitReplyNodeConfig {
  storeAs: string;       // Variable name to store user reply (e.g., 'guest_name')
  prompt?: TrilingualMessage; // Optional prompt message
  timeout?: number;      // Optional timeout in ms
}

/** Config for 'whatsapp_send' node — sends WhatsApp message to any number */
export interface WhatsAppSendNodeConfig {
  sender?: string;       // Defaults to system WhatsApp number
  receiver: string;      // Literal phone, {{guest.phone}}, {{system.admin_phone}}
  content: TrilingualMessage | string;
  urgency?: 'normal' | 'high' | 'critical';
}

/** Config for 'pelangi_api' node — calls Pelangi Manager API at port 5000 */
export interface PelangiApiNodeConfig {
  action: 'check_availability' | 'check_lower_deck' | 'create_checkin_link' | 'book_capsule';
  params?: Record<string, string>; // Template variables for API params
}

/** Config for 'condition' node — branches based on variable evaluation */
export interface ConditionNodeConfig {
  field: string;          // Template variable to evaluate (e.g., '{{pelangi.availableCount}}')
  operator: 'gt' | 'lt' | 'eq' | 'neq' | 'exists' | 'empty';
  value?: string | number;
  trueNext: string;       // Node ID if condition is true
  falseNext: string;      // Node ID if condition is false
}

/** Union of all config types */
export type NodeConfig =
  | MessageNodeConfig
  | WaitReplyNodeConfig
  | WhatsAppSendNodeConfig
  | PelangiApiNodeConfig
  | ConditionNodeConfig;

// ============================================================================
// Workflow Node
// ============================================================================

export interface WorkflowNode {
  id: string;
  type: NodeType;
  label: string;
  config: NodeConfig;
  /** Next node ID, or branching object for error handling */
  next?: string | { success: string; error?: string };
  /** Output variable mappings — keys become template vars for downstream nodes */
  outputs?: Record<string, string>;
}

// ============================================================================
// Node-Based Workflow Definition
// ============================================================================

export interface NodeBasedWorkflow {
  id: string;
  name: string;
  format: 'nodes';
  startNodeId: string;
  nodes: WorkflowNode[];
}

/** Hybrid type: a workflow can be either steps-based or nodes-based */
export interface HybridWorkflowDefinition {
  id: string;
  name: string;
  format?: 'steps' | 'nodes';
  steps?: WorkflowStep[];
  startNodeId?: string;
  nodes?: WorkflowNode[];
}

// ============================================================================
// Node Execution State (replaces stepIndex for node workflows)
// ============================================================================

export interface NodeWorkflowState {
  workflowId: string;
  currentNodeId: string;
  /** Collected data from wait_reply nodes: variable name -> user response */
  collectedData: Record<string, string>;
  /** Output data from API/action nodes: variable name -> result */
  nodeOutputs: Record<string, any>;
  startedAt: number;
  lastUpdateAt: number;
}

// ============================================================================
// Template Variable Resolution
// ============================================================================

/**
 * Strip `@s.whatsapp.net` suffix and `+` prefix from a phone number,
 * then format as a clickable WhatsApp link: https://wa.me/[number]
 *
 * Example: "+601139751613@s.whatsapp.net" → "https://wa.me/601139751613"
 * Example: "+60127088789" → "https://wa.me/60127088789"
 */
export function formatPhoneAsWaLink(phone: string): string {
  if (!phone) return '';
  // Strip @s.whatsapp.net suffix
  let clean = phone.replace(/@s\.whatsapp\.net$/i, '');
  // Strip leading +
  clean = clean.replace(/^\+/, '');
  // Strip non-digit characters (except for the number itself)
  clean = clean.replace(/[^0-9]/g, '');
  if (!clean) return phone;
  return 'https://wa.me/' + clean;
}

/**
 * Convert raw phone numbers in message text to clickable wa.me links.
 * Matches patterns like +60127088789 (with optional parentheses around them).
 * Only converts numbers that look like international phone numbers (+ followed by 10-15 digits).
 */
export function convertRawPhonesToLinks(text: string): string {
  // Match +XX... phone numbers (10-15 digits after +), optionally wrapped in parens
  // e.g. "+60127088789", "(+60127088789)"
  return text.replace(/\(?(\+\d{10,15})\)?/g, (match, phone) => {
    const clean = phone.replace(/^\+/, '');
    return 'https://wa.me/' + clean;
  });
}

/**
 * Resolve template variables in a string.
 * Supports: {{guest.name}}, {{guest.phone}}, {{guest.phone_link}}, {{system.admin_phone}},
 * {{workflow.data.varName}}, {{pelangi.field}}, {{node.outputField}}
 *
 * Phone numbers in message content are rendered as clickable wa.me links.
 */
export function resolveTemplateVars(
  template: string,
  context: {
    collectedData: Record<string, string>;
    nodeOutputs: Record<string, any>;
    phone?: string;
    pushName?: string;
    language?: string;
    adminPhone?: string;
  }
): string {
  let result = template;

  // {{guest.*}} variables
  result = result.replace(/\{\{guest\.name\}\}/g, context.pushName || 'Guest');
  // {{guest.phone_link}} — explicit clickable wa.me link
  result = result.replace(/\{\{guest\.phone_link\}\}/g, formatPhoneAsWaLink(context.phone || ''));
  // {{guest.phone}} — render as clickable wa.me link in message content
  result = result.replace(/\{\{guest\.phone\}\}/g, formatPhoneAsWaLink(context.phone || ''));
  result = result.replace(/\{\{guest\.language\}\}/g, context.language || 'en');

  // {{system.*}} variables — admin phone as clickable wa.me link in message content
  result = result.replace(/\{\{system\.admin_phone\}\}/g, formatPhoneAsWaLink(context.adminPhone || '+60127088789'));

  // {{workflow.data.*}} variables (from wait_reply collected data)
  result = result.replace(/\{\{workflow\.data\.(\w+)\}\}/g, (_, key) => {
    return context.collectedData[key] || '';
  });

  // {{pelangi.*}} variables (from pelangi_api node outputs)
  result = result.replace(/\{\{pelangi\.(\w+)\}\}/g, (_, key) => {
    return context.nodeOutputs[`pelangi.${key}`] ?? context.nodeOutputs[key] ?? '';
  });

  // {{node.*}} variables (generic node outputs)
  result = result.replace(/\{\{node\.(\w+)\}\}/g, (_, key) => {
    return context.nodeOutputs[key] ?? '';
  });

  // Post-process: convert any remaining raw phone numbers to wa.me links
  result = convertRawPhonesToLinks(result);

  return result;
}

/**
 * Resolve a template variable reference to its actual value.
 * Used for receiver/sender fields in whatsapp_send nodes.
 * Returns RAW phone numbers (not wa.me links) for use as WhatsApp recipients.
 */
export function resolveVariableRef(
  ref: string,
  context: {
    collectedData: Record<string, string>;
    nodeOutputs: Record<string, any>;
    phone?: string;
    pushName?: string;
    adminPhone?: string;
  }
): string {
  // Direct template variable — resolve WITHOUT wa.me link formatting
  if (ref === '{{guest.phone}}') {
    return context.phone || '';
  }
  if (ref === '{{system.admin_phone}}') {
    return context.adminPhone || '+60127088789';
  }
  if (ref.startsWith('{{') && ref.endsWith('}}')) {
    // For other template vars, use resolveTemplateVars but strip any wa.me prefix
    const resolved = resolveTemplateVars(ref, context);
    return resolved;
  }
  // Literal value (phone number string)
  return ref;
}

// ============================================================================
// Format Detection
// ============================================================================

/** Check if a workflow definition uses the node-based format */
export function isNodeBasedWorkflow(workflow: HybridWorkflowDefinition): boolean {
  return workflow.format === 'nodes' && Array.isArray(workflow.nodes) && !!workflow.startNodeId;
}

/** Get a node by ID from a node array */
export function getNodeById(nodes: WorkflowNode[], nodeId: string): WorkflowNode | undefined {
  return nodes.find(n => n.id === nodeId);
}

/** Get the next node ID, handling both string and branching forms */
export function getNextNodeId(
  node: WorkflowNode,
  success: boolean = true
): string | undefined {
  if (!node.next) return undefined;
  if (typeof node.next === 'string') return node.next;
  return success ? node.next.success : node.next.error;
}

// ============================================================================
// Adapter: Convert Nodes to Steps (backward compatibility)
// ============================================================================

/**
 * Convert a node-based workflow to a linear steps array.
 * This is a lossy conversion — condition branching becomes evaluation steps,
 * and whatsapp_send/pelangi_api become action-enhanced steps.
 *
 * Used as fallback when the node executor isn't available.
 */
export function convertNodesToSteps(workflow: NodeBasedWorkflow): WorkflowStep[] {
  const steps: WorkflowStep[] = [];
  const visited = new Set<string>();

  function walkNode(nodeId: string): void {
    if (visited.has(nodeId)) return; // Prevent infinite loops
    visited.add(nodeId);

    const node = getNodeById(workflow.nodes, nodeId);
    if (!node) return;

    switch (node.type) {
      case 'message': {
        const config = node.config as MessageNodeConfig;
        steps.push({
          id: node.id,
          message: { en: config.message.en, ms: config.message.ms || config.message.en, zh: config.message.zh || config.message.en },
          waitForReply: false,
        });
        break;
      }

      case 'wait_reply': {
        const config = node.config as WaitReplyNodeConfig;
        const message = config.prompt || { en: 'Please reply:', ms: 'Sila balas:', zh: '请回复：' };
        steps.push({
          id: node.id,
          message: { en: message.en, ms: message.ms || message.en, zh: message.zh || message.en },
          waitForReply: true,
        });
        break;
      }

      case 'whatsapp_send': {
        const config = node.config as WhatsAppSendNodeConfig;
        const content = typeof config.content === 'string'
          ? { en: config.content, ms: config.content, zh: config.content }
          : config.content;
        steps.push({
          id: node.id,
          message: { en: content.en, ms: content.ms || content.en, zh: content.zh || content.en },
          waitForReply: false,
          action: {
            type: 'whatsapp_send',
            params: { receiver: config.receiver, sender: config.sender, urgency: config.urgency },
          },
        });
        break;
      }

      case 'pelangi_api': {
        const config = node.config as PelangiApiNodeConfig;
        steps.push({
          id: node.id,
          message: { en: 'Processing...', ms: 'Sedang memproses...', zh: '处理中...' },
          waitForReply: false,
          action: {
            type: config.action,
            params: config.params,
          },
        });
        break;
      }

      case 'condition': {
        const config = node.config as ConditionNodeConfig;
        steps.push({
          id: node.id,
          message: { en: '', ms: '', zh: '' }, // Silent step
          waitForReply: false,
          evaluation: {
            prompt: `Check if ${config.field} ${config.operator} ${config.value}`,
            outcomes: { true: config.trueNext, false: config.falseNext },
            defaultNextId: config.falseNext,
          },
        });
        // Walk both branches
        walkNode(config.trueNext);
        walkNode(config.falseNext);
        return; // Don't follow node.next — condition handles branching
      }
    }

    // Follow next pointer
    const nextId = getNextNodeId(node);
    if (nextId) walkNode(nextId);
  }

  walkNode(workflow.startNodeId);
  return steps;
}
