# TrustNest: team task split

**Product:** TrustNest, "Your safe nest, away from home." It's a website that helps college students in India rent safely. It has four parts:
1. **Verify:** check a listing for scams *(Nikhil)*
2. **Choose:** compare rooms by real living quality (StayScore) *(Teammate 2)*
3. **Live:** replace a flatmate who leaves *(Teammate 3)*
4. **Protect:** keep evidence and fight deposit disputes *(Teammate 4)*

| Person | Owns | Files they create |
|---|---|---|
| Nikhil (1) | Whole site, landing page, Verify, final integration | `index.html`, `verify.html`, `styles.css`, `app.js`, `scanner.js`, `verify.js` |
| Teammate 2 | Choose / StayScore | `explore.html`, `listing.html`, `choose.css`, `choose.js`, `choose-data.js`, `assets/choose/` |
| Teammate 3 | Live / Flatmates | `flatmates.html`, `live.css`, `live.js`, `live-data.js`, `assets/live/` |
| Teammate 4 | Protect | `protect.html`, `protect.css`, `protect.js`, `protect-data.js`, `assets/protect/` |

---

## RULES FOR EVERYONE (paste these to your AI agent first)

```
You are working on TrustNest, a hackathon website. Several people build different pages at the same time, so follow these rules exactly.

TECH
- Plain HTML + CSS + vanilla JavaScript only. No React, no npm, no build step, no frameworks.
- Use classic <script src="..."> tags. Do NOT use ES modules (type="module" or import/export) because the site must work by double-clicking the HTML file (file://).
- No database server. Mock data lives in a JS file; anything the user saves goes through TNDB (db.js), described below.
- The site must work on phone (390px wide) and desktop (1440px wide).

FILES: NEVER EDIT FILES YOU DON'T OWN
- Do NOT edit: index.html, verify.html, styles.css, app.js, scanner.js, verify.js. They belong to someone else.
- Only create and edit the files listed for your feature.
- Put your images only in your own assets/<feature>/ folder.

LOOK AND FEEL (must match the existing site)
- In <head>, include exactly:
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Newsreader:opsz,wght@6..72,500&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="styles.css">
  <link rel="stylesheet" href="<your-feature>.css">
- Copy the <header class="nav"> and <footer class="footer"> markup from verify.html, and put aria-current="page" on your own nav link.
- Wrap the page in <div class="page"> like verify.html does.
- Before your own scripts at the bottom of <body>, add: <script src="site.js"></script>  (this adds the shared "Sign in" button to the nav; window.TrustNestUser() returns the signed-in student {name, email, college} or null, so you can prefill names, e.g. on reviews or letters).
- Reuse what styles.css already has: CSS variables (--sage, --forest, --forest-ink, --text, --muted, --serif, --sans) and classes (.btn .btn-solid .btn-outline, .card, .seg, .step, .section-head, .score-ring, .flags, .presets, .pill, .bars).
- Design: sage-green background, white frosted cards with rounded corners, dark forest-green buttons, serif headings (Newsreader), Inter for body text. Calm, premium, lots of space. No neon, no gradients, no emojis as icons.
- Prefix ALL your new CSS classes with your feature prefix (ch- for Choose, lv- for Live, pr- for Protect) so they never clash with other pages.
- SAVE DATA WITH THE SHARED DATABASE, NOT localStorage. Include <script src="db.js"></script> before your script and use:
    await TNDB.list("choose-reviews")              // all records, oldest first
    await TNDB.add("choose-reviews", {...})        // returns the saved record with id + createdAt
    await TNDB.update("choose-reviews", id, {...}) // merge changes
    await TNDB.remove("choose-reviews", id)
  Name collections <feature>-<thing>: choose-reviews, live-vacancies, live-handover, protect-evidence...
  When the site runs with `node server.js` (http://localhost:3000) every record is saved as a file in data/<collection>/, so git push / git pull shares it with the team. Opened by double-click, it falls back to that browser's storage.
- Only use localStorage for per-browser things like the vibe-quiz answers of the person using that laptop.

CONTENT
- Location: students at Chitkara University, Rajpura (Punjab), and nearby areas: Rajpura, Banur, Zirakpur, Mohali, Chandigarh.
- Use realistic Indian rents in rupees (₹), Indian names and realistic details.
- Write short, plain, friendly text. Buttons say exactly what they do ("Save entry", not "Submit").
```

---

## TEAMMATE 2: CHOOSE (StayScore)

```
Feature: CHOOSE / StayScore. "Photos show the room. StayScore shows the stay."
Students compare PGs and flats by REAL living conditions rated by residents: water, WiFi, noise, maintenance, cleanliness, transport. Not just photos.
Your files: explore.html, listing.html, choose.css, choose.js, choose-data.js, assets/choose/
CSS prefix: ch-   localStorage prefix: tn_choose_
```

### Phase 1: Data + Explore page
- `choose-data.js`: 12 mock listings in a `const CH_LISTINGS = [...]` array. Each listing has:
  `id, title, type (PG / Single room / Shared flat / 1BHK / 2BHK), area, address, distance (e.g. "6 min walk to Chitkara"), gender (Girls / Boys / Any), rent, deposit, meals (true/false), photos[], verifiedOwner (true/false), scores {water, wifi, noise, maintenance, cleanliness, transport} (0–10), measuredWifiMbps, advertised[] (pairs of "what the ad said" and "what residents say", e.g. "24×7 water" vs "No water after 8 pm, 3 nights a week"), reviews[] {name, course, monthsStayed, rating, text, verifiedResident}`
- Mix good and bad places so the scores really differ (some 8–9, some 5–6).
- `explore.html`:
  - Page title "Find a room you can trust."
  - Filters: area, max budget (slider), type, gender, "verified owner only". Sort by StayScore, price low→high and distance.
  - Grid of listing cards: photo, title, area and distance, rent, big StayScore badge (green 7.5+, amber 6–7.4, red below 6), 3 mini score bars, "Verified owner" badge.
  - Empty state when no results ("No rooms match. Try a higher budget.").
- StayScore = average of the 6 scores, rounded to 1 decimal.

### Phase 2: Listing detail page
- `listing.html?id=<id>` reads the id from the URL.
- Photo gallery (big photo + thumbnails), title, address, rent, deposit, what's included.
- StayScore section: big overall score plus 6 labelled bars with numbers.
- "Advertised vs reality" table: ✓ when they match, ⚠ when they don't.
- Measured WiFi: "Ad said 100 Mbps · residents measured 38 Mbps".
- Reviews list with "Verified resident" badges and months stayed.
- Owner box: name, "Verified owner" badge (mock), and a "Check this listing for scams" button linking to `verify.html`.
- A "Back to all rooms" link.

### Phase 3: Rate your stay + compare
- A "Rate your stay" form on listing.html: 6 sliders (0–10), a WiFi speed field, and a short review. Saving it stores the review in localStorage (`tn_choose_reviews`), adds it to the list and recalculates the StayScore live.
- Compare: an "Add to compare" button on cards (max 3) shows a bottom tray. "Compare" opens a side-by-side table of rent, deposit, all 6 scores and WiFi, with the best value in each row highlighted.
- *(Optional, only if time)* a map view with Leaflet + OpenStreetMap.
- Images: generate realistic room photos (e.g. with Gemini) and save them in `assets/choose/`. Every listing should look different.

---

## TEAMMATE 3: LIVE (Flatmates / RoommateExit)

```
Feature: LIVE / Flatmates. "When a flatmate leaves, fill the bed with someone who fits."
When one flatmate moves out suddenly (internship, placement, going home), the rest are stuck paying their share. TrustNest finds a compatible replacement and handles the handover.
Your files: flatmates.html, live.css, live.js, live-data.js, assets/live/
CSS prefix: lv-   localStorage prefix: tn_live_
flatmates.html has 3 tabs at the top: "Find a room", "Post a vacancy", "Handover".
```

### Phase 1: Vibe quiz + matching
- `live-data.js`: 10 mock households that need a replacement, in `const LV_HOUSEHOLDS = [...]`. Each has:
  `id, members[] {name, course, year}, area, flatType, rentShare, deposit, moveInDate, leavingReason (e.g. "Internship in Bengaluru"), vibe {sleep, cleanliness, food, guests, noise, smoking, studyHabits, sharing}, houseRules[], photo`
- Vibe quiz with 8 questions, one per vibe key. Each has 2–4 options (e.g. sleep: early bird / flexible / night owl). Show one question at a time with a progress bar and back/next. Save answers to `tn_live_profile`.
- Matching: compatibility % for each household (weighted similarity; sleep, cleanliness and smoking count most). Show the results as cards sorted by match %, with a breakdown of chips: "✓ Sleep", "✓ Food", "✗ Guests".
- Clicking a card opens details: members, rent share, house rules, why it matches.

### Phase 2: Post a vacancy + rent calculator
- "Post a vacancy" form: area, flat type, total rent, number of people, who is leaving and when, reason, the household's vibe (same 8 questions) and house rules. Saving adds it to localStorage (`tn_live_vacancies`), and it appears in "Find a room" with a "New" badge.
- Rent recalculator next to the form: total rent, people, days until the bed is filled. Shows:
  - each person's share now and while the bed is empty
  - extra cost per person per month
  - "An empty bed costs each of you ₹X a day"
  - total lost until it's filled
  All of these update live as you type.

### Phase 3: Handover tracker + deposit settlement
- "Handover" tab: a 5-step tracker. You click to complete each step, and it shows a date and progress.
  1. Match accepted
  2. Landlord approval (button "Send approval request" → status "Approved by owner" mock)
  3. Agreement transfer (checklist: old name removed, new name added, signed)
  4. Deposit settlement
  5. Key handover
- Deposit settlement calculator: outgoing flatmate's deposit, deductions (damage, pending electricity, pending rent). Shows the refund to the outgoing person and what the incoming person pays (directly or via the landlord). Show it as a clear receipt.
- "Request intro" button on household cards → a fake "Intro sent to Ananya & Kavya" state, saved in localStorage.
- Progress saved in `tn_live_handover`.

---

## TEAMMATE 4: PROTECT (TenantShield)

```
Feature: PROTECT / TenantShield. "Keep proof from day one. Get your deposit back."
Tenants lose deposits and fights with landlords because they have no proof. TrustNest keeps a dated evidence record, explains the rent agreement in plain English, and writes formal complaint letters.
Your files: protect.html, protect.css, protect.js, protect-data.js, assets/protect/
CSS prefix: pr-   localStorage prefix: tn_protect_
protect.html has 3 tabs at the top: "Evidence locker", "Understand my agreement", "Write a complaint".
```

### Phase 1: Evidence locker
- Add an entry with: date (defaults to today), category (Move-in photos, Maintenance complaint, Payment/receipt, Conversation, Move-out photos, Deduction), title, note, amount (optional) and photos (multiple).
- Shrink photos in the browser to max 800px wide (canvas) before saving, so they fit in localStorage (`tn_protect_locker`).
- A timeline of all entries, newest or oldest first, with category colours and photo thumbnails (click to enlarge). Filter by category. Delete an entry with an inline "Are you sure?" (don't use browser alert/confirm popups).
- A "Load sample data" button that fills 6 realistic entries (move-in, water complaint with no reply, rent receipts, move-out, ₹12,000 "wall damage" deduction), so the demo looks full.
- Summary bar: number of entries, first and last date, total money disputed.

### Phase 2: Agreement explainer
- Paste a rent agreement, or click "Use a sample agreement" (put a realistic sample in `protect-data.js`).
- Detect clauses with keyword rules and show each as a card: the original line, "What it means" in plain English, and a verdict tag: **Fair**, **Check this** or **Unfair**.
- Rules to cover at least:
  - security deposit amount (over 2 months' rent = Unfair, per the Model Tenancy Act 2021 for states that adopted it)
  - lock-in period
  - notice period
  - yearly rent increase % (over 10% = Check)
  - painting/cleaning charges deducted from deposit
  - landlord entering without notice
  - electricity per-unit rate (over ₹10/unit = Check)
  - guests/visitors rules
  - forfeiting the whole deposit if you leave early
- Summary at the top: "3 fair · 2 check · 2 unfair".

### Phase 3: Complaint letter + escalation
- Form: your name, landlord name, property address, issue (Deposit not returned / Repairs not done / Illegal deductions / Harassment or entry without notice), amount, the dates, what you want and a deadline in days.
- Generates a formal letter in a paper-style card. It automatically lists the evidence from the locker (dates and titles). "Copy letter" and "Print / Save as PDF" (window.print with a print stylesheet that shows only the letter).
- Complaint tracker: each letter gets a status: Sent → Reminder sent → Escalated → Resolved, with dates (localStorage `tn_protect_complaints`).
- "Where to escalate" panel (static text):
  1. written notice to the landlord
  2. Rent Authority / civil court for deposit disputes
  3. National Consumer Helpline **1915** for PG/hostel service issues
  4. if it's a scam or online fraud, **1930** and cybercrime.gov.in
  5. the college student welfare office
- "Export my evidence file" prints the whole locker as a clean, dated document.

---

## INTEGRATION (Nikhil, at the end)
- Point the nav links on every page to: `verify.html`, `explore.html`, `flatmates.html`, `protect.html`.
- Point the landing page's "Choose / Live / Protect" sections to those pages.
- Test every page on phone and desktop, then host on Netlify or GitHub Pages.

## CHECK-INS
- **After Phase 1:** send a screenshot in the group. Make sure your page opens by double-clicking and matches the look.
- **After Phase 2:** send the page files to Nikhil for a first merge.
- **Phase 3:** polish and extras only after Phases 1 and 2 work.
