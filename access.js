/* access.js — what each visitor can use.
   Guest: browse and scan. Tenant: every tenant tool. Owner (landlord): owner tools.
   Locked areas stay visible as a blurred preview with a card that opens the
   Sign In / Sign Up flow from auth.js. Re-checks instantly after signing in or out. */
(function () {
  var page = (location.pathname.split("/").pop() || "index").replace(/\.html$/, "") || "index";

  function session() { try { return JSON.parse(localStorage.getItem("tn_auth_session") || "null"); } catch (e) { return null; } }
  function role() { var s = session(); return s ? (s.role === "landlord" ? "landlord" : "tenant") : "guest"; }

  var T = ["tenant"], TL = ["tenant", "landlord"];
  var RULES = {
    verify: [
      { sel: "#tc-inspect .in-grid", allow: TL, title: "Move-in check is for members", text: "Owners record the flat at handover. Tenants compare it after moving in. Sign in to start your check." },
      { sel: "#reportBtn", allow: TL, click: true }
    ],
    listing: [
      { sel: "#ch-rate-form", allow: T, title: "Rate your stay", text: "Only tenants can rate a room, so every StayScore comes from someone who actually lived there.", wait: true }
    ],
    flatmates: [
      { sel: "#lv-find", allow: T, title: "Find flatmates who fit", text: "Take the vibe quiz and see households that match you. Free for students." },
      { sel: "#lv-post", allow: T, title: "Post a vacancy", text: "Flatmate leaving? Sign in as a tenant to find a replacement and work out the rent split." },
      { sel: "#lv-handover", allow: TL, title: "Handover tracker", text: "Tenants and owners track the agreement, deposit and keys together." }
    ],
    protect: [
      { sel: ".pr-content", allow: T, title: "Your evidence locker", text: "Keep dated proof, write complaint letters and track them. Private to your tenant account." }
    ]
  };

  var LOCK_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>';

  function gate(el, rule, r) {
    if (el.querySelector(":scope > .ac-gate")) return;
    var wrong = r !== "guest"; // signed in, but with the other role
    var who = rule.allow.length === 1 ? (rule.allow[0] === "tenant" ? "tenants" : "owners") : "members";
    var g = document.createElement("div");
    g.className = "ac-gate";
    g.innerHTML =
      '<div class="ac-card card">' +
      '<span class="ac-icon">' + LOCK_SVG + "</span>" +
      "<h3></h3><p></p>" +
      '<button type="button" class="btn btn-solid ac-btn"></button>' +
      (wrong ? "" : '<small>New here? Creating an account takes 20 seconds.</small>') +
      "</div>";
    g.querySelector("h3").textContent = wrong ? "This is for " + who : (rule.title || "Sign in to use this");
    g.querySelector("p").textContent = wrong
      ? "You're signed in as " + (r === "landlord" ? "an owner" : "a tenant") + ". Switch to a " + (rule.allow[0] === "tenant" ? "tenant" : "owner") + " account to use this."
      : (rule.text || "Sign in or create a free account to continue.");
    g.querySelector(".ac-btn").textContent = wrong ? "Switch account" : "Sign in or sign up";
    g.querySelector(".ac-btn").addEventListener("click", function () {
      if (wrong) { try { localStorage.removeItem("tn_auth_session"); } catch (e) {} }
      if (window.TrustNestAuth) window.TrustNestAuth.open();
    });
    el.classList.add("ac-locked");
    Array.prototype.forEach.call(el.children, function (c) { if (c !== g) c.setAttribute("inert", ""); });
    el.appendChild(g);
  }

  function ungate(el) {
    el.classList.remove("ac-locked");
    var g = el.querySelector(":scope > .ac-gate");
    if (g) g.remove();
    Array.prototype.forEach.call(el.children, function (c) { c.removeAttribute("inert"); });
  }

  // click-guard for single buttons (e.g. "Report this listing")
  var guarded = [];
  document.addEventListener("click", function (e) {
    var r = role();
    for (var i = 0; i < guarded.length; i++) {
      var rule = guarded[i];
      if (e.target.closest && e.target.closest(rule.sel) && rule.allow.indexOf(r) === -1) {
        e.preventDefault(); e.stopImmediatePropagation();
        toast(r === "guest" ? "Sign in to report listings, so reports come from real students." : "Switch account to use this.");
        if (window.TrustNestAuth) window.TrustNestAuth.open();
        return;
      }
    }
  }, true);

  function toast(msg) {
    var t = document.createElement("div");
    t.className = "ac-toast"; t.textContent = msg; t.setAttribute("role", "status");
    document.body.appendChild(t);
    setTimeout(function () { t.classList.add("out"); }, 2600);
    setTimeout(function () { t.remove(); }, 3100);
  }

  function apply() {
    var r = role();
    document.documentElement.dataset.role = r;
    guarded = [];
    (RULES[page] || []).forEach(function (rule) {
      if (rule.click) { guarded.push(rule); return; }
      var el = document.querySelector(rule.sel);
      if (!el) return;
      if (rule.allow.indexOf(r) === -1) gate(el, rule, r); else ungate(el);
    });
    // Move-in check: the role comes from the account, not a toggle
    if (page === "verify") {
      var btn = document.querySelector('.in-role [data-role="' + (r === "landlord" ? "landlord" : "tenant") + '"]');
      var box = document.querySelector(".in-role");
      if (box) box.hidden = r !== "guest";
      if (btn && r !== "guest" && !btn.classList.contains("on")) btn.click();
    }
    badge(r);
  }

  // role chip next to the nav button
  function badge(r) {
    var nav = document.querySelector(".nav .btn-solid");
    var old = document.querySelector(".ac-role");
    if (old) old.remove();
    if (!nav || r === "guest") return;
    var chip = document.createElement("span");
    chip.className = "ac-role " + r;
    chip.textContent = r === "landlord" ? "Owner" : "Tenant";
    nav.parentNode.insertBefore(chip, nav);
  }

  document.addEventListener("tn:auth", function () { setTimeout(apply, 0); });
  window.addEventListener("storage", function (e) { if (e.key === "tn_auth_session") apply(); });

  // some sections are drawn by page scripts after load (e.g. the rate form)
  function start() {
    apply();
    var tries = 0;
    var iv = setInterval(function () { apply(); if (++tries > 12) clearInterval(iv); }, 250);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
  window.TrustNestAccess = { role: role, refresh: apply };
})();
