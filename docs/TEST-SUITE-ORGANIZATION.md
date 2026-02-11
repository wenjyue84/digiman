# Test Suite Organization

## Overview

The Rainbow AI Assistant test suite has been reorganized into **guest journey phases** to align with hospitality industry best practices and ensure comprehensive coverage of all intents.

## Test Statistics

- **Total Test Scenarios**: 58
- **Categories**: 6 main phases + multilingual + edge cases
- **Coverage**: Every intent in `intents.json` is tested at least once
- **Professional Terminology**: Updated to match hospitality industry standards

## Phase-Based Organization

### 1. GENERAL_SUPPORT (4 tests)
Intents that can occur at any phase of the guest journey.

| Test ID | Intent Tested | Languages |
|---------|---------------|-----------|
| `general-greeting-hi` | greeting | English |
| `general-greeting-selamat` | greeting | Malay |
| `general-thanks-multiple-languages` | thanks | Mixed |
| `general-contact-staff-urgent` | contact_staff | English |

### 2. PRE_ARRIVAL (11 tests)
Enquiry and booking phase - guest is researching or making a reservation.

| Test ID | Intent Tested | Scenario |
|---------|---------------|----------|
| `prearrival-pricing-inquiry` | pricing | Rate inquiry |
| `prearrival-availability-check` | availability | Date-specific check |
| `prearrival-booking-process` | booking | How to book |
| `prearrival-directions-from-airport` | directions | Airport to hotel |
| `prearrival-facilities-info-pool` | facilities_info | Swimming pool |
| `prearrival-rules-policy-smoking` | rules_policy | Smoking policy |
| `prearrival-rules-policy-pets` | rules_policy | Pet policy |
| `prearrival-payment-info-methods` | payment_info | Payment methods |
| `prearrival-payment-made-receipt` | payment_made | Receipt request |
| `prearrival-checkin-info-time` | checkin_info | Check-in time |
| `prearrival-checkout-info-time` | checkout_info | Check-out time |

### 3. ARRIVAL_CHECKIN (4 tests)
Guest has arrived and is checking in.

| Test ID | Intent Tested | Scenario |
|---------|---------------|----------|
| `arrival-checkin-arrival-assistance` | check_in_arrival | Check-in process |
| `arrival-lower-deck-preference` | lower_deck_preference | Floor preference |
| `arrival-wifi-access-details` | wifi | WiFi credentials |
| `arrival-facility-orientation-breakfast` | facility_orientation | Breakfast hours |

### 4. DURING_STAY (15 tests)
Guest is currently staying - requires immediate resolution.

#### Climate Control (2 tests)
| Test ID | Intent Tested | Resolution |
|---------|---------------|------------|
| `duringstay-climate-too-cold` | climate_control_complaint | Guide to close fan, adjust AC, extra blanket |
| `duringstay-climate-too-hot` | climate_control_complaint | Open fan, adjust AC, relocate |

#### Noise Complaints (3 tests)
| Test ID | Intent Tested | Scenario |
|---------|---------------|----------|
| `duringstay-noise-complaint-construction` | noise_complaint | External construction |
| `duringstay-noise-complaint-party` | noise_complaint | Loud neighbors |
| `duringstay-noise-complaint-baby` | noise_complaint | Baby crying |

#### Cleanliness (2 tests)
| Test ID | Intent Tested | Scenario |
|---------|---------------|----------|
| `duringstay-cleanliness-complaint-room` | cleanliness_complaint | Room not cleaned |
| `duringstay-cleanliness-complaint-bathroom` | cleanliness_complaint | Bathroom issues |

#### Other Mid-Stay Issues
| Test ID | Intent Tested | Severity |
|---------|---------------|----------|
| `duringstay-facility-malfunction-ac` | facility_malfunction | HIGH |
| `duringstay-card-locked-out` | card_locked | CRITICAL |
| `duringstay-theft-report-valuables` | theft_report | CRITICAL |
| `duringstay-theft-report-jewelry` | theft_report | CRITICAL |
| `duringstay-general-complaint-service` | general_complaint_in_stay | MEDIUM |
| `duringstay-extra-amenity-towel` | extra_amenity_request | LOW |
| `duringstay-extra-amenity-pillow` | extra_amenity_request | LOW |
| `duringstay-tourist-guide-local` | tourist_guide | LOW |

### 5. CHECKOUT_DEPARTURE (5 tests)
Guest is checking out or preparing to depart.

| Test ID | Intent Tested | Scenario |
|---------|---------------|----------|
| `checkout-procedure-inquiry` | checkout_procedure | How to check out |
| `checkout-late-checkout-request-approved` | late_checkout_request | Late checkout |
| `checkout-late-checkout-request-denied` | late_checkout_request | Denied late checkout |
| `checkout-luggage-storage-post` | luggage_storage | Post-checkout storage |
| `checkout-billing-inquiry-discrepancy` | billing_inquiry | Billing clarification |

### 6. POST_CHECKOUT (9 tests)
Guest has checked out - service recovery and claims.

#### Forgot Items (3 tests)
| Test ID | Intent Tested | Item |
|---------|---------------|------|
| `postcheckout-forgot-item-phone-charger` | forgot_item_post_checkout | Phone charger |
| `postcheckout-forgot-item-passport` | forgot_item_post_checkout | Passport (urgent) |
| `postcheckout-forgot-item-clothes` | forgot_item_post_checkout | Clothing |

#### Post-Checkout Complaints (4 tests)
| Test ID | Intent Tested | Service Recovery |
|---------|---------------|------------------|
| `postcheckout-complaint-food-quality` | post_checkout_complaint | Voucher + apology |
| `postcheckout-review-feedback-negative` | review_feedback | Management apology |
| `postcheckout-billing-dispute-refund` | billing_dispute | Refund process |
| `postcheckout-billing-dispute-minor-error` | billing_dispute | Quick adjustment |

#### Positive Feedback
| Test ID | Intent Tested | Response |
|---------|---------------|----------|
| `postcheckout-review-feedback-positive` | review_feedback | Thank you |

### 7. MULTILINGUAL (4 tests)
Testing language handling across different phases.

| Test ID | Languages | Phase |
|---------|-----------|-------|
| `multilingual-chinese-greeting` | Chinese | GENERAL_SUPPORT |
| `multilingual-mixed-language-booking` | Malay + English | PRE_ARRIVAL |
| `multilingual-chinese-bill-question` | Chinese | CHECKOUT_DEPARTURE |
| *(Malay tests integrated above)* | Malay | Various |

### 8. EDGE CASES (4 tests)
Testing system robustness and security.

| Test ID | Test Type | Expected Behavior |
|---------|-----------|-------------------|
| `edge-case-gibberish-message` | Invalid input | Graceful "did not understand" |
| `edge-case-only-emojis` | Emoji only | Ask for text message |
| `edge-case-long-message` | Very long text | Handle without error |
| `edge-case-prompt-injection-malicious` | Security | Reject unauthorized access |

## Key Improvements

### 1. Professional Terminology
- **Old**: "Core Info" → **New**: "PRE_ARRIVAL"
- **Old**: "Problems" → **New**: "DURING_STAY" (severity-based)
- **Added**: "POST_CHECKOUT" (service recovery phase)
- **Added**: "CHECKOUT_DEPARTURE" (departure management)

### 2. Phase-Specific Handling
**DURING_STAY vs POST_CHECKOUT Complaints:**
- **During Stay**: Immediate resolution (relocate, adjust AC, deep clean, compensate)
- **Post-Checkout**: Service recovery only (voucher, apology, refund if error)

Example:
```javascript
// DURING STAY - Climate too cold
validate: [{ type: 'contains_any', values: ['blanket', 'adjust AC', 'close fan'] }]

// POST CHECKOUT - Service complaint
validate: [{ type: 'contains_any', values: ['apology', 'voucher', 'feedback recorded'] }]
```

### 3. Critical Scenarios Added
1. **Climate Control** (2 variants):
   - Too cold → guide to close fan, extra blanket
   - Too hot → open fan, adjust AC

2. **Post-Checkout Lost Items** (3 variants):
   - Phone charger (common)
   - Passport (urgent!)
   - Clothes (shipping option)

3. **Noise Complaints** (3 variants):
   - Construction (external)
   - Party (neighbors)
   - Baby crying (empathy required)

4. **Billing Disputes** (2 variants):
   - Major overcharge → refund process
   - Minor error → quick adjustment

### 4. Test Validation Rules
**Severity-Based Validation:**
- **CRITICAL** intents (theft, card locked): Must contain emergency keywords
- **HIGH** intents (climate, noise): Must offer solutions or relocation
- **MEDIUM** intents (complaints): Must acknowledge and provide action
- **LOW** intents (amenities, info): Must contain requested information

**Example Validation:**
```javascript
// Climate complaint (HIGH severity)
validate: [{
  turn: 0,
  rules: [{
    type: 'contains_any',
    values: ['blanket', 'adjust AC', 'close fan'], // Specific solutions
    critical: true
  }]
}]

// Post-checkout complaint (service recovery)
validate: [{
  turn: 0,
  rules: [{
    type: 'contains_any',
    values: ['apology', 'voucher', 'feedback recorded'], // Recovery only
    critical: true
  }]
}]
```

## Testing Best Practices

1. **Run autotest after any intent or routing changes**
2. **Each phase should have >80% pass rate**
3. **Critical intents must have 100% pass rate**
4. **Update tests when adding new intents**
5. **Test multilingual support for each new feature**

## Future Enhancements

- [ ] Add multi-turn conversation tests
- [ ] Add context memory tests (guest remembers previous answers)
- [ ] Add booking workflow integration tests
- [ ] Add performance benchmarks (<10s response time)
- [ ] Add sentiment analysis validation

## References

- `mcp-server/src/assistant/data/intents.json` - Intent definitions
- `mcp-server/src/assistant/data/routing.json` - Routing logic
- `mcp-server/src/public/rainbow-admin.html` - Test runner UI

---

*Last Updated: 2026-02-12*
*Test Suite Version: 2.0 (Phase-Based)*
