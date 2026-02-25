/**
 * update-southern-kb.mjs
 * Updates all remaining Southern Homestay KB files via Rainbow admin API
 * Run: node scripts/update-southern-kb.mjs
 */

const BASE_URL = 'https://rainbow.southern-homestay.com/api/rainbow';
const ADMIN_KEY = 'southern-admin-2026';

const files = {
  'AGENTS.md': `# Southern Helper — Agent Instructions

## Identity
You are **Southern Helper**, the AI assistant for Southern Homestay in Johor Bahru.
Always respond as Southern Helper. Never mention Pelangi or Rainbow.

## Primary Language
Detect guest language and reply in kind: English, Bahasa Malaysia, or Mandarin Chinese.

## Escalation Triggers
Escalate to staff (+60 12-708 8789) if:
- Guest is angry or frustrated
- Emergency situation (medical, safety)
- Booking cancellation request
- Maintenance issues
- Complaint that cannot be resolved via FAQ
`,

  'README.md': `# Southern Homestay — Rainbow AI Knowledge Base

This directory contains all knowledge files for the Southern Helper AI assistant.

## Property Details
- Name: Southern Homestay
- Location: KSL City area, Johor Bahru, Johor, Malaysia
- Contact: +60 12-708 8789
- Email: sourthern.homestay369@gmail.com

## Room Types
- Studio-A (max 2 guests)
- 1BR-1 (max 4 guests)
- 2BR-1 (max 6 guests)

## Files Overview
- about.md / faq.md: General property information
- policies.md / houserules.md: Rules and policies
- checkin*.md: Check-in related information
- facilities*.md: Facilities and amenities
- payment*.md: Payment information
`,

  'amenities-extra.md': `# Southern Homestay — Extra Amenities & Services

## In-Unit Amenities
- Air conditioning (all units)
- Hot water shower
- Fully furnished (beds, sofa, dining table)
- Kitchen with cooking facilities
- Refrigerator and microwave
- Washing machine
- Smart TV with cable/streaming

## Building Facilities
- Secure access building
- Parking available (subject to availability)
- 24-hour security

## Nearby (KSL City Area)
- KSL Mall: Walking distance (shopping, dining, entertainment)
- Supermarkets: within 5 minutes
- Bus stops: nearby
- Johor Bahru City Centre: ~10 minutes drive
- Causeway to Singapore: ~15-20 minutes drive

## On Request (extra charge may apply)
- Baby cot: inquire with staff
- Extra bedding: inquire with staff
- Early check-in / late check-out: subject to availability
`,

  'availability.md': `# Southern Homestay — Availability & Bookings

## Booking Platforms
- **Booking.com**: Hotel ID 2967845 (account: sourthern.homestay369@gmail.com)
- Direct booking: Contact +60 12-708 8789 via WhatsApp

## Room Types Available
- Studio-A: Ideal for solo traveller or couple (max 2 pax)
- 1 Bedroom (1BR-1): Up to 4 guests
- 2 Bedroom (2BR-1): Up to 6 guests

## Rates (starting from)
- Studio: MYR 183 / night
- 1BR: Price on request
- 2BR: Price on request
- Cleaning fee: MYR 90 per stay

## Check Availability
For real-time availability, please visit Booking.com or WhatsApp us at +60 12-708 8789.
`,

  'checkin-access.md': `# Southern Homestay — Property Access

## Self Check-In
Southern Homestay offers self check-in for your convenience.

## Access Instructions
- Door code / key collection instructions will be sent via WhatsApp before your arrival
- Please contact us at +60 12-708 8789 if you have not received your access details

## Important
- Check-in is from **3:00 PM**
- Early check-in may be available — WhatsApp us to request
- Please do not share access codes with anyone outside your party

## On Arrival
1. Proceed to the unit as per the instructions sent to you
2. Use the provided access code/key to enter
3. Contact staff on WhatsApp if you have any issues: +60 12-708 8789
`,

  'checkin-procedure.md': `# Southern Homestay — Check-In Procedure

## Step-by-Step Check-In

1. **Receive confirmation**: You will get a WhatsApp message with access details before arrival
2. **Arrive from 3:00 PM**: Early check-in subject to availability (contact us first)
3. **Access the unit**: Use the provided code/key as per the WhatsApp instructions
4. **Settle in**: All essentials (towels, toiletries basics) provided
5. **Wi-Fi**: Password will be in the welcome message

## Need Help?
WhatsApp staff: **+60 12-708 8789** (available daily)

## Important Reminders
- Check-out is before 11:00 AM
- Please treat the unit with care
- Report any issues immediately via WhatsApp
`,

  'checkin-times.md': `# Southern Homestay — Check-In & Check-Out Times

## Standard Times
| | Time |
|--|--|
| **Check-In** | From 3:00 PM |
| **Check-Out** | Before 11:00 AM |

## Early Check-In
- Available subject to unit availability
- Please WhatsApp us in advance at +60 12-708 8789
- No guarantee unless confirmed

## Late Check-Out
- Available subject to next guest schedule
- Please request at least the evening before
- Contact +60 12-708 8789 to confirm
- Additional charge may apply for very late checkout

## Late Arrival
- Self check-in available at any time after 3:00 PM
- Please inform us if arriving after midnight
`,

  'checkin-wifi.md': `# Southern Homestay — Wi-Fi Information

## Wi-Fi Access
Wi-Fi details will be provided in your welcome WhatsApp message upon check-in.

If you did not receive the Wi-Fi password, please contact us:
**WhatsApp: +60 12-708 8789**

## Coverage
Wi-Fi is available throughout the unit.

## Troubleshooting
- Restart the router (located in the unit) if connection drops
- Contact staff if issue persists: +60 12-708 8789
`,

  'checkout-billing.md': `# Southern Homestay — Check-Out & Billing

## Check-Out Time
Before **11:00 AM**. Late checkout must be arranged in advance.

## Check-Out Procedure
1. Ensure all personal belongings are packed
2. Leave the unit in a reasonable condition
3. Lock the door and return any keys/cards as instructed
4. Message staff on WhatsApp to confirm check-out: +60 12-708 8789

## Billing
- Booking.com guests: Payment collected by Booking.com (channel collect)
- Direct bookings: Payment settled as agreed (bank transfer, TnG, or cash)

## Damages
- Minor wear and tear: acceptable
- Damage to property, furniture, or appliances: charge applies
- Please report pre-existing damage upon check-in

## Cleaning Fee
MYR 90 cleaning fee is included in your booking total.
`,

  'facilities-bathrooms.md': `# Southern Homestay — Bathroom Facilities

## All Units Include
- Private en-suite bathroom(s)
- Hot water electric shower
- Basic toiletries provided (shampoo, soap, toilet paper)
- Fresh towels (1 set per guest)
- Hair dryer available

## Notes
- Towels are for in-room use only (not to be taken to pool or outside)
- Additional towels available on request
- If any facilities are not working, contact us immediately: +60 12-708 8789
`,

  'facilities-common.md': `# Southern Homestay — Common Areas & Building

## Building
- Located in KSL City area, Johor Bahru
- Secure access with key/code
- Lift/elevator access
- 24-hour security

## Parking
- Parking subject to availability
- Inquire with staff about parking: +60 12-708 8789

## Common Facilities (Building Shared)
- Lobby
- Elevator
- Corridor access

## House Rules for Common Areas
- Keep noise to a minimum in corridors
- No gatherings in common areas after 11:00 PM
- Dispose of rubbish properly
`,

  'facilities-kitchen.md': `# Southern Homestay — Kitchen & Cooking Facilities

## Kitchen Equipment (all units)
- Refrigerator
- Microwave oven
- Electric kettle
- Basic cooking utensils and crockery

## 1BR and 2BR Units
- Full kitchen with cooking hob
- Plates, bowls, cups, cutlery

## Studio
- Compact kitchenette
- Basic cooking facilities

## Notes
- Please clean up after cooking
- Do not leave food out — attracts pests
- Cleaning products (dish soap, sponge) provided

## Nearby Dining
- KSL Mall food court: walking distance
- Numerous restaurants and mamak stalls nearby
- Convenient stores within 5 minutes
`,

  'facilities-units.md': `# Southern Homestay — Unit Descriptions

## Studio-A
- **Capacity:** Up to 2 guests
- **Beds:** 1 Queen bed
- **Bathroom:** Private en-suite
- **Price:** From MYR 183/night
- **Floor:** Ground floor
- **Ideal for:** Solo travellers, couples

## 1-Bedroom (1BR-1)
- **Capacity:** Up to 4 guests
- **Beds:** 1 Queen bed in master room + sofa bed in living area
- **Bathroom:** Private en-suite
- **Floor:** First floor
- **Ideal for:** Small families, group of friends

## 2-Bedroom (2BR-1)
- **Capacity:** Up to 6 guests
- **Beds:** Master room (Queen) + 2nd room (Twin/Queen)
- **Bathrooms:** 2 bathrooms
- **Floor:** Second floor
- **Ideal for:** Families, larger groups

## All Units Feature
- Air conditioning
- Smart TV
- Fully furnished living area
- Kitchen / kitchenette
- Washing machine
- Wi-Fi
`,

  'location.md': `# Southern Homestay — Location & Getting Here

## Address
Southern Homestay, KSL City area, Johor Bahru, 80500, Johor, Malaysia

## Getting Here

### By Car
- From Singapore (Woodlands / Tuas): Cross Second Link or Causeway (~15-20 min), follow GPS to KSL City area
- Grab/MyTeksi available from JB Sentral or Larkin terminal

### By Public Transport
- From Singapore: Take bus (170, 160, CW1, CW2) across Causeway to JB Sentral
- From JB Sentral: Grab to the property (~10 min)

## Nearby Landmarks & Attractions
- **KSL Mall** — Walking distance (shopping, food, cinema)
- **Danga Bay** — 5 min drive (waterfront, dining)
- **Johor Bahru City Square** — 10 min drive
- **Komtar JBCC** — 10 min drive
- **Legoland Malaysia** — 25 min drive
- **Singapore Causeway** — 15-20 min drive

## Area
JB 80500 is a central Johor Bahru area with easy access to amenities, shopping malls, and public transport to Singapore.
`,

  'lost-found.md': `# Southern Homestay — Lost & Found

## Left Something Behind?
Contact us as soon as possible via WhatsApp: **+60 12-708 8789**

Provide:
- Your name and booking dates
- Description of the item
- Unit number (Studio-A, 1BR-1, or 2BR-1)

## Found Items Policy
- Items found in units will be held for 14 days
- After 14 days, items may be donated or discarded
- We will make reasonable efforts to return found items

## Return Shipping
- We can arrange return shipping at guest's expense
- WhatsApp us to arrange: +60 12-708 8789
`,

  'memory.md': `# Southern Helper — Context & Memory Notes

This file is used by the AI system for context persistence.
Do not edit manually.
`,

  'payment-methods.md': `# Southern Homestay — Payment Methods

## Accepted Payment Methods

### Online (Booking.com)
- Credit/Debit Card (via Booking.com)
- Pre-paid at time of booking

### Direct Bookings
- **Malaysian Bank Transfer (IBG/Instant Transfer)**
- **Touch 'n Go (TnG) eWallet**
- **Cash** (on arrival)

## Booking.com Guests
- Payment is processed by Booking.com (channel collect)
- No additional payment required on arrival (unless extras apply)

## Direct Guests
- A deposit may be required to secure the booking
- Balance due on check-in
- Receipt will be provided upon payment

## Currency
- Malaysian Ringgit (MYR) for direct bookings
`,

  'refunds.md': `# Southern Homestay — Cancellation & Refund Policy

## Standard Policy
**Non-refundable** — Full payment is charged at time of booking.

## Booking.com Rates
- Non-refundable rate: No refund for cancellations at any time
- Please review the specific policy shown on your Booking.com confirmation

## Exceptions
- Force majeure situations will be assessed case by case
- Contact us via WhatsApp: +60 12-708 8789 or email: sourthern.homestay369@gmail.com

## Early Departure
- No refund for early departure
- Check-out before the booked date forfeits the remaining nights

## Modifications
- Date changes subject to availability
- Contact staff at least 48 hours in advance
`,

  'rules-guests-conduct.md': `# Southern Homestay — Guest Conduct Rules

## General Conduct
- Treat the property and all furnishings with care
- Be respectful of neighbours and other guests
- Keep noise levels low, especially after 11:00 PM
- No fighting, aggressive behaviour, or illegal activities

## Visitors
- Only registered guests are permitted to stay overnight
- Visitors must leave by 10:00 PM unless prior arrangement is made with staff
- Visitor count should not exceed unit capacity

## Smoking
- **Strictly NO smoking** inside the unit
- Smoking only in designated outdoor areas (if available)
- Violation may result in cleaning fee surcharge

## Parties & Events
- **No parties or events** permitted on the premises
- Violation may result in immediate eviction without refund
`,

  'rules-pets.md': `# Southern Homestay — Pet Policy

## Pet Policy
**Pets are not permitted** at Southern Homestay unless prior arrangement has been made and confirmed by staff.

## Exception Process
- Contact staff via WhatsApp: +60 12-708 8789
- Pets must be approved in writing before arrival
- Additional pet deposit may apply

## Service Animals
- Certified service animals are welcome
- Please inform us before arrival
`,

  'rules-quiet-smoking.md': `# Southern Homestay — Quiet Hours & Smoking Policy

## Quiet Hours
- **Quiet hours: 11:00 PM — 8:00 AM**
- Keep TV, music, and conversations at a moderate volume
- Be mindful of neighbours in adjacent units

## Smoking Policy
- **No smoking inside the unit** — strict policy
- No smoking in corridors, stairwells, or common areas
- Designated smoking area (if any): inquire with building management
- Violation of smoking policy: MYR 200 cleaning surcharge

## Alcohol
- Responsible consumption of alcohol is permitted inside the unit
- Public intoxication or disturbance is not tolerated
`,

  'rules-shared-spaces.md': `# Southern Homestay — Shared Spaces Rules

## Corridors & Lifts
- Keep noise low in shared corridors at all times
- Do not leave personal items in corridors or blocking exits
- Be courteous to other residents/guests

## Lobby
- No loitering in the lobby
- Maintain cleanliness

## Car Park
- Park only in designated guest bays (if provided)
- Do not block other vehicles

## Waste Disposal
- Place rubbish in bins provided
- Separate recyclables if facilities available
- Do not leave rubbish bags in corridors
`,

  'theft-incident.md': `# Southern Homestay — Theft & Incident Reporting

## In Case of Theft or Missing Items
1. Contact staff immediately via WhatsApp: **+60 12-708 8789**
2. Do not disturb the scene if possible
3. Staff will assist with next steps, including police report if needed

## Police Report
For theft or criminal incidents:
- **Johor Bahru Police**: 999 (emergency) or nearest police station
- Staff can help guide you through the process

## Valuables
- Southern Homestay is not responsible for lost or stolen valuables
- Keep valuables secured at all times
- Use in-unit safe if available
`,

  'tourist-attractions.md': `# Johor Bahru — Tourist Attractions & Things to Do

## Shopping
- **KSL Mall**: Walking distance from Southern Homestay — restaurants, shops, supermarket
- **Paradigm Mall JB**: 10 min drive
- **AEON Tebrau**: 15 min drive
- **Komtar JBCC**: 10 min drive
- **JB City Square**: 10 min drive

## Dining
- Numerous **Mamak restaurants** near KSL City (24-hour, local food)
- **Restoran Tepian Tebrau**: Waterfront dining
- **Danga Bay**: Waterfront dining and seafood
- **Jalan Dhoby hawker stalls**: Local street food

## Day Trips
- **Legoland Malaysia**: 30 min drive (theme park, great for families)
- **Hello Kitty Town & Thomas Town** (Puteri Harbour): 30 min drive
- **Desaru Coast**: 1 hour drive (beach resort area)
- **Singapore**: 15-20 min drive across the Causeway

## Culture & Heritage
- **Sultan Abu Bakar State Museum**
- **Johor Bahru Old Chinese Temple**
- **Bangunan Sultan Ibrahim** (landmark)

## Getting Around
- Grab is widely available and affordable in JB
- Rental cars available at the city
`,

  'unit-layout.md': `# Southern Homestay — Unit Layouts

## Studio-A
\`\`\`
[ Entrance ]
    |
[ Main Room ]
  - Queen bed
  - Wardrobe
  - Smart TV
  - Sofa/seating area
  - Kitchenette (fridge, microwave, kettle)
  - Work desk
    |
[ Bathroom ]
  - Shower, WC, basin
\`\`\`

## 1-Bedroom (1BR-1)
\`\`\`
[ Entrance ] → [ Living + Dining Area ]
                     |           |
              [ Kitchen ]  [ Master Bedroom ]
                                 |
                          [ Bathroom ]
\`\`\`
Living area has sofa bed for extra guests.

## 2-Bedroom (2BR-1)
\`\`\`
[ Entrance ] → [ Living + Dining Area ]
                     |        |         |
              [ Kitchen ] [ Master ]  [ 2nd Bedroom ]
                              |              |
                         [ Bathroom 1 ] [ Bathroom 2 ]
\`\`\`
Master: Queen bed. 2nd Room: Twin or Queen beds.
`,

  'users.md': `# Southern Homestay — Staff & Contact

## Primary Contact
**WhatsApp:** +60 12-708 8789
**Email:** sourthern.homestay369@gmail.com

## Operating Hours
Staff are available via WhatsApp daily.
For urgent matters, WhatsApp is the fastest channel.

## Booking Platform Contact
- **Booking.com**: Message via Booking.com inbox (Hotel ID: 2967845)

## Escalation
If the AI assistant cannot help you, it will forward your message to our staff.
You can also contact us directly anytime via WhatsApp.
`
};

async function putFile(filename, content) {
  const resp = await fetch(`${BASE_URL}/kb-files/${filename}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'X-Admin-Key': ADMIN_KEY
    },
    body: JSON.stringify({ content })
  });
  const data = await resp.json();
  if (resp.ok) {
    console.log(`✓ ${filename}`);
  } else {
    console.log(`✗ ${filename} — ${resp.status}: ${JSON.stringify(data)}`);
  }
  return resp.ok;
}

let ok = 0, fail = 0;
for (const [filename, content] of Object.entries(files)) {
  const success = await putFile(filename, content);
  if (success) ok++; else fail++;
}
console.log(`\nDone: ${ok} updated, ${fail} failed`);
