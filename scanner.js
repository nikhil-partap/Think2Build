/* TrustNest scam scanner: shared by the landing page and verify.html.
   Classic script: these top-level names are shared with later scripts. */

const PRESETS = {
  army: "URGENT!! 2BHK fully furnished flat in Sector 70 Mohali for only Rs 4,500/month. I am an army officer, recently transferred to J&K so I can't show the flat in person. Pay Rs 2,000 token on GPay to book, keys will be sent by courier. Many students interested, first come first serve. WhatsApp only. Call 70090 11223",
  cheap: "1BHK near Chitkara University available for Rs 3,800 per month, fully furnished with AC. Owner is out of station, pay 1 month advance on PhonePe and I will share the address. Hurry, only today.",
  genuine: "Girls PG near Chitkara University, Rajpura. Twin sharing Rs 9,500 with 3 meals, WiFi and laundry. Visit anytime between 10 am and 7 pm. Rent agreement provided, security deposit is one month's rent, paid after you see the room. Call Mrs. Kaur."
};

// Typical monthly rent per bed / unit for each area (illustrative averages)
const AREA_AVG = {
  rajpura:    { pg: 8500,  room: 6000, "1bhk": 9000,  "2bhk": 14000, "3bhk": 19000 },
  zirakpur:   { pg: 9000,  room: 6500, "1bhk": 11000, "2bhk": 16000, "3bhk": 22000 },
  mohali:     { pg: 10000, room: 7500, "1bhk": 13000, "2bhk": 19000, "3bhk": 26000 },
  chandigarh: { pg: 11500, room: 8500, "1bhk": 15000, "2bhk": 22000, "3bhk": 30000 }
};

const TYPE_LABEL = { pg: "PG bed", room: "room", "1bhk": "1BHK", "2bhk": "2BHK", "3bhk": "3BHK" };

// Numbers other students have reported (demo seed + anything reported in this browser)
const SEED_REPORTED = { "7009011223": 14, "9888877701": 6 };

function getReported() {
  let local = {};
  try { local = JSON.parse(localStorage.getItem("tn_reported_phones") || "{}"); } catch (e) {}
  const all = { ...SEED_REPORTED };
  for (const k in local) all[k] = (all[k] || 0) + local[k];
  return all;
}

function normPhone(s) {
  const d = String(s || "").replace(/\D/g, "");
  return d.length >= 10 ? d.slice(-10) : "";
}

function findPhone(text) {
  const m = text.match(/(?:\+?91[\s-]?)?[6-9]\d{4}[\s-]?\d{5}/);
  return m ? normPhone(m[0]) : "";
}

const RULES = [
  {
    key: "advance",
    test: t => /(token|advance|booking amount|book(ing)?)/.test(t) && /(gpay|google pay|paytm|phonepe|upi|before (the )?visit|share the address|to book)/.test(t),
    weight: 32,
    title: "Asks for money before you visit",
    why: "Genuine owners let you see the room first. Paying a token to 'book' a place you haven't seen is the most common rental scam."
  },
  {
    key: "away",
    test: t => /(army|defence|defense|officer|transferred|posted|abroad|out of station|keys? (will be )?(sent|by courier)|can'?t show)/.test(t),
    weight: 26,
    title: "Owner can't meet you",
    why: "\"I'm in the army / abroad, keys by courier\" is a known script. If nobody can show you the room, don't pay."
  },
  {
    key: "urgent",
    test: t => /(urgent|only today|first come|hurry|many (students|people) (are )?interested|last (room|flat))/.test(t),
    weight: 10,
    title: "Pressure to decide fast",
    why: "Urgency is used to stop you from checking. A real listing will still be there tomorrow."
  },
  {
    key: "nocall",
    test: t => /(whatsapp only|no calls?|only chat)/.test(t),
    weight: 8,
    title: "Won't take calls",
    why: "Scammers avoid calls so their voice and number can't be traced or checked."
  },
  {
    key: "otp",
    test: t => /(otp|aadhaar|aadhar|pan card|bank details)/.test(t),
    weight: 15,
    title: "Asks for ID or OTP early",
    why: "Never share an OTP. Share ID documents only after you've visited and signed an agreement."
  }
];

const GOOD = [
  { test: t => /(visit (anytime|before)|see the room|come and see|visit between)/.test(t), title: "Visits are welcome", why: "The owner invites you to see the place before paying." },
  { test: t => /(rent agreement|agreement provided|written agreement)/.test(t), title: "Written agreement offered", why: "A written agreement protects your deposit and notice period." },
  { test: t => /(after you see|paid after|on move-?in)/.test(t), title: "Pay after you see it", why: "Money changes hands only after the visit." }
];

function detectType(t) {
  if (/\b3\s?bhk\b/.test(t)) return "3bhk";
  if (/\b2\s?bhk\b/.test(t)) return "2bhk";
  if (/\b1\s?bhk\b/.test(t)) return "1bhk";
  if (/\bpg\b|paying guest|hostel|sharing/.test(t)) return "pg";
  return "room";
}

function detectRent(t) {
  const m = t.match(/(?:rs\.?|₹|inr)\s?([\d,]{3,7})|([\d,]{4,7})\s?(?:\/-|rs|per month|\/month|pm)/);
  if (!m) return null;
  return parseInt((m[1] || m[2]).replace(/,/g, ""), 10);
}

/**
 * scan(text, area, details)
 * details (all optional): { type, rent, deposit, payBeforeVisit, payMethod, phone, photoDupes }
 * Returns { score, flags, checks, facts }
 */
function scan(text, area, details = {}) {
  const t = (text || "").toLowerCase();
  let score = 96;
  const flags = [];
  const hit = {};

  RULES.forEach(r => {
    if (r.test(t)) { hit[r.key] = true; score -= r.weight; flags.push({ bad: true, title: r.title, why: r.why }); }
  });

  // Payment details given in the form
  if (details.payBeforeVisit === "yes" && !hit.advance) {
    score -= 32; hit.advance = true;
    flags.push({ bad: true, title: "Asks for money before you visit", why: "Paying anything before seeing the room in person is the single biggest scam sign." });
  }
  if (["gift", "crypto"].includes(details.payMethod)) {
    score -= 20;
    flags.push({ bad: true, title: "Unusual payment method", why: "No landlord needs gift cards or crypto. This money can't be traced or recovered." });
  }

  // Price check
  const type = details.type || detectType(t);
  const rent = details.rent ? Number(details.rent) : detectRent(t);
  const avg = AREA_AVG[area] ? AREA_AVG[area][type] : null;
  let pricePct = null;
  if (rent && avg) {
    pricePct = Math.round((1 - rent / avg) * 100);
    if (pricePct >= 40) {
      score -= 24;
      flags.unshift({ bad: true, title: `Rent is ${pricePct}% below the area average`, why: `A ${TYPE_LABEL[type]} here usually costs around ₹${avg.toLocaleString("en-IN")}. Prices this low are bait.` });
    } else if (pricePct >= 25) {
      score -= 10;
      flags.unshift({ bad: true, title: `Rent is ${pricePct}% below average`, why: `Similar places nearby go for about ₹${avg.toLocaleString("en-IN")}. Ask why it's cheaper.` });
    }
  }

  // Deposit check (Model Tenancy Act, 2021 suggests max 2 months for residential)
  if (rent && details.deposit && Number(details.deposit) > rent * 2) {
    score -= 8;
    flags.push({ bad: true, title: "Deposit is more than 2 months' rent", why: "The Model Tenancy Act, 2021 caps residential deposits at two months. Ask for it in writing." });
  }

  // Phone check
  const phone = normPhone(details.phone) || findPhone(t);
  const reported = getReported();
  const reports = phone ? reported[phone] || 0 : 0;
  if (reports) {
    score -= 30;
    flags.unshift({ bad: true, title: `This number was reported ${reports} times`, why: "Other students flagged this phone number for asking money without showing the room." });
  }

  // Photo check
  const dupes = details.photoDupes || 0;
  if (dupes > 0) {
    score -= 22;
    flags.unshift({ bad: true, title: dupes === 1 ? "A photo was used in another listing" : `${dupes} photos were used in other listings`, why: "Scammers copy photos from real listings. The same picture appearing elsewhere means this ad may be fake." });
  }

  GOOD.forEach(g => {
    if (g.test(t)) { score += 2; flags.push({ bad: false, title: g.title, why: g.why }); }
  });

  score = Math.max(4, Math.min(98, score));

  const checks = [
    { label: "Price is fair for the area", state: pricePct === null ? "unknown" : pricePct >= 25 ? "fail" : "pass", note: avg ? `Area average ₹${avg.toLocaleString("en-IN")}` : "Add the rent to check" },
    { label: "No money before a visit", state: hit.advance ? "fail" : "pass", note: hit.advance ? "Token or advance requested" : "No advance requested" },
    { label: "Owner can show the place", state: hit.away ? "fail" : "pass", note: hit.away ? "Owner says they're away" : "No 'owner away' script" },
    { label: "Phone number is clean", state: !phone ? "unknown" : reports ? "fail" : "pass", note: !phone ? "No number found" : reports ? `${reports} reports` : `${phone.slice(0, 5)} ${phone.slice(5)} has no reports` },
    { label: "Photos are original", state: details.photoChecked ? (dupes ? "fail" : "pass") : "unknown", note: details.photoChecked ? (dupes ? "Seen in another listing" : "No matches found") : "Upload photos to check" }
  ];

  return { score, flags, checks, facts: { phone, rent, type, avg } };
}
