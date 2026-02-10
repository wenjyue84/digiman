/**
 * Drill test: Checkout Alert WhatsApp Message
 * Tests the full flow: pick a guest → build message → send via WhatsApp
 */
const { neon } = require('@neondatabase/serverless');

const DB_URL = 'postgresql://neondb_owner:npg_FgfSkr3b5tiT@ep-ancient-forest-aeh28zhu-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require';
const MCP_URL = 'http://localhost:3001';
const TARGET_PHONE = '60127088789';

function buildCheckoutAlertMessage(guest) {
  const name = guest.name || 'Unknown';
  const capsule = guest.capsule_number || '?';
  const checkoutRaw = guest.expected_checkout_date;

  let checkoutFormatted = 'Not set';
  if (checkoutRaw) {
    const d = new Date(checkoutRaw);
    checkoutFormatted = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  }

  const isPaid = guest.is_paid;
  const amount = guest.payment_amount || '0';
  const paymentStatus = isPaid
    ? '\u2705 Paid'
    : `\u274C Outstanding RM${amount}`;

  // Calculate days until checkout
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const checkout = checkoutRaw ? new Date(checkoutRaw) : null;
  let urgency = '';
  if (checkout) {
    const diffDays = Math.ceil((checkout - today) / (1000 * 60 * 60 * 24));
    if (diffDays <= 0) urgency = '\u26A0\uFE0F *CHECKOUT OVERDUE*';
    else if (diffDays === 1) urgency = '\u23F0 Checkout is *TOMORROW*';
    else urgency = `\uD83D\uDCC5 Checkout in ${diffDays} days`;
  }

  return [
    '\uD83D\uDD14 *CHECKOUT REMINDER* \uD83D\uDD14',
    '',
    `\uD83D\uDC64 *Guest:* ${name}`,
    `\uD83D\uDECF\uFE0F *Capsule:* ${capsule}`,
    `\uD83D\uDCC5 *Expected Checkout:* ${checkoutFormatted}`,
    `\uD83D\uDCB0 *Payment Status:* ${paymentStatus}`,
    '',
    urgency,
    '',
    '\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500',
    '\uD83D\uDCCB *Action required:* Follow up with guest on checkout',
    '',
    `_\uD83E\uDD16 Sent by PelangiManager Alert System_`,
    `_\uD83D\uDD52 ${new Date().toLocaleString('en-MY', { timeZone: 'Asia/Kuala_Lumpur' })}_`
  ].join('\n');
}

async function sendViaMCP(phone, message) {
  // Use MCP server's tool endpoint via HTTP POST to /mcp
  // But simpler: call the MCP server's internal WhatsApp function via a direct HTTP call
  // The MCP server exposes tools via SSE/JSON-RPC, so let's use a simpler approach:
  // Call the baileys REST-like endpoint if available, or use fetch to MCP tool call

  const response = await fetch(`${MCP_URL}/mcp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: {
        name: 'pelangi_whatsapp_send',
        arguments: {
          phone: phone,
          message: message
        }
      }
    })
  });

  const result = await response.json();
  return result;
}

async function main() {
  console.log('\uD83E\uDDEA DRILL TEST: Checkout Alert WhatsApp Message');
  console.log('='.repeat(50));

  // Step 1: Get a checked-in guest
  const sql = neon(DB_URL);
  const guests = await sql`SELECT id, name, capsule_number, expected_checkout_date, is_paid, payment_amount, alert_settings FROM guests WHERE is_checked_in = true ORDER BY expected_checkout_date ASC LIMIT 3`;

  if (guests.length === 0) {
    console.log('\u274C No checked-in guests found!');
    return;
  }

  console.log(`\n\uD83D\uDC65 Found ${guests.length} checked-in guests:`);
  guests.forEach(g => {
    const d = g.expected_checkout_date ? new Date(g.expected_checkout_date).toLocaleDateString() : 'N/A';
    console.log(`   \u2022 ${g.name} (${g.capsule_number}) - Checkout: ${d} - Paid: ${g.is_paid ? 'Yes' : 'No'}`);
  });

  // Pick the first guest (earliest checkout)
  const testGuest = guests[0];
  console.log(`\n\uD83C\uDFAF Selected: ${testGuest.name} (${testGuest.capsule_number})`);

  // Step 2: Build the message
  const message = buildCheckoutAlertMessage(testGuest);
  console.log('\n\uD83D\uDCE8 Message preview:');
  console.log('---');
  console.log(message);
  console.log('---');

  // Step 3: Check WhatsApp status
  console.log('\n\uD83D\uDCF1 Checking WhatsApp status...');
  const healthRes = await fetch(`${MCP_URL}/health`);
  const health = await healthRes.json();
  console.log(`   WhatsApp: ${health.whatsapp}`);

  if (health.whatsapp !== 'open') {
    console.log('\u274C WhatsApp not connected! Cannot send message.');
    return;
  }

  // Step 4: Send the message
  console.log(`\n\uD83D\uDE80 Sending to +${TARGET_PHONE}...`);
  try {
    const result = await sendViaMCP(TARGET_PHONE, message);
    console.log('\n\u2705 MCP Response:', JSON.stringify(result, null, 2));

    // Step 5: Update alert settings in DB to mark as sent
    const alertSettings = JSON.stringify({
      enabled: true,
      channels: ['whatsapp'],
      advanceNotice: [0, 1],
      lastNotified: new Date().toISOString()
    });
    await sql`UPDATE guests SET alert_settings = ${alertSettings} WHERE id = ${testGuest.id}`;
    console.log(`\n\uD83D\uDCBE Updated alert_settings for ${testGuest.name} with lastNotified timestamp`);

    console.log('\n\u2705 DRILL TEST COMPLETE! Check WhatsApp on +60127088789');
  } catch (err) {
    console.error('\n\u274C Send failed:', err.message);
  }
}

main().catch(console.error);
