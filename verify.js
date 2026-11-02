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
    ["type", "rent", "deposit", "phone", "payMethod"].forEach(id => ($(id).value = ""));
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
const PHOTO_DB_KEY = "tn_photo_db";
function photoDB() {
  try { return JSON.parse(localStorage.getItem(PHOTO_DB_KEY) || "[]"); } catch (e) { return []; }
}
function saveDB(db) {
  try { localStorage.setItem(PHOTO_DB_KEY, JSON.stringify(db)); } catch (e) {}
}

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
    photoChecked: photos.length > 0
  });
  last = { ...res, text, area };
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
$("reportBtn").addEventListener("click", () => {
  if (!last) return;
  const date = new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  // phone
  if (last.facts.phone) {
    let local = {};
    try { local = JSON.parse(localStorage.getItem("tn_reported_phones") || "{}"); } catch (e) {}
    local[last.facts.phone] = (local[last.facts.phone] || 0) + 1;
    try { localStorage.setItem("tn_reported_phones", JSON.stringify(local)); } catch (e) {}
  }
  // photos
  const db = photoDB();
  photos.forEach(p => { if (p.hash && !db.some(r => r.hash === p.hash)) db.push({ hash: p.hash, date }); });
  saveDB(db);

  $("reportBtn").textContent = "Reported";
  $("reportBtn").disabled = true;
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
