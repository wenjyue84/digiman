# NVIDIA Kimi K2.5 Setup Guide

## 🔑 How to Get NVIDIA API Key (Free!)

1. **Visit NVIDIA NIM Platform:**
   - Go to: https://build.nvidia.com
   - Search for "Kimi K2.5" in the model catalog

2. **Access the Model Card:**
   - Click on "Kimi K2.5" model card
   - Navigate to the "Experience" or "API" tab
   - Click **"View Code"** or **"Get API Key"**

3. **Sign In (Required):**
   - Log in with your NVIDIA account (free registration)
   - No payment details needed
   - API key is generated automatically

4. **Copy Your API Key:**
   - The API key will look like: `nvapi-XXXXXXXXXXXX...`
   - Copy the full key (should be around 70 characters)

5. **Update Your .env File:**
   ```bash
   cd mcp-server
   nano .env  # or use your text editor
   ```

   Replace the existing `NVIDIA_API_KEY` line:
   ```env
   NVIDIA_API_KEY=nvapi-YOUR_NEW_KEY_HERE
   ```

6. **Restart the MCP Server:**
   ```bash
   cd mcp-server
   npm run dev
   ```

## ✅ Testing Your Setup

### Method 1: Test Button (Easiest)
1. Open: http://localhost:3002/admin/rainbow
2. Go to "Status" tab
3. Find "NVIDIA NIM (Kimi 2.5)" under AI Providers
4. Click the **"Test"** button
5. ✅ Success: You'll see a response with timing
6. ❌ Error: Check the error message for details

### Method 2: Direct API Test (Advanced)
```bash
curl -X POST https://integrate.api.nvidia.com/v1/chat/completions \
  -H "Authorization: Bearer YOUR_API_KEY_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "moonshotai/kimi-k2.5",
    "messages": [{"role": "user", "content": "Hello"}],
    "max_tokens": 50,
    "temperature": 0.6
  }'
```

**Expected Response:**
```json
{
  "id": "...",
  "choices": [{
    "message": {
      "role": "assistant",
      "content": "Hello! How can I help you today?"
    }
  }]
}
```

## 🔧 Configuration Details

### Current Settings (in `mcp-server/src/assistant/data/settings.json`)
```json
{
  "ai": {
    "nvidia_model": "moonshotai/kimi-k2.5",
    "nvidia_base_url": "https://integrate.api.nvidia.com/v1",
    "groq_model": "llama-3.3-70b-versatile",
    "max_classify_tokens": 200,
    "max_chat_tokens": 800,
    "classify_temperature": 0.1,
    "chat_temperature": 0.7
  }
}
```

### Environment Variables (in `mcp-server/.env`)
```env
# Primary AI Provider - NVIDIA NIM (Kimi K2.5)
NVIDIA_API_KEY=nvapi-YOUR_KEY_HERE

# Fallback AI Provider - Groq (Optional)
GROQ_API_KEY=gsk_YOUR_KEY_HERE
```

## 🚨 Troubleshooting

### Issue: "NVIDIA_API_KEY not set"
**Solution:** Check that `.env` file exists in `mcp-server/` directory and contains the key.

### Issue: "The operation was aborted due to timeout"
**Causes:**
1. **Invalid/Expired API Key** → Get a fresh key from https://build.nvidia.com
2. **NVIDIA API is Slow** → The timeout has been increased to 30 seconds
3. **Network Issues** → Check your internet connection

**Solutions:**
- Get a new API key (most common fix)
- Wait a few minutes and try again
- Check NVIDIA API status: https://status.nvidia.com

### Issue: "HTTP 401: Unauthorized"
**Solution:** Your API key is invalid or expired. Get a new one from https://build.nvidia.com

### Issue: "HTTP 429: Too Many Requests"
**Solution:** NVIDIA free tier has rate limits. Wait a few minutes or upgrade your account.

### Issue: Test button is disabled
**Solution:** The API key is not configured. Check the "Status" tab - it should show "NVIDIA_API_KEY not set".

## 📚 Additional Resources

- **NVIDIA NIM Platform:** https://build.nvidia.com
- **Kimi K2.5 Model Card:** https://build.nvidia.com/moonshotai/kimi-k2-5/modelcard
- **NVIDIA Developer Blog:** https://developer.nvidia.com/blog/build-with-kimi-k-2-5-multimodal-vlm-using-nvidia-gpu-accelerated-endpoints/
- **API Documentation:** Available in the "API" tab on the model card

## 🎯 Quick Reference

**Model Name:** `moonshotai/kimi-k2.5`
**API Endpoint:** `https://integrate.api.nvidia.com/v1/chat/completions`
**Context Window:** 256K tokens
**Max Output Tokens:** 16,384
**Free Tier:** Yes (no public rate limit info yet)
**Thinking Mode:** Set `temperature: 1` for chain-of-thought reasoning

## 🔄 After Getting New Key

1. Update `.env` with new key
2. Restart MCP server: `npm run dev`
3. Test in Rainbow Admin: http://localhost:3002/admin/rainbow
4. Click "Test" button under "NVIDIA NIM (Kimi 2.5)"
5. ✅ Should see: "✓ NVIDIA: moonshotai/kimi-k2.5 responded in ~XXXXms"
