import dotenv from 'dotenv';
import https from 'https';
dotenv.config();

const API_KEY = process.env.NVIDIA_API_KEY;

console.log('Testing with custom HTTPS agent...\n');

const agent = new https.Agent({
  keepAlive: false,
  timeout: 60000
});

const startTime = Date.now();
try {
  const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`,
      'Connection': 'close'
    },
    body: JSON.stringify({
      model: 'moonshotai/kimi-k2.5',
      messages: [{ role: 'user', content: 'Say OK' }],
      max_tokens: 100,
      temperature: 0.6
    }),
    agent,
    signal: AbortSignal.timeout(60000)
  });

  const elapsed = Date.now() - startTime;
  console.log(`✅ Response in ${elapsed}ms - Status: ${response.status}`);

  const data = await response.json();
  console.log(`Reply: "${data.choices?.[0]?.message?.content?.trim()}"`);
} catch (error) {
  const elapsed = Date.now() - startTime;
  console.error(`❌ Error after ${elapsed}ms: ${error.message}`);
  console.error('\n🔧 Possible fixes:');
  console.error('1. Check if you have a corporate proxy/firewall');
  console.error('2. Try: npm config set proxy null');
  console.error('3. Try: npm config set https-proxy null');
  console.error('4. Check Windows Firewall settings');
}
