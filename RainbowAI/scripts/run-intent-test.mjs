/**
 * Quick Intent Accuracy Test Runner
 * Tests all scenarios and reports accuracy
 */

const API = 'http://localhost:3002/api/rainbow/intents/test';

const EXPECTED = {
  'greeting-en': 'greeting',
  'greeting-ms': 'greeting',
  'thanks': 'thanks',
  'contact-staff': 'contact_staff',
  'pricing': 'pricing',
  'availability': 'availability',
  'booking': 'booking',
  'directions': 'directions',
  'facilities': 'facilities_info',
  'rules': 'rules_policy',
  'rules-pets': 'rules_policy',
  'payment-info': 'payment_info',
  'payment-made': 'payment_made',
  'checkin-info': 'checkin_info',
  'checkout-info': 'checkout_info',
  'checkin-arrival': 'check_in_arrival',
  'lower-deck': 'lower_deck_preference',
  'wifi': 'wifi',
  'facility-orientation': 'facility_orientation',
  'climate-cold': 'climate_control_complaint',
  'climate-hot': 'climate_control_complaint',
  'noise-neighbors': 'noise_complaint',
  'noise-construction': 'noise_complaint',
  'noise-baby': 'contact_staff',  // Baby = unauthorized guest → escalate to operator
  'cleanliness-room': 'cleanliness_complaint',
  'cleanliness-bathroom': 'cleanliness_complaint',
  'facility-ac': ['facility_malfunction', 'climate_control_complaint'],
  'card-locked': 'card_locked',
  'theft-laptop': 'theft_report',
  'theft-jewelry': 'theft_report',
  'general-complaint': 'general_complaint_in_stay',
  'extra-towel': 'extra_amenity_request',
  'extra-pillow': 'extra_amenity_request',
  'tourist-guide': 'tourist_guide',
  'checkout-procedure': 'checkout_procedure',
  'late-checkout': 'late_checkout_request',
  'luggage-storage': 'luggage_storage',
  'billing': ['billing_inquiry', 'billing_dispute'],
  'forgot-charger': 'forgot_item_post_checkout',
  'forgot-passport': 'forgot_item_post_checkout',
  'forgot-clothes': 'forgot_item_post_checkout',
  // post-complaint-food removed: hostel doesn't serve food
  'post-complaint-service': 'post_checkout_complaint',
  'billing-dispute': 'billing_dispute',
  'billing-minor': 'billing_dispute',
  'review-positive': 'review_feedback',
  'review-negative': 'review_feedback',
  'chinese-greeting': 'greeting',
  'mixed-booking': 'booking',
  'chinese-bill': 'billing_dispute',
  'malay-wifi': 'wifi',
  'checkout-now-en': 'checkout_now',
  'checkout-now-ms': 'checkout_now',
  'checkout-now-zh': 'checkout_now',
};

const SCENARIOS = [
  { id: 'greeting-en', msg: 'Hi there!' },
  { id: 'greeting-ms', msg: 'Selamat pagi' },
  { id: 'thanks', msg: 'Thank you!' },
  { id: 'contact-staff', msg: 'I need to speak to staff' },
  { id: 'pricing', msg: 'How much is a room?' },
  { id: 'availability', msg: 'Do you have rooms on June 15th?' },
  { id: 'booking', msg: 'How do I book?' },
  { id: 'directions', msg: 'How do I get from the airport?' },
  { id: 'facilities', msg: 'What facilities do you have?' },
  { id: 'rules', msg: 'What are the rules?' },
  { id: 'rules-pets', msg: 'Are pets allowed?' },
  { id: 'payment-info', msg: 'What payment methods do you accept?' },
  { id: 'payment-made', msg: 'I already paid via bank transfer' },
  { id: 'checkin-info', msg: 'What time can I check in?' },
  { id: 'checkout-info', msg: 'When is checkout?' },
  { id: 'checkin-arrival', msg: 'I want to check in' },
  { id: 'lower-deck', msg: 'Can I get a lower deck?' },
  { id: 'wifi', msg: 'What is the WiFi password?' },
  { id: 'facility-orientation', msg: 'Where is the bathroom?' },
  { id: 'climate-cold', msg: 'My room is too cold!' },
  { id: 'climate-hot', msg: 'It is way too hot in here' },
  { id: 'noise-neighbors', msg: 'The people next door are too loud!' },
  { id: 'noise-construction', msg: 'There is construction noise outside' },
  { id: 'noise-baby', msg: 'A baby has been crying all night' },
  { id: 'cleanliness-room', msg: 'My room is dirty!' },
  { id: 'cleanliness-bathroom', msg: 'The bathroom smells terrible' },
  { id: 'facility-ac', msg: 'The AC is not working' },
  { id: 'card-locked', msg: 'My card is locked inside!' },
  { id: 'theft-laptop', msg: 'Someone stole my laptop!' },
  { id: 'theft-jewelry', msg: 'My jewelry is missing from the safe' },
  { id: 'general-complaint', msg: 'This service is terrible!' },
  { id: 'extra-towel', msg: 'Can I get more towels?' },
  { id: 'extra-pillow', msg: 'I need an extra pillow please' },
  { id: 'tourist-guide', msg: 'What attractions are nearby?' },
  { id: 'checkout-procedure', msg: 'How do I check out?' },
  { id: 'late-checkout', msg: 'Can I checkout at 3 PM?' },
  { id: 'luggage-storage', msg: 'Can I leave my bags after checkout?' },
  { id: 'billing', msg: 'There is an extra charge on my bill' },
  { id: 'forgot-charger', msg: 'I left my phone charger in the room' },
  { id: 'forgot-passport', msg: 'I think I left my passport behind!' },
  { id: 'forgot-clothes', msg: 'Left some clothes in the room' },
  // post-complaint-food removed: hostel doesn't serve food
  { id: 'post-complaint-service', msg: 'After checking out, I want to complain about poor service' },
  { id: 'billing-dispute', msg: 'I was overcharged by RM50' },
  { id: 'billing-minor', msg: 'Small discrepancy in my bill' },
  { id: 'review-positive', msg: 'Great experience! Highly recommend' },
  { id: 'review-negative', msg: 'Worst hotel ever. Terrible service.' },
  { id: 'chinese-greeting', msg: '你好' },
  { id: 'mixed-booking', msg: 'Boleh saya book satu room untuk dua malam?' },
  { id: 'chinese-bill', msg: '账单上多收了钱怎么办？' },
  { id: 'malay-wifi', msg: 'Apa password WiFi?' },
  { id: 'checkout-now-en', msg: 'I want to checkout' },
  { id: 'checkout-now-ms', msg: 'Saya nak checkout' },
  { id: 'checkout-now-zh', msg: '我要退房' },
];

async function testOne(scenario) {
  try {
    const r = await fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: scenario.msg }),
    });
    const data = await r.json();
    return { ...scenario, actual: data.intent, confidence: data.confidence, source: data.source, action: data.action, ok: true };
  } catch (e) {
    return { ...scenario, actual: null, error: e.message, ok: false };
  }
}

async function main() {
  console.log(`\n${'='.repeat(70)}`);
  console.log('  INTENT ACCURACY BASELINE TEST');
  console.log(`${'='.repeat(70)}\n`);
  console.log(`Testing ${SCENARIOS.length} scenarios...\n`);

  const start = Date.now();
  const results = [];
  let correct = 0, incorrect = 0, errors = 0;
  const failures = [];

  for (const s of SCENARIOS) {
    const r = await testOne(s);
    results.push(r);
    const expected = EXPECTED[s.id];

    const isMatch = Array.isArray(expected)
      ? expected.includes(r.actual)
      : r.actual === expected;

    if (!r.ok) {
      errors++;
      process.stdout.write(`  ERROR  ${s.id}\n`);
    } else if (isMatch) {
      correct++;
      process.stdout.write(`  PASS   ${s.id} -> ${r.actual} (${r.source}, ${(r.confidence * 100).toFixed(0)}%)\n`);
    } else {
      incorrect++;
      const expStr = Array.isArray(expected) ? expected.join('|') : expected;
      failures.push({ id: s.id, msg: s.msg, expected: expStr, actual: r.actual, source: r.source, confidence: r.confidence });
      process.stdout.write(`  FAIL   ${s.id}: expected=${expStr}, got=${r.actual} (${r.source}, ${(r.confidence * 100).toFixed(0)}%)\n`);
    }
  }

  const duration = Date.now() - start;
  const total = correct + incorrect;
  const accuracy = total > 0 ? ((correct / total) * 100).toFixed(1) : '0.0';

  console.log(`\n${'='.repeat(70)}`);
  console.log(`  RESULTS: ${accuracy}% accuracy (${correct}/${total} correct)`);
  console.log(`  Errors: ${errors} | Duration: ${(duration / 1000).toFixed(1)}s`);
  console.log(`${'='.repeat(70)}`);

  if (failures.length > 0) {
    console.log(`\n${'─'.repeat(70)}`);
    console.log('  FAILURES:');
    console.log(`${'─'.repeat(70)}`);
    for (const f of failures) {
      console.log(`  ${f.id}`);
      console.log(`    Message:  "${f.msg}"`);
      console.log(`    Expected: ${f.expected}`);
      console.log(`    Actual:   ${f.actual} (${f.source}, ${(f.confidence * 100).toFixed(0)}%)`);
      console.log();
    }
  }

  // Save results as JSON
  const report = { timestamp: new Date().toISOString(), accuracy: parseFloat(accuracy), correct, incorrect, errors, total, duration, results, failures };
  const fs = await import('fs');
  fs.writeFileSync('RainbowAI/reports/intent-baseline.json', JSON.stringify(report, null, 2));
  console.log('\nResults saved to RainbowAI/reports/intent-baseline.json');
}

main().catch(console.error);
