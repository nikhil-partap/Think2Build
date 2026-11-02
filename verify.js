/* Verify page: full listing check with photo fingerprinting and reporting */

const $ = id => document.getElementById(id);
const form = $("vForm");
const listing = $("listing");
let payBeforeVisit = "";
let photos = []; // { name, url, hash, match }

/* ---------- Presets ---------- */
document.querySelectorAll("[data-preset]").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll("[data-preset]").forEach(b => b.classList.remove("on"));
    btn.classList.add("on");
    listing.value = PRESETS[btn.dataset.preset];
    $("area").value = btn.dataset.preset === "army" ? "mohali" : "rajpura";
    ["type", "rent", "deposit", "phone", "payMethod", "ownerTold", "ownerDoc"].forEach(id => ($(id).value = ""));
    ownerFile = null; $("ownerFileLabel").textContent = "Upload the bill or receipt";
    setPay("");
    photos = []; renderThumbs();
    runCheck();
  });
});

/* ---------- Pay-before-visit toggle ---------- */
const payQ = document.querySelector('[data-q="payBeforeVisit"]');
payQ.querySelectorAll("button").forEach(b => b.addEventListener("click", () => setPay(b.dataset.v)));
function setPay(v) {
  payBeforeVisit = v;
  payQ.querySelectorAll("button").forEach(b => b.classList.toggle("on", b.dataset.v === v));
}

/* ---------- Photo fingerprinting (average hash) ---------- */
// Photo fingerprints come from the shared "verify-reports" collection
function photoDB() {
  const out = [];
  window.TN_REPORTS.forEach(r => (r.photoHashes || []).forEach(hash =>
    out.push({ hash, date: new Date(r.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) })));
  return out;
}

// A stable id for this browser, so "You reported" only shows on your own reports
const DEVICE = (() => {
  try {
    let d = localStorage.getItem("tn_device");
    if (!d) { d = Math.random().toString(36).slice(2, 10); localStorage.setItem("tn_device", d); }
    return d;
  } catch (e) { return "anon"; }
})();

function hashImage(url) {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = 9; c.height = 8;
      const ctx = c.getContext("2d");
      ctx.drawImage(img, 0, 0, 9, 8);
      const d = ctx.getImageData(0, 0, 9, 8).data;
      // difference hash: compare each pixel with its right neighbour
      let bits = "";
      for (let y = 0; y < 8; y++) {
        for (let x = 0; x < 8; x++) {
          const i = (y * 9 + x) * 4, j = (y * 9 + x + 1) * 4;
          const a = d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114;
          const b = d[j] * 0.299 + d[j + 1] * 0.587 + d[j + 2] * 0.114;
          bits += a > b ? "1" : "0";
        }
      }
      resolve(bits);
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}
const distance = (a, b) => { let n = 0; for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) n++; return n; };

$("photos").addEventListener("change", async e => {
  const files = [...e.target.files].slice(0, 6);
  for (const f of files) {
    const url = URL.createObjectURL(f);
    const hash = await hashImage(url);
    photos.push({ name: f.name, url, hash, match: null });
  }
  e.target.value = "";
  matchPhotos();
  renderThumbs();
});

function matchPhotos() {
  const db = photoDB();
  photos.forEach(p => {
    p.match = null;
    if (!p.hash) return;
    const hit = db.find(r => distance(r.hash, p.hash) <= 6);
    if (hit) p.match = `Reported listing, ${hit.date}`;
  });
}

function renderThumbs() {
  const ul = $("thumbs");
  ul.innerHTML = "";
  photos.forEach((p, i) => {
    const li = document.createElement("li");
    li.className = p.match ? "dupe" : "";
    li.innerHTML = `<img alt=""><span></span><button type="button" aria-label="Remove photo">×</button>`;
    li.querySelector("img").src = p.url;
    li.querySelector("span").textContent = p.match ? "Seen before" : "Original";
    li.querySelector("button").addEventListener("click", () => { photos.splice(i, 1); renderThumbs(); });
    ul.append(li);
  });
}

/* ---------- Run the check ---------- */
form.addEventListener("submit", e => { e.preventDefault(); runCheck(); });

let last = null;
function runCheck() {
  const text = listing.value.trim();
  if (!text) {
    listing.focus();
    listing.placeholder = "Paste a listing first, or try one of the examples above";
    return;
  }
  matchPhotos(); renderThumbs();
  const dupes = photos.filter(p => p.match).length;
  const area = $("area").value;
  const res = scan(text, area, {
    type: $("type").value,
    rent: $("rent").value,
    deposit: $("deposit").value,
    phone: $("phone").value,
    payMethod: $("payMethod").value,
    payBeforeVisit,
    photoDupes: dupes,
    photoChecked: photos.length > 0,
    owner: { nameTold: $("ownerTold").value, nameOnDoc: $("ownerDoc").value, docUploaded: !!ownerFile }
  });
  last = { ...res, text, area };
  $("printDate").textContent = new Date().toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });
  $("printQuote").textContent = text.length > 280 ? text.slice(0, 280) + "…" : text;
  render(res);
  if (window.matchMedia("(max-width: 1024px)").matches) $("vReport").scrollIntoView({ behavior: "smooth", block: "start" });
}

function render({ score, flags, checks }) {
  $("vEmpty").hidden = true;
  $("vReport").hidden = false;
  $("reportNote").hidden = true;
  $("reportBtn").disabled = false;
  $("reportBtn").textContent = "Report this listing";

  const ring = $("ring");
  ring.classList.remove("bad", "mid");
  const level = score < 45 ? "bad" : score < 75 ? "mid" : "good";
  if (level !== "good") ring.classList.add(level);

  const V = {
    bad: ["High risk. Don't pay.", "This listing matches patterns from reported scams. Don't send any money until you've visited in person."],
    mid: ["Be careful", "Some things don't add up. Visit the place and meet the owner before paying anything."],
    good: ["Looks genuine", "No common scam signs found. Still visit first and get the agreement in writing."]
  }[level];
  $("verdictTitle").textContent = V[0];
  $("verdictText").textContent = V[1];

  const ICON = { pass: "✓", fail: "!", unknown: "?" };
  const cl = $("checks");
  cl.innerHTML = "";
  checks.forEach(c => {
    const li = document.createElement("li");
    li.className = c.state;
    li.innerHTML = `<i aria-hidden="true">${ICON[c.state]}</i><span><strong></strong><small></small></span>`;
    li.querySelector("strong").textContent = c.label;
    li.querySelector("small").textContent = c.note;
    cl.append(li);
  });

  const fl = $("flags");
  fl.innerHTML = "";
  if (!flags.length) flags = [{ bad: false, title: "No red flags found", why: "Nothing in this listing matches common scam patterns." }];
  flags.forEach((f, i) => {
    const li = document.createElement("li");
    if (!f.bad) li.className = "good";
    li.style.animationDelay = `${i * 80}ms`;
    li.innerHTML = `<span><strong></strong></span>`;
    li.querySelector("strong").textContent = f.title;
    li.querySelector("span").append(f.why);
    fl.append(li);
  });

  const NEXT = {
    bad: [
      "Don't pay any token, advance or 'booking amount'.",
      "Stop sharing personal details or documents with this number.",
      "Already paid? Call 1930 or report at cybercrime.gov.in as soon as possible.",
      "Report the listing below so other students are warned."
    ],
    mid: [
      "Visit the place in person before paying anything.",
      "Ask for an electricity bill or property paper in the owner's name.",
      "Pay only after a written rent agreement, by bank transfer with a receipt."
    ],
    good: [
      "Visit once in the evening to check water, WiFi and noise.",
      "Get a written rent agreement before paying the deposit.",
      "Take dated move-in photos of every wall and fitting."
    ]
  }[level];
  const nx = $("next");
  nx.innerHTML = "";
  NEXT.forEach(n => { const li = document.createElement("li"); li.textContent = n; nx.append(li); });

  animateScore(score);
}

function animateScore(target) {
  const ring = $("ring"), num = $("scoreNum");
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { ring.style.setProperty("--p", target); num.textContent = target; return; }
  const start = performance.now();
  (function tick(now) {
    const k = Math.min(1, (now - start) / 900);
    const v = Math.round(target * (1 - Math.pow(1 - k, 3)));
    ring.style.setProperty("--p", v);
    num.textContent = v;
    if (k < 1) requestAnimationFrame(tick);
  })(start);
}

/* ---------- Report + copy ---------- */
$("reportBtn").addEventListener("click", async () => {
  if (!last) return;
  const btn = $("reportBtn");
  btn.disabled = true;
  btn.textContent = "Reporting…";
  const user = window.TrustNestUser ? window.TrustNestUser() : null;
  const record = {
    phone: last.facts.phone || null,
    photoHashes: photos.map(p => p.hash).filter(Boolean),
    area: last.area,
    type: TYPE_LABEL[last.facts.type] || "Room",
    rent: last.facts.rent || null,
    pattern: (last.flags.find(f => f.bad) || { title: "Reported by a student" }).title,
    score: last.score,
    excerpt: last.text.slice(0, 200),
    reportedBy: user ? user.name : "Anonymous student",
    device: DEVICE
  };
  try {
    const saved = await TNDB.add("verify-reports", record);
    window.TN_REPORTS.push(saved);
  } catch (e) {
    btn.disabled = false;
    btn.textContent = "Report this listing";
    const n = $("reportNote");
    n.textContent = "Couldn't save the report. Check that the local server is running and try again.";
    n.hidden = false;
    return;
  }
  renderFeed();
  btn.textContent = "Reported ✓";
  const bits = [];
  if (last.facts.phone) bits.push("the phone number");
  if (photos.length) bits.push(`${photos.length} photo${photos.length > 1 ? "s" : ""}`);
  const note = $("reportNote");
  note.textContent = bits.length
    ? `Reported. Other students checking ${bits.join(" or ")} will now see a warning.`
    : "Reported. Add the phone number or photos next time so others get warned.";
  note.hidden = false;
});

$("copyBtn").addEventListener("click", async () => {
  if (!last) return;
  const lines = [
    `TrustNest report: ${last.score}/100 – ${$("verdictTitle").textContent}`,
    "",
    ...last.checks.map(c => `${c.state === "pass" ? "✓" : c.state === "fail" ? "✗" : "?"} ${c.label} (${c.note})`),
    "",
    ...last.flags.filter(f => f.bad).map(f => `• ${f.title}`)
  ];
  const btn = $("copyBtn");
  try { await navigator.clipboard.writeText(lines.join("\n")); btn.textContent = "Copied"; }
  catch (e) { btn.textContent = "Couldn't copy"; }
  setTimeout(() => (btn.textContent = "Copy report"), 2000);
});


/* ---------- Owner document ---------- */
let ownerFile = null;
$("ownerFile").addEventListener("change", e => {
  ownerFile = e.target.files[0] || null;
  $("ownerFileLabel").textContent = ownerFile ? `Added: ${ownerFile.name}` : "Upload the bill or receipt";
});

/* ---------- PDF ---------- */
$("pdfBtn").addEventListener("click", () => window.print());

/* ---------- Community feed ---------- */
const AREA_NAME = { rajpura: "Rajpura", zirakpur: "Zirakpur", mohali: "Mohali", chandigarh: "Chandigarh" };
const HOUR = 3600e3;
const SEED_FEED = [
  { area: "mohali", type: "2BHK", rent: 4500, pattern: "Owner can't meet you", score: 6, ago: 2 * HOUR },
  { area: "rajpura", type: "PG bed", rent: 3500, pattern: "Asks for money before you visit", score: 18, ago: 9 * HOUR },
  { area: "zirakpur", type: "1BHK", rent: 4200, pattern: "A photo was used in another listing", score: 22, ago: 27 * HOUR },
  { area: "rajpura", type: "Room", rent: 2800, pattern: "This number was reported 6 times", score: 12, ago: 51 * HOUR },
  { area: "chandigarh", type: "PG bed", rent: 5000, pattern: "Name on the document doesn't match", score: 31, ago: 4 * 24 * HOUR }
];

function feedItems() {
  const now = Date.now();
  const shared = window.TN_REPORTS.map(r => ({ ...r, ts: r.createdAt, mine: r.device === DEVICE }));
  return [...shared, ...SEED_FEED.map(s => ({ ...s, ts: now - s.ago }))].sort((a, b) => b.ts - a.ts);
}

function timeAgo(ts) {
  const m = Math.round((Date.now() - ts) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} hour${h > 1 ? "s" : ""} ago`;
  const d = Math.round(h / 24);
  return `${d} day${d > 1 ? "s" : ""} ago`;
}

function renderFeed() {
  const items = feedItems();
  const week = items.filter(i => Date.now() - i.ts < 7 * 24 * HOUR).length;
  $("feedStats").textContent = `${week} listings reported by students this week.`;
  const ul = $("feed");
  ul.innerHTML = "";
  items.slice(0, 6).forEach(i => {
    const li = document.createElement("li");
    li.className = "card" + (i.mine ? " mine" : "");
    li.innerHTML = `
      <div class="v-feed-top"><span class="v-feed-score"></span><span class="v-feed-when"></span></div>
      <strong></strong>
      <p></p>`;
    li.querySelector(".v-feed-score").textContent = `${i.score}/100`;
    if (i.score >= 45) li.querySelector(".v-feed-score").classList.add("mid");
    li.querySelector(".v-feed-when").textContent = (i.mine ? "You reported · " : i.reportedBy && i.reportedBy !== "Anonymous student" ? `${i.reportedBy.split(" ")[0]} reported · ` : i.reportedBy ? "A student reported · " : "") + timeAgo(i.ts);
    li.querySelector("strong").textContent = `${i.type} in ${AREA_NAME[i.area] || i.area}${i.rent ? ` for ₹${Number(i.rent).toLocaleString("en-IN")}` : ""}`;
    li.querySelector("p").textContent = i.pattern;
    ul.append(li);
  });
}
renderFeed();
window.TN_REPORTS_READY.then(() => renderFeed());
