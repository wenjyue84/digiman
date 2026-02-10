# Ollama Quick Start Guide

**Your hybrid setup is ready!** Here's how to use each approach:

---

## 🎯 Which Approach Should I Use?

```
┌─────────────────────────────────────────────────────────────┐
│ Use Case                    │ Best Approach                 │
├─────────────────────────────┼───────────────────────────────┤
│ Asking Claude Code          │ Automatic (CLI Skills) ✅     │
│ Using Claude Desktop        │ MCP Server                    │
│ Writing your own code       │ TypeScript Helper             │
└─────────────────────────────────────────────────────────────┘
```

---

## 1️⃣ For Claude Code Users (You!)

**Status:** ✅ Already working - nothing to do!

Claude Code automatically uses these skills when appropriate:
- **ollama-cloud**: For high-quality analysis (GPT-OSS, Minimax-M2, DeepSeek 671B, Qwen3-Coder)
- **deepseek-cli**: For unlimited local queries (privacy-first, no rate limits)

**Example:**
```
You: "Explain async/await in JavaScript"
Claude: [Automatically delegates to ollama-cloud skill]
        [Uses Minimax-M2 for tutorial-style explanation]
        [Returns comprehensive answer with examples]
```

**No configuration needed** - skills are already set up and ranked in MEMORY.md

---

## 2️⃣ For Claude Desktop Users

**Status:** ✅ Built, needs configuration

### Setup (One-Time)

**Step 1:** Add to `%APPDATA%\Claude\claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "ollama": {
      "command": "node",
      "args": ["C:\\Users\\Jyue\\Desktop\\Projects\\PelangiManager-Zeabur\\mcp-server\\dist\\ollama-mcp.js"]
    }
  }
}
```

**Step 2:** Restart Claude Desktop

**Step 3:** Test by asking: "What is 2+2?"

Claude will automatically use `ollama_quick_query` tool.

### 8 Tools Available

1. **ollama_quick_query** - Fastest (GPT-OSS 20B, ~3s)
2. **ollama_generate_code** - Code specialist (Qwen3-Coder 480B, ~17s)
3. **ollama_tutorial** - Comprehensive explanations (Minimax-M2, ~7s)
4. **ollama_deep_analysis** - Deepest reasoning (DeepSeek 671B, ~8s)
5. **ollama_balanced** - General purpose (GPT-OSS 120B, ~6s)
6. **ollama_local_unlimited** - Privacy-first, unlimited (DeepSeek 6.7B, ~8-10s)
7. **ollama_list_models** - List all available models
8. **ollama_custom** - Query any model by name

---

## 3️⃣ For Developers (Writing Code)

**Status:** ✅ Ready to use

### Installation

Already installed! Just import and use:

```typescript
import { quickQuery, generateCode, getTutorial, deepAnalysis, localQuery } from './lib/ollama-api';
```

### Quick Examples

**Fast Question (3s):**
```typescript
const answer = await quickQuery("What is the capital of France?");
console.log(answer); // "Paris"
```

**Generate Code (17s):**
```typescript
const code = await generateCode("Write a React hook for debouncing");
console.log(code); // Complete TypeScript implementation
```

**Get Tutorial (7s):**
```typescript
const tutorial = await getTutorial("Explain promises in JavaScript");
console.log(tutorial.response); // Comprehensive tutorial
console.log(tutorial.thinking);  // Chain-of-thought reasoning
```

**Deep Analysis (8s):**
```typescript
const analysis = await deepAnalysis("Compare microservices vs monolith");
console.log(analysis.response); // Detailed comparison
```

**Local/Private (8-10s, unlimited):**
```typescript
const local = await localQuery("Explain closures");
console.log(local); // 100% offline, no rate limits
```

### Advanced Usage

**Streaming Responses:**
```typescript
import { ollama, CloudModels } from './lib/ollama-api';

for await (const chunk of ollama.generateStream(CloudModels.GPT_OSS_20B, "Count 1 to 5")) {
  process.stdout.write(chunk.response);
}
```

**Custom Options:**
```typescript
const result = await ollama.generate(CloudModels.GPT_OSS_20B, "Be creative!", {
  options: {
    temperature: 0.9,
    top_p: 0.95,
    num_predict: 100,
  },
});
```

**List Models:**
```typescript
const cloudModels = await ollama.getModelsByType('cloud');
const localModels = await ollama.getModelsByType('local');
console.log('Cloud:', cloudModels.map(m => m.name));
console.log('Local:', localModels.map(m => m.name));
```

**Health Check:**
```typescript
const isRunning = await ollama.isRunning();
if (!isRunning) {
  console.error('Ollama is not running! Start with: ollama serve');
}
```

### Run All Examples

```bash
npx tsx lib/ollama-api-example.ts
```

Expected output: 10 comprehensive examples showing all features

---

## 🔧 Troubleshooting

### "Connection refused" or "ECONNREFUSED"

**Problem:** Ollama service not running

**Solution:**
```bash
ollama serve
```

Leave this running in a terminal.

### "Model not found" or "404"

**Problem:** Model not pulled locally

**Solution:**
```bash
# Pull the model you need
ollama pull gpt-oss:20b-cloud
ollama pull deepseek-coder:6.7b
```

### "Slow first query"

**Normal!** First query loads model into VRAM (~20-25s cold start)

Subsequent queries are faster (~8-10s warm)

### MCP tools not showing in Claude Desktop

**Check:**
1. Path in `claude_desktop_config.json` is correct (double backslashes)
2. MCP server is built (`mcp-server/dist/ollama-mcp.js` exists)
3. Claude Desktop was restarted after configuration

---

## 📊 Performance Guide

| Model | Speed | Quality | Best For |
|-------|-------|---------|----------|
| **GPT-OSS 20B** | ⚡ 3s | ⭐⭐⭐⭐ | Quick questions, speed-critical |
| **GPT-OSS 120B** | 6s | ⭐⭐⭐⭐⭐ | General purpose, balanced |
| **Minimax-M2** | 7s | ⭐⭐⭐⭐⭐ | Tutorials, learning, explanations |
| **DeepSeek 671B** | 8s | ⭐⭐⭐⭐⭐ | Deep analysis, complex reasoning |
| **Qwen3-Coder 480B** | 17s | ⭐⭐⭐⭐⭐ | Code generation, TypeScript |
| **DeepSeek 6.7B (local)** | 8-10s | ⭐⭐⭐⭐ | **Unlimited**, privacy, offline |

---

## 🎓 Full Documentation

- **Hybrid Setup:** See `OLLAMA-HYBRID-SETUP.md` for complete architecture
- **MCP Server:** See `mcp-server/OLLAMA-MCP-README.md` for MCP details
- **CLI Skills:** See `.claude/skills/ollama-cloud/SKILL.md`
- **Examples:** See `lib/ollama-api-example.ts` for 10 usage patterns

---

## ✅ Verified Working

All three approaches have been tested and verified:

- [x] CLI Skills: ✅ Working (automatic delegation)
- [x] MCP Server: ✅ Built and ready to configure
- [x] TypeScript Helper: ✅ Tested (all 10 examples passing)

**Choose the approach that fits your current task and start using!**
