import dotenv from 'dotenv';
dotenv.config();

const API_KEY = process.env.NVIDIA_API_KEY;

console.log('Testing NVIDIA API with Node fetch...\n');

const startTime = Date.now();
try {
  const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`
    },
    body: JSON.stringify({
      model: 'moonshotai/kimi-k2.5',
      messages: [{ role: 'user', content: 'Say OK' }],
      max_tokens: 100,
      temperature: 0.6
    }),
    signal: AbortSignal.timeout(60000)
  });

  const elapsed = Date.now() - startTime;
  console.log(`✅ Response received in ${elapsed}ms`);
  console.log(`Status: ${response.status}`);

  const data = await response.json();
  console.log(`Reply: ${data.choices?.[0]?.message?.content}`);
  console.log(`\nFull response:`, JSON.stringify(data, null, 2));
} catch (error) {
  const elapsed = Date.now() - startTime;
  console.error(`❌ Error after ${elapsed}ms:`, error.message);
}
