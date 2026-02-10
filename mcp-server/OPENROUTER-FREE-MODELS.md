# OpenRouter Free Models Setup

## API Key Added ✅
The OpenRouter API key has been added to `.env`:
```
OPENROUTER_API_KEY=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
```

## How to Add Free Models

### Option 1: Via Web UI (Recommended)
1. Start the server: `npm run dev`
2. Open `http://localhost:3002/admin/rainbow/settings`
3. Click **"+ Add Provider"** for each model below

### Option 2: After Server Starts
Once the server has started and created `rainbow-data/settings.json`, run:
```bash
node add-openrouter-providers.js
```

---

## 5 Free OpenRouter Models to Add

### 1. **Qwen 2.5 32B** (Fastest, Best Multilingual)
- **ID:** `openrouter-qwen-32b`
- **Name:** `Qwen 2.5 32B (Free)`
- **Type:** `openai-compatible`
- **Base URL:** `https://openrouter.ai/api/v1`
- **Model:** `qwen/qwen-2.5-32b-instruct`
- **API Key Env:** `OPENROUTER_API_KEY`
- **Description:** Alibaba's Qwen 2.5 32B - Strong reasoning, multilingual support, free tier
- **✅ Enabled**

---

### 2. **Google Gemma 2 9B** (Efficient, Instruction-Tuned)
- **ID:** `openrouter-gemma-9b`
- **Name:** `Google Gemma 2 9B (Free)`
- **Type:** `openai-compatible`
- **Base URL:** `https://openrouter.ai/api/v1`
- **Model:** `google/gemma-2-9b-it:free`
- **API Key Env:** `OPENROUTER_API_KEY`
- **Description:** Google's Gemma 2 9B IT - Efficient, instruction-tuned, free tier
- **✅ Enabled**

---

### 3. **Meta Llama 3.1 8B** (Fast, Capable)
- **ID:** `openrouter-llama-8b`
- **Name:** `Meta Llama 3.1 8B (Free)`
- **Type:** `openai-compatible`
- **Base URL:** `https://openrouter.ai/api/v1`
- **Model:** `meta-llama/llama-3.1-8b-instruct:free`
- **API Key Env:** `OPENROUTER_API_KEY`
- **Description:** Meta's Llama 3.1 8B - Fast, capable, free tier
- **✅ Enabled**

---

### 4. **Mistral 7B** (High Quality, Efficient)
- **ID:** `openrouter-mistral-7b`
- **Name:** `Mistral 7B (Free)`
- **Type:** `openai-compatible`
- **Base URL:** `https://openrouter.ai/api/v1`
- **Model:** `mistralai/mistral-7b-instruct:free`
- **API Key Env:** `OPENROUTER_API_KEY`
- **Description:** Mistral AI's 7B model - Efficient, high quality, free tier
- **✅ Enabled**

---

### 5. **Microsoft Phi-3 Medium** (Compact, Powerful)
- **ID:** `openrouter-phi-3`
- **Name:** `Microsoft Phi-3 Medium (Free)`
- **Type:** `openai-compatible`
- **Base URL:** `https://openrouter.ai/api/v1`
- **Model:** `microsoft/phi-3-medium-128k-instruct:free`
- **API Key Env:** `OPENROUTER_API_KEY`
- **Description:** Microsoft Phi-3 Medium - Compact but powerful, free tier
- **✅ Enabled**

---

## Model Recommendations

### For Multilingual Chat (EN/MS/ZH):
**🥇 Qwen 2.5 32B** - Best multilingual support

### For Fast Responses:
**🥈 Llama 3.1 8B** or **Mistral 7B** - Both very fast

### For Reasoning:
**🥉 Qwen 2.5 32B** or **Gemma 2 9B** - Strong instruction following

### For Long Context:
**🏆 Phi-3 Medium** - 128K context window

---

## Testing

After adding the models:
1. The page will auto-test all providers on load
2. **Only error messages will be shown** (no success toasts)
3. Response times appear on each Test button
4. Click ⭐ to set any model as default

## Notes

- All models use the same OpenRouter API key
- Free tier has rate limits (check openrouter.ai for details)
- Models are already sorted by recommendation (Qwen at top)
- Use the "Test" button to verify each model works
