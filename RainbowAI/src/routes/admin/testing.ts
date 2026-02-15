import { Router } from 'express';
import type { Request, Response } from 'express';
import { spawn } from 'child_process';
import path from 'path';
import axios from 'axios';
import { configStore } from '../../assistant/config-store.js';
import { isAIAvailable, classifyAndRespond, testProvider } from '../../assistant/ai-client.js';
import { buildSystemPrompt, guessTopicFiles } from '../../assistant/knowledge-base.js';
import { ok, badRequest, notFound, serverError } from './http-utils.js';
import previewRouter from './testing-preview.js';

const router = Router();

// Mount preview chat routes (extracted for maintainability)
router.use(previewRouter);

// ─── Intent Test ─────────────────────────────────────────────────────

router.post('/intents/test', async (req: Request, res: Response) => {
  const { message } = req.body;
  if (!message || typeof message !== 'string') {
    badRequest(res, 'message (string) required');
    return;
  }
  try {
    const { classifyMessage } = await import('../../assistant/intents.js');
    const intentResult = await classifyMessage(message, []);

    const routingConfig = configStore.getRouting() || {};
    const route = routingConfig[intentResult.category];
    const routedAction: string = route?.action || 'llm_reply';

    let response = '';
    if (routedAction === 'static_reply') {
      const { getStaticReply } = await import('../../assistant/knowledge.js');
      response = getStaticReply(intentResult.category, 'en') || '(no static reply configured)';
    } else if (isAIAvailable()) {
      const systemPrompt = buildSystemPrompt(configStore.getSettings().system_prompt);
      const aiResult = await classifyAndRespond(systemPrompt, [], message);
      response = aiResult.response;
    }

    res.json({
      intent: intentResult.category,
      source: intentResult.source,
      action: routedAction,
      confidence: intentResult.confidence,
      response,
      matchedKeyword: intentResult.matchedKeyword,
      matchedExample: intentResult.matchedExample,
      detectedLanguage: intentResult.detectedLanguage
    });
  } catch (err: any) {
    serverError(res, err);
  }
});

// ─── Test AI Provider (dynamic) ──────────────────────────────────────

router.post('/test-ai/:provider', async (req: Request, res: Response) => {
  const providerId = req.params.provider;
  try {
    const result = await testProvider(providerId);
    res.json(result);
  } catch (e: any) {
    res.json({ ok: false, error: e.message });
  }
});

// ─── Troubleshoot AI provider (Missing key / connection) ───────────────

router.post('/troubleshoot-provider', async (req: Request, res: Response) => {
  const { providerId } = req.body;
  if (!providerId || typeof providerId !== 'string') {
    badRequest(res, 'providerId required');
    return;
  }
  const settings = configStore.getSettings();
  const provider = settings.ai?.providers?.find((p: { id: string }) => p.id === providerId);
  if (!provider) {
    notFound(res, `Provider "${providerId}"`);
    return;
  }

  if (provider.type === 'ollama') {
    const base = (provider.base_url || '').replace(/\/$/, '');
    const url = base ? `${base}/api/version` : 'http://localhost:11434/api/version';
    try {
      const r = await axios.get(url, { timeout: 5000, validateStatus: () => true });
      if (r.status === 200) {
        const version = (r.data && r.data.version) ? r.data.version : 'unknown';
        res.json({
          ok: true,
          message: 'Ollama is running. No API key needed — refresh the page to see Ready.',
          reachable: true,
          version,
          hint: 'If you still see "Missing Key", refresh the Settings tab.'
        });
      } else {
        res.json({
          ok: false,
          message: `Ollama returned ${r.status} at ${url}`,
          reachable: false,
          hint: 'Check Base URL in Edit provider.'
        });
      }
    } catch (err: any) {
      const msg = err.code === 'ECONNREFUSED'
        ? `Cannot reach Ollama at ${url}. Is Ollama running?`
        : (err.message || 'Connection failed');
      res.json({
        ok: false,
        message: msg,
        reachable: false,
        hint: 'Start Ollama (e.g. ollama serve) or fix Base URL.'
      });
    }
    return;
  }

  // Non-Ollama: need API key
  const hasKey = !!(provider.api_key || (provider.api_key_env && process.env[provider.api_key_env]));
  if (hasKey) {
    res.json({
      ok: true,
      message: 'API key is set. If you still see issues, run Test next to the provider.',
      reachable: null
    });
    return;
  }
  const hint = provider.api_key_env
    ? `Set ${provider.api_key_env} in .env or environment.`
    : 'Add API key in Edit provider.';
  res.json({
    ok: false,
    message: 'Missing API key',
    hint,
    reachable: null
  });
});

// ─── Workflow Testing (Send Real Message) ────────────────────────────

router.post('/test-workflow/send-summary', async (req: Request, res: Response) => {
  const { workflowId, collectedData, phone } = req.body;
  if (!workflowId || !phone) {
    badRequest(res, 'workflowId and phone required');
    return;
  }

  try {
    const workflows = configStore.getWorkflows();
    const workflow = workflows.workflows.find(w => w.id === workflowId);
    if (!workflow) {
      notFound(res, `Workflow "${workflowId}"`);
      return;
    }

    const lines: string[] = [];
    lines.push(`📋 *Workflow Test Summary: ${workflow.name}*`);
    lines.push('');
    lines.push(`🧪 *Test Mode*`);
    lines.push(`📱 *Admin Phone:* ${phone}`);
    lines.push('');
    lines.push('*Collected Test Responses:*');

    Object.entries(collectedData).forEach(([stepId, response], idx) => {
      const step = workflow.steps.find(s => s.id === stepId);
      if (step) {
        lines.push(`${idx + 1}. ${step.message.en}`);
        lines.push(`   ↳ _${response}_`);
      }
    });

    lines.push('');
    lines.push('---');
    lines.push('🧪 _Test executed via Workflow Tester_');
    lines.push('🤖 _Generated by Rainbow AI Assistant_');

    const summary = lines.join('\n');

    const { sendWhatsAppMessage } = await import('../../lib/baileys-client.js');
    await sendWhatsAppMessage(phone, summary);
    console.log(`[Admin] Workflow test summary sent to ${phone}`);

    ok(res, { message: 'Summary sent successfully', summary });
  } catch (err: any) {
    console.error('[Admin] Failed to send workflow test summary:', err);
    serverError(res, err);
  }
});

// ─── Test Runner ─────────────────────────────────────────────────────

router.post('/tests/run', async (_req: Request, res: Response) => {
  const projectArg = (_req.body?.project as string) || 'unit';
  const allowed = ['unit', 'integration', 'semantic'];
  if (!allowed.includes(projectArg)) {
    badRequest(res, `Invalid project: ${projectArg}. Allowed: ${allowed.join(', ')}`);
    return;
  }

  const mcpRoot = path.resolve(process.cwd());
  const npxPath = process.platform === 'win32' ? 'npx.cmd' : 'npx';

  try {
    // Vitest config has no named projects; only pass --project for integration/semantic when workspace is used
    const args = projectArg === 'unit'
      ? ['vitest', 'run', '--reporter=json']
      : ['vitest', 'run', '--project', projectArg, '--reporter=json'];
    const result = await new Promise<{ stdout: string; stderr: string; code: number }>((resolve) => {
      let stdout = '';
      let stderr = '';
      const child = spawn(npxPath, args, {
        cwd: mcpRoot,
        env: { ...process.env, FORCE_COLOR: '0' },
        shell: true,
        timeout: 120_000,
      });
      child.stdout.on('data', (d: Buffer) => { stdout += d.toString(); });
      child.stderr.on('data', (d: Buffer) => { stderr += d.toString(); });
      child.on('close', (code) => resolve({ stdout, stderr, code: code ?? 1 }));
      child.on('error', (err) => resolve({ stdout, stderr: err.message, code: 1 }));
    });

    let parsed: any = null;
    try {
      const jsonStart = result.stdout.indexOf('{');
      if (jsonStart >= 0) {
        parsed = JSON.parse(result.stdout.slice(jsonStart));
      }
    } catch { /* non-JSON output, return raw */ }

    if (parsed) {
      const testFiles = (parsed.testResults || []).map((f: any) => ({
        file: path.basename(f.name || ''),
        status: f.status,
        tests: (f.assertionResults || []).map((t: any) => ({
          name: t.fullName || t.title,
          status: t.status,
          duration: t.duration,
          failureMessages: t.failureMessages,
        })),
        duration: f.endTime - f.startTime,
      }));

      res.json({
        success: parsed.success ?? (result.code === 0),
        numTotalTests: parsed.numTotalTests ?? 0,
        numPassedTests: parsed.numPassedTests ?? 0,
        numFailedTests: parsed.numFailedTests ?? 0,
        numTotalTestSuites: parsed.numTotalTestSuites ?? 0,
        numPassedTestSuites: parsed.numPassedTestSuites ?? 0,
        numFailedTestSuites: parsed.numFailedTestSuites ?? 0,
        startTime: parsed.startTime,
        duration: Date.now() - (parsed.startTime || Date.now()),
        testFiles,
        project: projectArg,
      });
    } else {
      res.json({
        success: result.code === 0,
        numTotalTests: 0,
        numPassedTests: 0,
        numFailedTests: 0,
        numPassedTestSuites: 0,
        testFiles: [],
        raw: result.stdout.slice(0, 5000),
        stderr: result.stderr.slice(0, 2000),
        project: projectArg,
      });
    }
  } catch (err: any) {
    serverError(res, err);
  }
});

// ─── Test Coverage Runner ────────────────────────────────────────────

router.post('/tests/coverage', async (_req: Request, res: Response) => {
  const mcpRoot = path.resolve(process.cwd());
  const npxPath = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  const coverageArgs = ['vitest', 'run', '--coverage', '--reporter=json'];

  try {
    const result = await new Promise<{ stdout: string; stderr: string; code: number }>((resolve) => {
      let stdout = '';
      let stderr = '';
      const child = spawn(npxPath, coverageArgs, {
        cwd: mcpRoot,
        env: { ...process.env, FORCE_COLOR: '0' },
        shell: true,
        timeout: 120_000,
      });
      child.stdout.on('data', (d: Buffer) => { stdout += d.toString(); });
      child.stderr.on('data', (d: Buffer) => { stderr += d.toString(); });
      child.on('close', (code) => resolve({ stdout, stderr, code: code ?? 1 }));
      child.on('error', (err) => resolve({ stdout, stderr: err.message, code: 1 }));
    });

    const coverageLines = result.stderr.split('\n').filter(l => l.includes('|') && !l.includes('---'));
    const coverage: { file: string; stmts: string; branch: string; funcs: string; lines: string }[] = [];
    for (const line of coverageLines) {
      const parts = line.split('|').map(p => p.trim()).filter(Boolean);
      if (parts.length >= 5 && parts[0] !== 'File') {
        coverage.push({ file: parts[0], stmts: parts[1], branch: parts[2], funcs: parts[3], lines: parts[4] });
      }
    }

    res.json({
      success: result.code === 0,
      coverage,
      raw: result.stderr.slice(0, 5000),
    });
  } catch (err: any) {
    serverError(res, err);
  }
});

// ─── Register Test Results (for CLI scripts) ─────────────────────────

router.post('/tests/register-result', async (req: Request, res: Response) => {
  try {
    const { filename, timestamp, total, passed, warnings, failed, duration } = req.body;

    // Validate required fields
    if (!filename || !timestamp || total === undefined) {
      badRequest(res, 'Missing required fields: filename, timestamp, total');
      return;
    }

    // Generate unique ID from timestamp
    const id = `imported-${new Date(timestamp).getTime()}`;

    // Create imported report entry
    const reportEntry = {
      id,
      filename,
      timestamp,
      total: Number(total),
      passed: Number(passed || 0),
      warnings: Number(warnings || 0),
      failed: Number(failed || 0),
      duration: Number(duration || 0),
      isImported: true
    };

    res.json({
      success: true,
      report: reportEntry,
      message: 'Test result registered successfully. Open the dashboard to see it in Test History.'
    });
  } catch (err: any) {
    serverError(res, err);
  }
});

// ─── Scan Reports Directory ──────────────────────────────────────────

import fs from 'fs';
import { promisify } from 'util';

const readdir = promisify(fs.readdir);
const readFile = promisify(fs.readFile);
const stat = promisify(fs.stat);

router.get('/tests/scan-reports', async (_req: Request, res: Response) => {
  try {
    const reportsDir = path.join(process.cwd(), 'src/public/reports/autotest');

    // Check if directory exists
    if (!fs.existsSync(reportsDir)) {
      res.json({ reports: [] });
      return;
    }

    const files = await readdir(reportsDir);
    const htmlFiles = files.filter(f => f.endsWith('.html'));

    const reports = await Promise.all(
      htmlFiles.map(async (filename) => {
        try {
          const filePath = path.join(reportsDir, filename);
          const stats = await stat(filePath);
          const content = await readFile(filePath, 'utf-8');

          // Parse report metadata from HTML
          const passedMatch = content.match(/<div class="num" style="color:#16a34a">(\d+)<\/div><div class="label">Passed<\/div>/);
          const warnedMatch = content.match(/<div class="num" style="color:#ca8a04">(\d+)<\/div><div class="label">Warnings<\/div>/);
          const failedMatch = content.match(/<div class="num" style="color:#dc2626">(\d+)<\/div><div class="label">Failed<\/div>/);
          const totalMatch = content.match(/<div class="num" style="color:#333">(\d+)<\/div><div class="label">Total<\/div>/);
          const durationMatch = content.match(/<div class="num" style="color:#6366f1">([0-9.]+)s<\/div><div class="label">Duration<\/div>/);

          return {
            id: `imported-${stats.mtimeMs}`,
            filename,
            timestamp: stats.mtime.toISOString(),
            total: totalMatch ? parseInt(totalMatch[1]) : 0,
            passed: passedMatch ? parseInt(passedMatch[1]) : 0,
            warnings: warnedMatch ? parseInt(warnedMatch[1]) : 0,
            failed: failedMatch ? parseInt(failedMatch[1]) : 0,
            duration: durationMatch ? parseFloat(durationMatch[1]) * 1000 : 0,
            isImported: true
          };
        } catch (err) {
          console.error(`Error parsing report ${filename}:`, err);
          return null;
        }
      })
    );

    // Filter out nulls and sort by timestamp desc
    const validReports = reports
      .filter(r => r !== null)
      .sort((a, b) => new Date(b!.timestamp).getTime() - new Date(a!.timestamp).getTime());

    res.json({ reports: validReports });
  } catch (err: any) {
    serverError(res, err);
  }
});

export default router;
