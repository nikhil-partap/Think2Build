/* TrustNest landing page interactions (scanner logic lives in scanner.js) */

const listing = document.getElementById("listing");
const areaSel = document.getElementById("area");
const result = document.getElementById("result");
const ring = document.getElementById("ring");
const scoreNum = document.getElementById("scoreNum");
const verdictTitle = document.getElementById("verdictTitle");
const verdictText = document.getElementById("verdictText");
const flagsEl = document.getElementById("flags");

document.querySelectorAll("[data-preset]").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll("[data-preset]").forEach(b => b.classList.remove("on"));
    btn.classList.add("on");
    listing.value = PRESETS[btn.dataset.preset];
    areaSel.value = btn.dataset.preset === "army" ? "mohali" : "rajpura";
    runScan();
  });
});

document.getElementById("scanBtn").addEventListener("click", runScan);

function runScan() {
  const text = listing.value.trim();
  if (!text) {
    listing.focus();
    listing.placeholder = "Paste a listing first, or try one of the examples above";
    return;
  }
  const { score, flags } = scan(text, areaSel.value);
  result.hidden = false;

  ring.classList.remove("bad", "mid");
  if (score < 45) ring.classList.add("bad");
  else if (score < 75) ring.classList.add("mid");

  if (score < 45) {
    verdictTitle.textContent = "High risk. Don't pay.";
    verdictText.textContent = "This listing matches patterns from reported scams. Don't send any money until you've visited in person.";
  } else if (score < 75) {
    verdictTitle.textContent = "Be careful";
    verdictText.textContent = "Some things don't add up. Visit the place and meet the owner before paying anything.";
  } else {
    verdictTitle.textContent = "Looks genuine";
    verdictText.textContent = "No common scam signs found. Still visit first and get the agreement in writing.";
  }

  flagsEl.innerHTML = "";
  if (!flags.length) flags.push({ bad: false, title: "No red flags found", why: "Nothing in this message matches common scam patterns." });
  flags.forEach((f, i) => {
    const li = document.createElement("li");
    if (!f.bad) li.className = "good";
    li.style.animationDelay = `${i * 90}ms`;
    li.innerHTML = `<span><strong></strong></span>`;
    li.querySelector("strong").textContent = f.title;
    li.querySelector("span").append(f.why);
    flagsEl.append(li);
  });

  animateScore(score);
}

function animateScore(target) {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce) { ring.style.setProperty("--p", target); scoreNum.textContent = target; return; }
  const start = performance.now();
  const dur = 900;
  (function tick(now) {
    const k = Math.min(1, (now - start) / dur);
    const v = Math.round(target * (1 - Math.pow(1 - k, 3)));
    ring.style.setProperty("--p", v);
    scoreNum.textContent = v;
    if (k < 1) requestAnimationFrame(tick);
  })(start);
}

/* ---------------- Flatmate matcher ---------------- */
const HOUSEHOLDS = [
  { name: "Ananya & Kavya", where: "2BHK, VIP Road, Zirakpur · ₹6,500", color: "#4E9A69", initials: "AK", vibe: { sleep: 0, clean: 1, food: 0, guests: 0 } },
  { name: "Ishaan's flat", where: "3BHK, Sector 70, Mohali · ₹7,200", color: "#D08A2E", initials: "IS", vibe: { sleep: 1, clean: 0, food: 1, guests: 1 } },
  { name: "Meher & Ritika", where: "2BHK, Dhakoli · ₹5,800", color: "#5B7DB1", initials: "MR", vibe: { sleep: 1, clean: 1, food: 0, guests: 0 } }
];
const WEIGHTS = { sleep: 30, clean: 30, food: 25, guests: 15 };
const me = { sleep: 0, clean: 1, food: 0, guests: 0 };

document.querySelectorAll(".q").forEach(q => {
  q.querySelectorAll("button").forEach(b => {
    b.addEventListener("click", () => {
      q.querySelectorAll("button").forEach(x => x.classList.remove("on"));
      b.classList.add("on");
      me[q.dataset.q] = +b.dataset.v;
      renderMatches();
    });
  });
});

function renderMatches() {
  const list = HOUSEHOLDS.map(h => {
    let pct = 34;
    for (const k in WEIGHTS) if (h.vibe[k] === me[k]) pct += WEIGHTS[k] * 0.64;
    return { ...h, pct: Math.round(Math.min(98, pct)) };
  }).sort((a, b) => b.pct - a.pct);

  const el = document.getElementById("matches");
  el.innerHTML = "";
  list.forEach((h, i) => {
    const li = document.createElement("li");
    if (i === 0) li.className = "top";
    li.innerHTML = `
      <span class="avatar" style="background:${h.color}">${h.initials}</span>
      <span class="who"><strong>${h.name}</strong><span>${h.where}</span></span>
      <span class="pct"><strong>${h.pct}%</strong><span>vibe match</span></span>`;
    el.append(li);
  });
}
renderMatches();

/* ---------------- Evidence letter ---------------- */
const letterBtn = document.getElementById("letterBtn");
letterBtn.addEventListener("click", async () => {
  const text = document.querySelector(".letter").innerText +
    "\n\nI request a full refund of ₹12,000 within 7 days. Dated photos and messages are attached.\n\nRiya Malhotra";
  try {
    await navigator.clipboard.writeText(text);
    letterBtn.textContent = "Letter copied";
  } catch {
    letterBtn.textContent = "Letter ready";
  }
  setTimeout(() => (letterBtn.textContent = "Generate my letter"), 2200);
});
