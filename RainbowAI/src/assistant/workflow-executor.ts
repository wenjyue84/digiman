import type { SendMessageFn } from './types.js';
import { configStore } from './config-store.js';
import type { WorkflowDefinition, WorkflowStep } from './config-store.js';
import { enhanceWorkflowStep, WorkflowEnhancerContext } from './workflow-enhancer.js';
import { callAPI as httpClientCallAPI } from '../lib/http-client.js';
import { notifyAdminConfigError } from '../lib/admin-notifier.js';
import type {
  HybridWorkflowDefinition, WorkflowNode, NodeWorkflowState,
  MessageNodeConfig, WaitReplyNodeConfig, WhatsAppSendNodeConfig,
  PelangiApiNodeConfig, ConditionNodeConfig,
} from './workflow-nodes.js';
import {
  isNodeBasedWorkflow, getNodeById, getNextNodeId, resolveTemplateVars,
} from './workflow-nodes.js';

// Wrapper to adapt http-client callAPI to workflow-enhancer's expected signature
async function callAPIWrapper(url: string, options?: RequestInit): Promise<any> {
  const method = options?.method || 'GET';
  const body = options?.body ? JSON.parse(options.body as string) : undefined;
  return httpClientCallAPI(method, url, body);
}

export interface WorkflowState {
  workflowId: string;
  currentStepIndex: number;
  collectedData: Record<string, string>; // step id -> user response
  startedAt: number;
  lastUpdateAt: number;
  // Node-based workflow fields (optional — only set for node workflows)
  currentNodeId?: string;            // Current position in node graph
  nodeOutputs?: Record<string, any>; // Accumulated outputs from API/action nodes
  isNodeBased?: boolean;             // Quick flag to skip format detection
}

export interface WorkflowExecutionResult {
  response: string;
  newState: WorkflowState | null; // null when workflow complete
  shouldForward?: boolean; // true on final step
  conversationSummary?: string;
  workflowId?: string;  // For conversation log edit support
  stepId?: string;      // For conversation log edit support
}

let sendMessageFn: SendMessageFn | null = null;

export function initWorkflowExecutor(sendFn: SendMessageFn): void {
  sendMessageFn = sendFn;
}

export function createWorkflowState(workflowId: string): WorkflowState {
  // Check if this workflow uses node-based format
  const workflows = configStore.getWorkflows();
  const workflow = workflows.workflows.find(w => w.id === workflowId) as HybridWorkflowDefinition | undefined;
  const isNodes = workflow ? isNodeBasedWorkflow(workflow) : false;

  return {
    workflowId,
    currentStepIndex: 0,
    collectedData: {},
    startedAt: Date.now(),
    lastUpdateAt: Date.now(),
    // Set node-based fields if applicable
    ...(isNodes && workflow?.startNodeId ? {
      currentNodeId: workflow.startNodeId,
      nodeOutputs: {},
      isNodeBased: true,
    } : {}),
  };
}

export async function executeWorkflowStep(
  state: WorkflowState,
  userMessage: string | null,
  language: string,
  phone?: string,
  pushName?: string,
  instanceId?: string
): Promise<WorkflowExecutionResult> {
  const workflows = configStore.getWorkflows();
  const workflow = workflows.workflows.find(w => w.id === state.workflowId);

  if (!workflow) {
    return {
      response: 'Workflow not found. Please contact support.',
      newState: null
    };
  }

  // ─── Node-Based Workflow Dispatch ──────────────────────────────────
  const hybridWorkflow = workflow as unknown as HybridWorkflowDefinition;
  if (state.isNodeBased || isNodeBasedWorkflow(hybridWorkflow)) {
    return executeNodeWorkflowStep(
      hybridWorkflow, state, userMessage, language, phone, pushName, instanceId
    );
  }

  // ─── Legacy Step-Based Execution (below) ──────────────────────────
  // Validate workflow structure: steps must be a non-empty array
  if (!Array.isArray(workflow.steps)) {
    console.error(`[WorkflowExecutor] Workflow "${state.workflowId}" has invalid steps property (not an array)`);
    notifyAdminConfigError(
      `Workflow "${state.workflowId}" has invalid structure: steps is not an array.\n\n` +
      `Please check workflows.json and ensure this workflow has a valid "steps" array.`
    );
    return {
      response: 'This service is temporarily unavailable. Our team has been notified. Please contact staff directly.',
      newState: null
    };
  }

  if (workflow.steps.length === 0) {
    console.error(`[WorkflowExecutor] Workflow "${state.workflowId}" has empty steps array`);
    notifyAdminConfigError(
      `Workflow "${state.workflowId}" has no steps defined (empty array).\n\n` +
      `Please add steps to this workflow in workflows.json.`
    );
    return {
      response: 'This service is temporarily unavailable. Our team has been notified. Please contact staff directly.',
      newState: null
    };
  }

  // Auto-correct out-of-bounds step index
  if (state.currentStepIndex < 0) {
    console.warn(`[WorkflowExecutor] Workflow "${state.workflowId}" had negative step index (${state.currentStepIndex}), resetting to 0`);
    state.currentStepIndex = 0;
  } else if (state.currentStepIndex > workflow.steps.length) {
    console.warn(`[WorkflowExecutor] Workflow "${state.workflowId}" had step index ${state.currentStepIndex} beyond bounds (max ${workflow.steps.length}), clamping`);
    state.currentStepIndex = workflow.steps.length;
  }

  // If user provided a message, store it for the previous step
  // BUT only if the previous step wasn't an evaluation step (eval steps don't collect data)
  if (userMessage && state.currentStepIndex > 0) {
    const previousStep = workflow.steps[state.currentStepIndex - 1];
    if (previousStep && !previousStep.evaluation) {
      state.collectedData[previousStep.id] = userMessage;
    }
  }

  // Check if we've completed all steps
  if (state.currentStepIndex >= workflow.steps.length) {
    // Workflow complete - prepare summary and forward
    const summary = buildConversationSummary(workflow, state);
    const adminPhone = configStore.getWorkflow().payment.forward_to || '+60127088789';

    const lastStep = workflow.steps[workflow.steps.length - 1];
    return {
      response: getStepMessage(lastStep, language),
      newState: null,
      shouldForward: true,
      conversationSummary: summary,
      workflowId: state.workflowId,
      stepId: lastStep.id
    };
  }

  const currentStep = workflow.steps[state.currentStepIndex];

  // ─── NEW: Evaluation Logic (Smart Workflows) ──────────────────────
  if (currentStep.evaluation) {
    // This is a silent step. We evaluate and jump, then RECURSE.
    console.log(`[WorkflowExecutor] Running evaluation step ${currentStep.id}...`);

    // We need history for context. Since we don't have seamless access to full DB history here,
    // we'll rely on what we have: userMessage (latest) + collectedData (previous workflow steps).
    // In a real implementation, we'd fetch full history.
    // For now, let's construct a "workflow context" string.

    const contextLines = [];
    for (const [key, val] of Object.entries(state.collectedData)) {
      contextLines.push(`Step ${key}: ${val}`);
    }
    const contextStr = contextLines.join('\n');

    // "History" for the evaluator will include the collected data as a system note
    // and the latest user message.
    const mockHistory: any[] = [
      { role: 'system', content: `Workflow Content So Far:\n${contextStr}` }
    ];

    try {
      const { evaluateWorkflowStep } = await import('./ai-client.js');
      const result = await evaluateWorkflowStep(
        currentStep.evaluation.prompt,
        mockHistory,
        userMessage || '(No new message)'
      );

      console.log(`[WorkflowExecutor] Evaluation "${currentStep.evaluation.prompt}" -> ${result}`);

      const nextStepId = currentStep.evaluation.outcomes[result] || currentStep.evaluation.defaultNextId;
      const nextStepIndex = workflow.steps.findIndex(s => s.id === nextStepId);

      if (nextStepIndex !== -1) {
        // Update state to jump
        const nextState = {
          ...state,
          currentStepIndex: nextStepIndex,
          lastUpdateAt: Date.now()
        };

        // RECURSE! Execute the target step immediately
        // Pass userMessage=null because we haven't "consumed" it yet if we're skipping
        // Wait... actually userMessage IS the current input. If we skip, we want the *next* step
        // to see it potentially? Or strictly distinct?
        // Let's assume evaluation steps are invisible. The user's input triggered the evaluation.
        // The NEXT step will be the "response" to that input.
        return executeWorkflowStep(nextState, null, language, phone, pushName, instanceId);
      } else {
        console.error(`[WorkflowExecutor] Evaluation target step ${nextStepId} not found!`);
      }
    } catch (err) {
      console.error('[WorkflowExecutor] Evaluation failed:', err);
    }

    // Fallback: just advance 1 step if evaluation fails
    // (This shouldn't happen if config is correct)
  }

  let response = getStepMessage(currentStep, language);

  // Enhance step if action present and phone available
  if (currentStep.action && phone && sendMessageFn) {
    const enhancerContext: WorkflowEnhancerContext = {
      workflowId: state.workflowId,
      stepId: currentStep.id,
      userInput: userMessage,
      collectedData: state.collectedData,
      language,
      phone,
      pushName: pushName || 'Guest',
      instanceId
    };

    try {
      const enhanced = await enhanceWorkflowStep(
        currentStep,
        enhancerContext,
        callAPIWrapper,
        sendMessageFn
      );

      response = enhanced.message; // Use enhanced message

      // Log metadata for debugging
      if (enhanced.metadata) {
        console.log(`[WorkflowExecutor] Step ${currentStep.id} metadata:`, enhanced.metadata);
      }
    } catch (error) {
      console.error(`[WorkflowExecutor] Failed to enhance step ${currentStep.id}:`, error);
      // Continue with original message on error (graceful degradation)
    }
  }

  // Update state
  const newState: WorkflowState = {
    ...state,
    lastUpdateAt: Date.now()
  };

  // If this step waits for reply, keep state as-is (will advance on next message)
  // If this step doesn't wait, advance to next step immediately
  if (!currentStep.waitForReply) {
    newState.currentStepIndex = state.currentStepIndex + 1;

    // If there's a next step that also doesn't wait, we need to chain them
    // For now, we'll let the caller handle this by checking the state
  } else {
    // Advance to next step (user will reply to this one)
    newState.currentStepIndex = state.currentStepIndex + 1;
  }

  return {
    response,
    newState,
    shouldForward: false,
    workflowId: state.workflowId,
    stepId: currentStep.id
  };
}

// ============================================================================
// Node-Based Workflow Executor (US-017)
// ============================================================================

async function executeNodeWorkflowStep(
  workflow: HybridWorkflowDefinition,
  state: WorkflowState,
  userMessage: string | null,
  language: string,
  phone?: string,
  pushName?: string,
  instanceId?: string
): Promise<WorkflowExecutionResult> {

  const nodes = workflow.nodes!;
  const nodeOutputs = state.nodeOutputs || {};

  // If we're resuming after a wait_reply, store the user's response
  if (userMessage && state.currentNodeId) {
    const currentNode = getNodeById(nodes, state.currentNodeId);
    if (currentNode?.type === 'wait_reply') {
      const config = currentNode.config as WaitReplyNodeConfig;
      state.collectedData[config.storeAs] = userMessage;
      // Advance to next node after wait_reply
      const nextId = getNextNodeId(currentNode);
      if (nextId) {
        state.currentNodeId = nextId;
      } else {
        // wait_reply was the last node — workflow complete
        return {
          response: '',
          newState: null,
          shouldForward: true,
          workflowId: state.workflowId,
        };
      }
    }
  }

  // Template context for variable resolution
  const templateCtx = {
    collectedData: state.collectedData,
    nodeOutputs,
    phone,
    pushName: pushName || 'Guest',
    language,
    adminPhone: '+60127088789',
  };

  // Walk the node graph until we hit a wait_reply or reach the end
  const responseParts: string[] = [];
  let safetyCounter = 0;
  const MAX_NODES = 50; // Prevent infinite loops

  while (state.currentNodeId && safetyCounter < MAX_NODES) {
    safetyCounter++;
    const node = getNodeById(nodes, state.currentNodeId);

    if (!node) {
      console.error(`[NodeExecutor] Node ${state.currentNodeId} not found in workflow ${workflow.id}`);
      break;
    }

    console.log(`[NodeExecutor] Executing node: ${node.id} (${node.type}) — ${node.label}`);

    switch (node.type) {
      case 'message': {
        const config = node.config as MessageNodeConfig;
        const msg = config.message;
        const text = (language === 'ms' && msg.ms) ? msg.ms : (language === 'zh' && msg.zh) ? msg.zh : msg.en;
        responseParts.push(resolveTemplateVars(text, templateCtx));

        // Advance to next node
        const nextId = getNextNodeId(node);
        state.currentNodeId = nextId;
        break;
      }

      case 'wait_reply': {
        const config = node.config as WaitReplyNodeConfig;
        // Send the prompt if present
        if (config.prompt) {
          const text = (language === 'ms' && config.prompt.ms)
            ? config.prompt.ms
            : (language === 'zh' && config.prompt.zh)
            ? config.prompt.zh
            : config.prompt.en;
          responseParts.push(resolveTemplateVars(text, templateCtx));
        }

        // PAUSE execution — wait for user reply
        // currentNodeId stays on this wait_reply node; next call will store the reply
        return {
          response: responseParts.join('\n\n'),
          newState: {
            ...state,
            nodeOutputs,
            isNodeBased: true,
            lastUpdateAt: Date.now(),
          },
          workflowId: state.workflowId,
          stepId: node.id,
        };
      }

      case 'whatsapp_send': {
        const config = node.config as WhatsAppSendNodeConfig;

        if (sendMessageFn && phone) {
          // Resolve receiver
          const receiver = resolveTemplateVars(config.receiver, templateCtx);

          // Resolve content
          let content: string;
          if (typeof config.content === 'string') {
            content = resolveTemplateVars(config.content, templateCtx);
          } else {
            const raw = (language === 'ms' && config.content.ms)
              ? config.content.ms
              : (language === 'zh' && config.content.zh)
              ? config.content.zh
              : config.content.en;
            content = resolveTemplateVars(raw, templateCtx);
          }

          try {
            await sendMessageFn(receiver, content, instanceId);
            console.log(`[NodeExecutor] WhatsApp sent to ${receiver}`);
            if (node.outputs) {
              nodeOutputs['whatsappSent'] = true;
              nodeOutputs['whatsappReceiver'] = receiver;
            }
          } catch (err) {
            console.error(`[NodeExecutor] WhatsApp send failed:`, err);
            // Follow error edge if available
            const errorNext = getNextNodeId(node, false);
            if (errorNext) {
              state.currentNodeId = errorNext;
              continue;
            }
          }
        }

        state.currentNodeId = getNextNodeId(node);
        break;
      }

      case 'pelangi_api': {
        const config = node.config as PelangiApiNodeConfig;

        try {
          // Use workflow enhancer context to call the API action
          const enhancerCtx: WorkflowEnhancerContext = {
            workflowId: state.workflowId,
            stepId: node.id,
            userInput: userMessage,
            collectedData: state.collectedData,
            language,
            phone: phone || '',
            pushName: pushName || 'Guest',
            instanceId,
          };

          // Build a synthetic step for the enhancer
          const syntheticStep: WorkflowStep = {
            id: node.id,
            message: { en: '', ms: '', zh: '' },
            waitForReply: false,
            action: { type: config.action, params: config.params },
          };

          const enhanced = await enhanceWorkflowStep(
            syntheticStep,
            enhancerCtx,
            callAPIWrapper,
            sendMessageFn!
          );

          // Store API outputs for downstream nodes
          if (enhanced.metadata) {
            for (const [key, value] of Object.entries(enhanced.metadata)) {
              nodeOutputs[key] = value;
              nodeOutputs[`pelangi.${key}`] = value;
            }
          }

          // Map node outputs
          if (node.outputs) {
            for (const [outputName, dataKey] of Object.entries(node.outputs)) {
              nodeOutputs[outputName] = nodeOutputs[dataKey] ?? enhanced.metadata?.[dataKey] ?? '';
            }
          }

          console.log(`[NodeExecutor] pelangi_api (${config.action}) completed, outputs:`, Object.keys(nodeOutputs));

          state.currentNodeId = getNextNodeId(node, true);
        } catch (err) {
          console.error(`[NodeExecutor] pelangi_api failed:`, err);
          nodeOutputs['apiError'] = err instanceof Error ? err.message : 'Unknown error';

          // Follow error edge if available
          const errorNext = getNextNodeId(node, false);
          state.currentNodeId = errorNext || getNextNodeId(node, true);
        }
        break;
      }

      case 'condition': {
        const config = node.config as ConditionNodeConfig;

        // Resolve the field value
        const fieldValue = resolveTemplateVars(config.field, templateCtx);

        // Evaluate condition
        let conditionMet = false;
        switch (config.operator) {
          case 'gt':
            conditionMet = parseFloat(fieldValue) > (config.value as number);
            break;
          case 'lt':
            conditionMet = parseFloat(fieldValue) < (config.value as number);
            break;
          case 'eq':
            conditionMet = fieldValue === String(config.value);
            break;
          case 'neq':
            conditionMet = fieldValue !== String(config.value);
            break;
          case 'exists':
            conditionMet = !!fieldValue && fieldValue !== '';
            break;
          case 'empty':
            conditionMet = !fieldValue || fieldValue === '';
            break;
        }

        console.log(`[NodeExecutor] Condition: ${config.field} ${config.operator} ${config.value} → ${conditionMet}`);

        state.currentNodeId = conditionMet ? config.trueNext : config.falseNext;
        break;
      }

      default:
        console.warn(`[NodeExecutor] Unknown node type: ${node.type}`);
        state.currentNodeId = getNextNodeId(node);
    }

    // If no next node, workflow is complete
    if (!state.currentNodeId) break;
  }

  if (safetyCounter >= MAX_NODES) {
    console.error(`[NodeExecutor] Safety limit reached (${MAX_NODES} nodes) in workflow ${workflow.id}`);
  }

  // Workflow complete
  return {
    response: responseParts.join('\n\n'),
    newState: null,
    shouldForward: true,
    workflowId: state.workflowId,
  };
}

export async function forwardWorkflowSummary(
  phone: string,
  pushName: string,
  workflow: WorkflowDefinition,
  state: WorkflowState,
  instanceId?: string
): Promise<void> {
  if (!sendMessageFn) {
    console.error('[WorkflowExecutor] SendMessage function not initialized');
    return;
  }

  const adminPhone = configStore.getWorkflow().payment.forward_to || '+60127088789';
  const summary = buildConversationSummary(workflow, state, phone, pushName);

  try {
    await sendMessageFn(adminPhone, summary, instanceId);
    console.log(`[WorkflowExecutor] Summary forwarded to ${adminPhone} for ${phone}`);
  } catch (err: any) {
    console.error(`[WorkflowExecutor] Failed to forward summary:`, err.message);
  }
}

function getStepMessage(step: WorkflowStep, language: string): string {
  // Support multi-language responses
  const messages = step.message;
  if (language === 'ms' && messages.ms) return messages.ms;
  if (language === 'zh' && messages.zh) return messages.zh;
  return messages.en;
}

function buildConversationSummary(
  workflow: WorkflowDefinition,
  state: WorkflowState,
  phone?: string,
  pushName?: string
): string {
  const lines: string[] = [];

  lines.push(`📋 *Workflow Summary: ${workflow.name}*`);
  lines.push('');

  if (phone) {
    lines.push(`👤 *Guest:* ${pushName || 'Unknown'}`);
    lines.push(`📱 *Phone:* ${phone}`);
    lines.push('');
  }

  lines.push(`🕐 *Started:* ${new Date(state.startedAt).toLocaleString()}`);
  lines.push(`⏱️ *Duration:* ${Math.round((state.lastUpdateAt - state.startedAt) / 1000)}s`);
  lines.push('');
  lines.push('*Collected Information:*');

  // Match steps with collected data
  workflow.steps.forEach((step, idx) => {
    const response = state.collectedData[step.id];
    if (response) {
      lines.push(`${idx + 1}. ${step.message.en}`);
      lines.push(`   ↳ _${response}_`);
    }
  });

  if (Object.keys(state.collectedData).length === 0) {
    lines.push('_(No responses collected)_');
  }

  lines.push('');
  lines.push('---');
  lines.push('🤖 _Generated by Rainbow AI Assistant_');

  return lines.join('\n');
}

export function hasAutoAdvanceSteps(workflow: WorkflowDefinition, fromIndex: number): boolean {
  // Check if there are consecutive steps that don't wait for reply
  for (let i = fromIndex; i < workflow.steps.length; i++) {
    if (workflow.steps[i].waitForReply) {
      return false;
    }
  }
  return true;
}
