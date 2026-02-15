# Rainbow AI Knowledge Base Inconsistency Report

**Generated:** 2026-02-14
**Purpose:** Identify inconsistencies between knowledge base files, workflows, and static replies

---

## ✅ CONSISTENT (No Action Needed)

These items are already consistent across all sources:

1. **WiFi Credentials** - Network: "pelangi capsule", Password: "ilovestaycapsule"
2. **Door Password** - "1270#"
3. **Check-in Time** - 2:00 PM
4. **Check-out Time** - 12:00 PM (noon)
5. **Late Checkout Policy** - Free (subject to availability)
6. **Pets Policy** - Not allowed (adults-only hostel)
7. **Smoking Penalty** - RM300
8. **Laundry Price** - RM5/load
9. **Daily Rate** - RM45/night
10. **7-Night Rate** - RM267 (~RM38/night)
11. **Monthly Rate** - RM650/month (~RM22/night)

---

## ⚠️ INCONSISTENCIES REQUIRING REVIEW

### 1. PRICING - Missing Extended Stay Rates

**Issue:** Knowledge base has more pricing tiers than static replies

**Knowledge Base (pricing.md):**
- ✅ Daily: RM45/night
- ✅ 7 nights: RM267 (~RM38/night)
- ❌ 14 nights: RM423 (~RM30/night) — **MISSING in static reply**
- ❌ 21 nights: RM520 (~RM25/night) — **MISSING in static reply**
- ✅ Monthly (30 days): RM650 (~RM22/night)
- ❌ Long-term (3+ months): RM520/month (~RM17/night) — **MISSING in static reply**

**Static Reply (knowledge.json - "pricing"):**
- Only shows: Daily, 7 nights, Monthly

**Your Decision:**
- [ ] Add 14-night, 21-night, 3+ months rates to static reply
- [ ] Remove those rates from KB (keep it simple)
- [ ] Keep as-is (detailed KB, simplified reply)

**Recommendation:** _______________________

---

### 2. BANK ACCOUNT NUMBER - Formatting Inconsistency

**Issue:** Same account number displayed with different formatting

**Locations:**
- Knowledge Base (payment.md): `551128652007` (no spaces)
- Static Reply (pricing): `5511 2865 2007` (with spaces)
- Static Reply (payment): `5511 2865 2007` (with spaces)
- Static Reply (payment_info): `551128652007` (no spaces)
- Workflow (booking_payment_handler): Not mentioned

**Your Decision:**
- [ ] Use format WITH spaces: `5511 2865 2007` (more readable)
- [ ] Use format NO spaces: `551128652007` (easier to copy)
- [ ] Keep both formats (some with spaces, some without)

**Recommendation:** _______________________

---

### 3. CONTACT PHONE NUMBER - Formatting Inconsistency

**Issue:** Jay's number displayed with different formatting

**Locations:**
- Knowledge Base (checkin-access.md): `+60 12-708 8789` (spaces and dash)
- Knowledge Base (location.md): `+60 12-708 8789` (spaces and dash)
- Workflows (all): `+60127088789` (no spaces, no dash)
- Static Replies (payment): `+60127088789` (no spaces, no dash)

**Alston's number:**
- Knowledge Base: `+60 16-762 0815` (spaces and dash)
- Workflows: Not mentioned

**Your Decision:**
- [ ] Use format WITH spaces/dash: `+60 12-708 8789` (more readable)
- [ ] Use format NO spaces/dash: `+60127088789` (easier to tap on mobile)
- [ ] Keep both formats

**Recommendation:** _______________________

---

### 4. DEPOSIT POLICY - Conflicting Requirements

**Issue:** Contradictory information about when RM10 card deposit is required

**Knowledge Base (pricing.md):**
- "RM10 card deposit (**standard stays**) — refundable"

**Static Reply (payment_info):**
- "RM10 card deposit (refundable) is required for stays **>7 nights**"

**Conflict:** Is RM10 required for ALL stays or only stays >7 nights?

**Your Decision:**
- [ ] RM10 required for ALL stays (update payment_info)
- [ ] RM10 required ONLY for >7 nights (update pricing.md)
- [ ] RM10 required for different category: _______

**Recommendation:** _______________________

---

### 5. ADDRESS FORMAT - Multiple Versions

**Issue:** Hostel address displayed differently

**Knowledge Base (checkin-access.md):**
- "26A Jalan Perang, Taman Pelangi, 80400 Johor Bahru"

**Knowledge Base (location.md):**
- "26a, Taman Pelangi, Johor Bahru, Johor 80400, Malaysia"

**Static Reply (directions):**
- "26A Jalan Perang, Taman Pelangi, 80400 Johor Bahru"

**Differences:**
- "26A" vs "26a" (capitalization)
- "Jalan Perang" mentioned in some, omitted in others
- "Malaysia" mentioned in some, omitted in others

**Your Decision:**
- [ ] Use full address: "26A Jalan Perang, Taman Pelangi, 80400 Johor Bahru, Johor, Malaysia"
- [ ] Use short address: "26A Taman Pelangi, Johor Bahru"
- [ ] Keep different formats for different contexts

**Recommendation:** _______________________

---

### 6. EXTRA AMENITY CONTACT - Unclear Who Delivers

**Issue:** Different staff references for extra amenity requests

**Knowledge Base (amenities-extra.md):**
- "Ask our **on-site staff Maya**"

**Workflow (amenity_request_handler):**
- "Request forwarded to our **capsule operator (+60127088789)**"

**Static Reply (extra_amenity_request):**
- "Our **housekeeping team** can deliver"

**Conflict:** Is it Maya? Capsule operator (Jay)? Housekeeping team?

**Your Decision:**
- [ ] Maya is the primary contact (update workflow & static reply)
- [ ] Jay (+60127088789) is the contact (update KB)
- [ ] Generic "housekeeping team" (update KB & workflow)
- [ ] Depends on time/availability: _______

**Recommendation:** _______________________

---

### 7. LOST & FOUND CONTACT - Missing in Static Reply

**Issue:** Static reply doesn't provide contact info for lost items

**Knowledge Base (lost-found.md):**
- WhatsApp: +60127088789
- Call: +60127088789
- Pickup options, shipping options, process details

**Static Reply (forgot_item_post_checkout):**
- Explains Lost & Found process
- Asks for item description, room number, check-out date, shipping address
- Says "Our staff will search for your items and contact you shortly"
- ❌ **MISSING:** Contact number to reach staff

**Your Decision:**
- [ ] Add contact number to static reply
- [ ] Keep static reply generic (rely on KB for details)

**Recommendation:** _______________________

---

### 8. BILLING DISPUTE TIMEFRAME - Missing in Static Reply

**Issue:** KB mentions specific refund timeframe, static reply doesn't

**Knowledge Base (checkout-billing.md):**
- "If error confirmed, we'll process a **refund** or **adjustment** within **3-5 business days**"

**Static Reply (billing_dispute):**
- "If overcharge we'll discuss a **refund**"
- "Staff will contact you shortly"
- ❌ **MISSING:** Timeframe (3-5 business days)

**Your Decision:**
- [ ] Add "3-5 business days" to static reply
- [ ] Remove specific timeframe from KB (keep flexibility)
- [ ] Keep as-is (detailed KB, flexible reply)

**Recommendation:** _______________________

---

### 9. FACILITIES - Missing Details in Static Replies

**Issue:** KB mentions features not in static replies

**Knowledge Base (facilities.md) mentions:**
- ✅ Hair dryer
- ✅ Coffee machine
- ✅ Work-friendly desks
- ✅ Outdoor relaxation area
- ✅ Hot showers (24/7)

**Static Reply (facilities) mentions:**
- ❌ Video tour: https://www.youtube.com/watch?v=6Ux11oBZaQQ
- ❌ ~24 capsules across 3 sections (Front, Middle, Back)

**Conflict:** Different level of detail, some features missing in replies

**Your Decision:**
- [ ] Add missing facilities to static replies (hair dryer, coffee, desks, outdoor area)
- [ ] Add video tour link to KB
- [ ] Add "~24 capsules in 3 sections" to KB
- [ ] Keep as-is (detailed KB, concise replies)

**Recommendation:** _______________________

---

### 10. EARLY CHECK-IN POLICY - Conflicting Wording

**Issue:** Different wording about early check-in availability

**Knowledge Base (pricing.md):**
- "Early check-in: **Free** (subject to availability)"

**Static Reply (checkin_info):**
- "Early check-in is **subject to approval**"

**Static Reply (facilities_info):**
- Not mentioned

**Conflict:** "Free (subject to availability)" vs "subject to approval"

**Your Decision:**
- [ ] Use "Free (subject to availability)" everywhere
- [ ] Use "subject to approval" everywhere
- [ ] Keep both (mean the same thing)
- [ ] Clarify: Is there a charge? Is approval automatic if available?

**Recommendation:** _______________________

---

### 11. TOURIST GUIDE ATTRACTIONS - Only in Workflow

**Issue:** Detailed tourist guide only exists in workflow, not KB

**Workflow (tourist_guide):**
- Lists 8 attractions with emojis, descriptions, travel times
- LEGOLAND, Desaru Beach, Sultan Abu Bakar Mosque, etc.
- Website link: https://pelangicapsulehostel.com/

**Knowledge Base:**
- ❌ No dedicated tourist attractions file

**Your Decision:**
- [ ] Create `tourist-attractions.md` in KB with workflow content
- [ ] Keep only in workflow (dynamic response)
- [ ] Add to existing location.md file

**Recommendation:** _______________________

---

### 12. COMPLAINT RESPONSE TIMES - Varies by Issue Type

**Issue:** Different promised response times in workflows

**Workflow Response Times:**
- General complaints: "within **15 minutes**"
- Theft emergency: "immediately"
- Card locked: "within **10-15 minutes**"
- Extra amenity: "within **15-20 minutes**"

**This is actually REASONABLE** (different urgency levels), but should be documented

**Your Decision:**
- [ ] Keep varied response times (reflects actual urgency)
- [ ] Standardize to single timeframe: _______
- [ ] Document response time policy in KB

**Recommendation:** _______________________

---

## 📋 SUMMARY STATISTICS

**Total Categories Reviewed:** 18
**Consistent Items:** 11 ✅
**Inconsistencies Found:** 12 ⚠️

**Priority Levels:**
- 🔴 **High Priority** (contradictory info): #4 (Deposit Policy), #6 (Amenity Contact), #10 (Early Check-in)
- 🟡 **Medium Priority** (formatting/detail): #1, #2, #3, #5, #8, #9
- 🟢 **Low Priority** (acceptable variance): #7, #11, #12

---

## 📝 NEXT STEPS

1. **Review each inconsistency** and mark your decision
2. **Prioritize fixes** (high priority first)
3. **Update files** based on your decisions
4. **Re-check consistency** after edits

**Once you've marked your decisions, I can help update the files automatically.**

---

**Notes:**
- Some inconsistencies may be intentional (different contexts need different detail levels)
- Consider whether Rainbow should give simplified answers (static reply) vs detailed KB lookup
- Phone number and bank account formatting should be consistent for user experience
