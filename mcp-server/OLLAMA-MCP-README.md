# Ollama MCP Server

Exposes Ollama models (local + cloud) as MCP tools for Claude to use programmatically.

## Features

- **8 MCP Tools** for different use cases
- **5 Cloud Models** (GPT-OSS 20B/120B, Minimax-M2, DeepSeek-v3.1 671B, Qwen3-Coder 480B)
- **Local Models** (DeepSeek 6.7B unlimited, Gemma3 4B)
- **6x Faster** than CLI (0.5s vs 3s for simple queries)
- **Chain-of-thought** reasoning visible in responses
- **Privacy mode** with local unlimited queries

## Installation

```bash
cd mcp-server
npm install
npm run build
```

## Configuration

Add to your `claude_desktop_config.json`:

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

**Location:**
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`
- Mac: `~/Library/Application Support/Claude/claude_desktop_config.json`

## Available Tools

### 1. `ollama_quick_query` ⚡
**Speed:** ~3s
**Model:** GPT-OSS 20B (cloud)
**Use for:** Quick questions, simple tasks, when speed is critical

```json
{
  "prompt": "What is 2+2?"
}
```

### 2. `ollama_generate_code` 💻
**Speed:** ~17s
**Model:** Qwen3-Coder 480B (cloud)
**Use for:** Code generation, refactoring, TypeScript/JavaScript

```json
{
  "prompt": "Write a React hook for debouncing user input"
}
```

### 3. `ollama_tutorial` 📚
**Speed:** ~7s
**Model:** Minimax-M2 (cloud)
**Use for:** Comprehensive explanations, tutorials, learning

```json
{
  "prompt": "Explain async/await in JavaScript"
}
```

### 4. `ollama_deep_analysis` 🧠
**Speed:** ~8s
**Model:** DeepSeek-v3.1 671B (cloud)
**Use for:** Complex analysis, architecture decisions, deep reasoning

```json
{
  "prompt": "Compare REST vs GraphQL for a real-time app"
}
```

### 5. `ollama_balanced` ⚖️
**Speed:** ~6s
**Model:** GPT-OSS 120B (cloud)
**Use for:** General questions, balanced performance

```json
{
  "prompt": "Explain the differences between TCP and UDP"
}
```

### 6. `ollama_local_unlimited` 🔒
**Speed:** ~8-10s (warm)
**Model:** DeepSeek 6.7B (local)
**Use for:** Unlimited queries, privacy-sensitive work, no rate limits

```json
{
  "prompt": "Review this code for security issues"
}
```

### 7. `ollama_list_models` 📋
**Use for:** List all available cloud and local models

```json
{}
```

### 8. `ollama_custom` 🎯
**Use for:** Query any specific model by name

```json
{
  "model": "gpt-oss:20b-cloud",
  "prompt": "Your question here"
}
```

## Response Format

All tools return JSON with:

```json
{
  "response": "The model's answer",
  "thinking": "Chain-of-thought reasoning (cloud models only)",
  "duration_ms": 543,
  "tokens": 65,
  "model": "Model name"
}
```

## Usage Examples in Claude

Once configured, you can use these tools naturally in Claude:

**Example 1: Quick Query**
```
User: "What's the capital of France?"
Claude: [Uses ollama_quick_query] "Paris"
```

**Example 2: Code Generation**
```
User: "Create a TypeScript function to debounce input"
Claude: [Uses ollama_generate_code]
```

**Example 3: Tutorial**
```
User: "Teach me about promises in JavaScript"
Claude: [Uses ollama_tutorial] [Comprehensive explanation with examples]
```

**Example 4: Deep Analysis**
```
User: "Should I use microservices or monolith architecture?"
Claude: [Uses ollama_deep_analysis] [Detailed analysis with reasoning]
```

## Performance

| Tool | Model | Speed | Tokens/s | Quality |
|------|-------|-------|----------|---------|
| quick_query | GPT-OSS 20B | 3s | ~120 | ⭐⭐⭐⭐ |
| balanced | GPT-OSS 120B | 6s | ~100 | ⭐⭐⭐⭐⭐ |
| tutorial | Minimax-M2 | 7s | ~90 | ⭐⭐⭐⭐⭐ |
| deep_analysis | DeepSeek 671B | 8s | ~80 | ⭐⭐⭐⭐⭐ |
| generate_code | Qwen3 480B | 17s | ~40 | ⭐⭐⭐⭐⭐ |
| local_unlimited | DeepSeek 6.7B | 8-10s | ~70 | ⭐⭐⭐⭐ |

## Rate Limits

- **Cloud models**: Unknown limits (tested 10+ queries without issues)
- **Local models**: **UNLIMITED** (runs on your GPU)

**Recommendation:**
1. Use cloud models for quality (3-17s response times)
2. Fall back to local when cloud hits limits
3. Use local for privacy-sensitive work

## Troubleshooting

**Error: "Ollama API error: 503"**
- Model temporarily unavailable
- Try another model or wait a few seconds

**Error: "Connection refused"**
- Ollama service not running
- Start it: `ollama serve`

**Slow responses on first query**
- Normal! Models warm up on first use
- Subsequent queries are faster (cached in VRAM)

**No thinking field in response**
- Only cloud models show thinking
- Local models don't expose chain-of-thought

## Development

Build:
```bash
npm run build
```

Test locally:
```bash
node dist/ollama-mcp.js
```

## Architecture

```
Claude Desktop
    ↓ (MCP protocol)
Ollama MCP Server (this)
    ↓ (HTTP REST API)
Ollama Service (localhost:11434)
    ↓ (proxy for cloud models)
Ollama Cloud (https://ollama.com:443)
    → GPT-OSS 20B/120B
    → Minimax-M2
    → DeepSeek-v3.1 671B
    → Qwen3-Coder 480B
```

## License

MIT
