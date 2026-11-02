/* ============================================================
   auth.js — TrustNest Sign In / Sign Up
   Plain vanilla JS — no build step, no modules
   localStorage key: tn_auth_accounts
   ============================================================ */

(function () {
  "use strict";

  /* ── tiny helpers ── */
  function esc(s) {
    return String(s || "")
      .replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $$(sel, ctx) { return Array.from((ctx || document).querySelectorAll(sel)); }

  /* ── localStorage ── */
  function getAccounts() {
    try { return JSON.parse(localStorage.getItem("tn_auth_accounts") || "[]"); }
    catch (e) { return []; }
  }
  function saveAccount(acc) {
    var accounts = getAccounts();
    accounts.push(acc);
    localStorage.setItem("tn_auth_accounts", JSON.stringify(accounts));
  }
  function getSession() {
    try { return JSON.parse(localStorage.getItem("tn_auth_session") || "null"); }
    catch (e) { return null; }
  }
  function saveSession(sess) {
    localStorage.setItem("tn_auth_session", JSON.stringify(sess));
  }
  function clearSession() {
    localStorage.removeItem("tn_auth_session");
  }
  function findAccount(email) {
    return getAccounts().find(function (a) {
      return a.email.toLowerCase() === email.toLowerCase();
    });
  }

  /* ── Validation helpers ── */
  function isEmail(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()); }
  function isPhone(v) { return /^[6-9]\d{9}$/.test(v.replace(/[\s\-]/g, "")); }
  function isEmailOrPhone(v) { return isEmail(v) || isPhone(v); }

  function pwStrength(pw) {
    var score = 0;
    if (pw.length >= 8)  score++;
    if (pw.length >= 12) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    if (score <= 1) return { level: 1, label: "Too weak", cls: "au-s-weak" };
    if (score === 2) return { level: 2, label: "Fair", cls: "au-s-fair" };
    if (score === 3) return { level: 3, label: "Good", cls: "au-s-good" };
    return { level: 4, label: "Strong", cls: "au-s-strong" };
  }

  /* ── DOM references — built lazily ── */
  var overlay, screen;
  var currentRole = null;  /* "tenant" | "landlord" */
  var currentMode = null;  /* "signin" | "signup" */

  /* ══════════════════════════════════════════
     SVG ICONS (inline, no external files)
  ══════════════════════════════════════════ */
  var LOGO_SVG = '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16 4 4 13.5V27a1 1 0 0 0 1 1h22a1 1 0 0 0 1-1V13.5Z" fill="currentColor"/><path d="M16 25c-4.5-2.4-7-5.3-7-8.6 0-2.3 1.8-4 3.8-4 1.4 0 2.5.7 3.2 1.8.7-1.1 1.8-1.8 3.2-1.8 2 0 3.8 1.7 3.8 4 0 3.3-2.5 6.2-7 8.6Z" fill="#D3DDD4"/></svg>';

  var TENANT_SVG = '<svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="40" cy="40" r="40" fill="#E8F4EC" opacity="0"/><rect x="15" y="35" width="50" height="32" rx="4" fill="#4E9A69" opacity="0.15"/><path d="M10 38 40 16 70 38" stroke="#2E7D4F" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><rect x="25" y="38" width="30" height="29" rx="3" fill="#2E7D4F" opacity="0.12"/><rect x="33" y="50" width="14" height="17" rx="2" fill="#2E7D4F" opacity="0.3"/><rect x="25" y="40" width="12" height="10" rx="2" fill="#4E9A69" opacity="0.4"/><rect x="43" y="40" width="12" height="10" rx="2" fill="#4E9A69" opacity="0.4"/><circle cx="56" cy="54" r="8" fill="#9DC3A8"/><path d="M52.5 54.5 55 57l5-5" stroke="#2E7D4F" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  var LANDLORD_SVG = '<svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="12" y="28" width="56" height="38" rx="4" fill="#C0622F" opacity="0.12"/><path d="M8 32 40 12 72 32" stroke="#B5703A" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><rect x="20" y="32" width="16" height="16" rx="2" fill="#B5703A" opacity="0.3"/><rect x="44" y="32" width="16" height="16" rx="2" fill="#B5703A" opacity="0.3"/><rect x="32" y="50" width="16" height="16" rx="2" fill="#B5703A" opacity="0.25"/><circle cx="56" cy="54" r="9" fill="#E2A07A" opacity="0.9"/><path d="M52 54h8M56 50v8" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/></svg>';

  var ARROW_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>';
  var CHECK_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 5 5L19 7"/></svg>';
  var EYE_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="12" rx="8" ry="5"/><circle cx="12" cy="12" r="2"/></svg>';
  var EYE_OFF_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>';
  var BACK_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>';
  var ERR_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>';
  var MAIL_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 7L2 7"/></svg>';

  /* Left-side illustrations */
  function tenantIllus() {
    return '<svg viewBox="0 0 240 180" fill="none" xmlns="http://www.w3.org/2000/svg">' +
      '<rect x="20" y="60" width="200" height="110" rx="8" fill="rgba(255,255,255,0.08)"/>' +
      '<path d="M18 72 120 18 222 72" stroke="rgba(255,255,255,0.4)" stroke-width="3" stroke-linecap="round"/>' +
      '<rect x="36" y="74" width="54" height="96" rx="4" fill="rgba(255,255,255,0.1)"/>' +
      '<rect x="104" y="74" width="54" height="55" rx="4" fill="rgba(255,255,255,0.1)"/>' +
      '<rect x="158" y="74" width="44" height="55" rx="4" fill="rgba(255,255,255,0.08)"/>' +
      '<rect x="104" y="138" width="44" height="32" rx="4" fill="rgba(255,255,255,0.15)"/>' +
      '<circle cx="190" cy="130" r="24" fill="rgba(78,154,105,0.35)"/>' +
      '<path d="M181 130l5 5 9-10" stroke="rgba(255,255,255,0.9)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<rect x="44" y="88" width="16" height="12" rx="2" fill="rgba(255,255,255,0.2)"/>' +
      '<rect x="68" y="88" width="16" height="12" rx="2" fill="rgba(255,255,255,0.2)"/>' +
      '<rect x="44" y="108" width="16" height="12" rx="2" fill="rgba(255,255,255,0.2)"/>' +
      '<rect x="68" y="108" width="16" height="12" rx="2" fill="rgba(255,255,255,0.2)"/>' +
      '</svg>';
  }

  function landlordIllus() {
    return '<svg viewBox="0 0 240 180" fill="none" xmlns="http://www.w3.org/2000/svg">' +
      '<rect x="14" y="50" width="212" height="120" rx="8" fill="rgba(255,255,255,0.06)"/>' +
      '<path d="M12 64 120 12 228 64" stroke="rgba(255,255,255,0.35)" stroke-width="3" stroke-linecap="round"/>' +
      '<rect x="28" y="66" width="64" height="104" rx="4" fill="rgba(255,255,255,0.08)"/>' +
      '<rect x="104" y="66" width="52" height="50" rx="4" fill="rgba(255,255,255,0.08)"/>' +
      '<rect x="166" y="66" width="52" height="50" rx="4" fill="rgba(255,255,255,0.08)"/>' +
      '<rect x="104" y="126" width="114" height="44" rx="4" fill="rgba(255,255,255,0.1)"/>' +
      '<circle cx="185" cy="120" r="26" fill="rgba(181,112,58,0.4)"/>' +
      '<path d="M177 120h16M185 112v16" stroke="rgba(255,255,255,0.9)" stroke-width="2.5" stroke-linecap="round"/>' +
      '<rect x="38" y="80" width="18" height="14" rx="2" fill="rgba(255,255,255,0.18)"/>' +
      '<rect x="62" y="80" width="18" height="14" rx="2" fill="rgba(255,255,255,0.18)"/>' +
      '<rect x="38" y="102" width="18" height="14" rx="2" fill="rgba(255,255,255,0.18)"/>' +
      '<rect x="62" y="102" width="18" height="14" rx="2" fill="rgba(255,255,255,0.18)"/>' +
      '</svg>';
  }

  /* ══════════════════════════════════════════
     INJECT NAV SIGN-IN BUTTON
  ══════════════════════════════════════════ */
  function injectNavButton() {
    var navBtn = $(".nav .btn-solid");
    if (!navBtn) return;

    var session = getSession();
    if (session) {
      navBtn.textContent = "Hi, " + session.name.split(" ")[0];
      navBtn.addEventListener("click", function (e) {
        e.preventDefault();
        if (confirm("Sign out from TrustNest?")) {
          clearSession();
          window.location.reload();
        }
      });
      return;
    }

    /* Replace "Get started" / "Home" with "Sign In" */
    navBtn.innerHTML = '<span class="au-nav-signin">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>' +
      'Sign In</span>';
    navBtn.addEventListener("click", function (e) {
      e.preventDefault();
      openAuth();
    });
  }

  /* ══════════════════════════════════════════
     OPEN / CLOSE
  ══════════════════════════════════════════ */
  function openAuth(panel) {
    if (overlay) { overlay.remove(); }

    overlay = document.createElement("div");
    overlay.className = "au-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-label", "Sign in or create account");

    screen = document.createElement("div");
    screen.className = "au-screen";
    overlay.appendChild(screen);
    document.body.appendChild(overlay);
    document.body.style.overflow = "hidden";

    /* Close on backdrop click */
    overlay.addEventListener("click", function (e) {
      if (e.target === overlay) closeAuth();
    });

    /* Close on Escape */
    document._auKeyHandler = function (e) {
      if (e.key === "Escape") closeAuth();
    };
    document.addEventListener("keydown", document._auKeyHandler);

    showRolePanel();
  }

  function closeAuth() {
    if (!overlay) return;
    overlay.classList.add("au-closing");
    setTimeout(function () {
      if (overlay) { overlay.remove(); overlay = null; }
      document.body.style.overflow = "";
      document.removeEventListener("keydown", document._auKeyHandler);
    }, 220);
  }

  /* ══════════════════════════════════════════
     PANEL: ROLE SELECTION
  ══════════════════════════════════════════ */
  function showRolePanel() {
    screen.innerHTML = "";
    var panel = document.createElement("div");
    panel.className = "au-panel au-active";
    panel.innerHTML = buildRolePanel();
    screen.appendChild(panel);

    /* Close btn */
    panel.querySelector(".au-close").addEventListener("click", closeAuth);

    /* Role cards */
    panel.querySelectorAll(".au-role-card").forEach(function (card) {
      card.addEventListener("click", function () {
        panel.querySelectorAll(".au-role-card").forEach(function (c) { c.classList.remove("au-selected"); });
        card.classList.add("au-selected");
        var role = card.dataset.role;
        /* brief pause so user sees the selected state */
        setTimeout(function () {
          currentRole = role;
          currentMode = "signup";
          transitionTo("right", showAuthPanel);
        }, 280);
      });
      card.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); card.click(); }
      });
    });
  }

  function buildRolePanel() {
    return '<div class="au-role-panel">' +
      /* blobs */
      '<div class="au-blob au-blob-1"></div>' +
      '<div class="au-blob au-blob-2"></div>' +
      '<div class="au-blob au-blob-3"></div>' +
      /* deco */
      '<div class="au-deco au-deco-1"></div>' +
      '<div class="au-deco au-deco-2"></div>' +
      '<div class="au-deco au-deco-3"></div>' +
      /* close */
      '<button class="au-close" aria-label="Close">&times;</button>' +
      /* header */
      '<div class="au-role-header">' +
      '<a class="au-logo-link" href="index.html">' + LOGO_SVG + '<span>TrustNest</span></a>' +
      '<h1>Welcome to your next<br>safe stay.</h1>' +
      '<p>How would you like to use TrustNest?</p>' +
      '</div>' +
      /* cards */
      '<div class="au-role-cards">' +
      buildRoleCard("tenant", "Find your safe space.", "Discover verified rooms, trustworthy landlords, and compatible flatmates near your campus.", "Continue as Tenant", TENANT_SVG, "au-role-illus-tenant") +
      buildRoleCard("landlord", "Find your next tenant.", "List your property, connect with genuine students, and manage your rentals with confidence.", "Continue as Landlord", LANDLORD_SVG, "au-role-illus-landlord") +
      '</div>' +
      '<p class="au-role-footer">By continuing you agree to our <a href="#">Terms of Service</a> and <a href="#">Privacy Policy</a>.</p>' +
      '</div>';
  }

  function buildRoleCard(role, heading, desc, cta, illusSVG, illusClass) {
    return '<div class="au-role-card" data-role="' + role + '" tabindex="0" role="button" aria-label="' + esc(cta) + '">' +
      '<div class="au-role-check" aria-hidden="true">' + CHECK_SVG + '</div>' +
      '<div class="au-role-illus ' + illusClass + '">' + illusSVG + '</div>' +
      '<h3>' + esc(heading) + '</h3>' +
      '<p>' + esc(desc) + '</p>' +
      '<span class="au-role-cta">' + esc(cta) +
      '<span class="au-role-cta-arrow">' + ARROW_SVG + '</span>' +
      '</span>' +
      '</div>';
  }

  /* ══════════════════════════════════════════
     PANEL TRANSITION
  ══════════════════════════════════════════ */
  function transitionTo(direction, buildFn) {
    var old = screen.querySelector(".au-panel.au-active");
    if (old) {
      old.classList.add("au-exit-left");
      setTimeout(function () { if (old.parentNode) old.parentNode.removeChild(old); }, 250);
    }
    setTimeout(function () {
      var panel = document.createElement("div");
      panel.className = "au-panel au-active " + (direction === "right" ? "au-enter-right" : "au-enter-left");
      screen.appendChild(panel);
      buildFn(panel);
      screen.scrollTop = 0;
    }, 80);
  }

  /* ══════════════════════════════════════════
     PANEL: AUTH FORM (Sign In / Sign Up)
  ══════════════════════════════════════════ */
  function showAuthPanel(panel) {
    panel.innerHTML = buildAuthPanel();
    wireAuthPanel(panel);
  }

  /* ── Left side content per role ── */
  var LEFT_CONTENT = {
    tenant: {
      badge: "Signing in as Tenant",
      h2: "Your safe nest, away from home.",
      p: "Verified rooms, honest reviews and flatmates who fit. Everything a student needs to rent with confidence.",
      illus: tenantIllus,
      trust: ["Verified listings near your campus", "Safe rental process, step by step", "Trusted by students across Punjab"]
    },
    landlord: {
      badge: "Signing in as Landlord",
      h2: "Connect with genuine students.",
      p: "List your property, get genuine enquiries from verified students, and manage your rentals without the hassle.",
      illus: landlordIllus,
      trust: ["Connect with verified students", "Secure rental agreements", "Trusted landlord community"]
    }
  };

  function buildAuthPanel() {
    var lc = LEFT_CONTENT[currentRole] || LEFT_CONTENT.tenant;
    var isSignUp = currentMode === "signup";

    var leftHTML =
      '<div class="au-auth-left">' +
      '<a class="au-left-logo" href="index.html">' + LOGO_SVG + '<span>TrustNest</span></a>' +
      '<div class="au-left-body">' +
      '<div class="au-role-badge">' +
      (currentRole === "tenant"
        ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>'
        : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="9" width="18" height="13" rx="2"/><path d="M9 22V12h6v10M3 9l9-6 9 6"/></svg>') +
      esc(lc.badge) + '</div>' +
      '<h2>' + esc(lc.h2) + '</h2>' +
      '<p>' + esc(lc.p) + '</p>' +
      '<div class="au-left-illus">' + lc.illus() + '</div>' +
      '</div>' +
      '<ul class="au-trust-list">' +
      lc.trust.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join("") +
      '</ul>' +
      '</div>';

    var rightHTML =
      '<div class="au-auth-right">' +
      '<button class="au-back-btn" id="au-back">' + BACK_SVG + ' Back</button>' +
      '<div class="au-tab-row" role="tablist">' +
      '<button class="au-tab' + (isSignUp ? "" : " au-tab-active") + '" id="au-tab-signin" role="tab" aria-selected="' + (!isSignUp) + '">Sign In</button>' +
      '<button class="au-tab' + (isSignUp ? " au-tab-active" : "") + '" id="au-tab-signup" role="tab" aria-selected="' + isSignUp + '">Create Account</button>' +
      '</div>' +
      '<div id="au-form-area"></div>' +
      '</div>';

    return '<div class="au-auth-panel">' + leftHTML + rightHTML + '</div>';
  }

  function wireAuthPanel(panel) {
    /* back */
    panel.querySelector("#au-back").addEventListener("click", function () {
      transitionTo("left", showRolePanel.bind(null, null));
      /* fix: showRolePanel ignores its argument */
      screen.querySelectorAll(".au-panel:not(.au-active)").forEach(function (p) {
        p.parentNode && p.parentNode.removeChild(p);
      });
    });

    /* tabs */
    panel.querySelector("#au-tab-signin").addEventListener("click", function () { switchMode(panel, "signin"); });
    panel.querySelector("#au-tab-signup").addEventListener("click", function () { switchMode(panel, "signup"); });

    renderForm(panel);
  }

  function switchMode(panel, mode) {
    currentMode = mode;
    var tabs = panel.querySelectorAll(".au-tab");
    tabs.forEach(function (t) {
      var isActive = (mode === "signin" && t.id === "au-tab-signin") ||
                     (mode === "signup" && t.id === "au-tab-signup");
      t.classList.toggle("au-tab-active", isActive);
      t.setAttribute("aria-selected", isActive);
    });
    renderForm(panel);
  }

  /* ── Render the form contents ── */
  function renderForm(panel) {
    var area = panel.querySelector("#au-form-area");
    area.innerHTML = currentMode === "signup" ? buildSignUpForm() : buildSignInForm();
    wireForm(panel, area);
    /* animate in */
    area.style.animation = "au-fade-up 0.28s ease both";
    setTimeout(function () { area.style.animation = ""; }, 300);
  }

  /* ─── SIGN UP FORM ─── */
  function buildSignUpForm() {
    var isTenant = currentRole === "tenant";
    return '<div class="au-form-heading">' +
      '<h2>' + (isTenant ? "Create your account" : "Register as a landlord") + '</h2>' +
      '<p>' + (isTenant ? "Join thousands of students renting safely." : "Start connecting with verified students.") + '</p>' +
      '</div>' +
      '<div id="au-error-banner" class="au-error-banner" hidden>' + ERR_SVG + '<span id="au-error-text"></span></div>' +
      '<form id="au-signup-form" class="au-form" novalidate>' +
      '<div class="au-form-grid">' +
      field("au-name", "Full Name", "text", "Priya Sharma", false, false, 'autocomplete="name"') +
      field("au-email", "Email Address", "email", "you@example.com", false, true, 'autocomplete="email"') +
      field("au-phone", "Phone Number", "tel", "98765 43210", false, true, 'inputmode="tel" autocomplete="tel"') +
      (isTenant ? field("au-college", "College / University", "text", "Chitkara University", false, false) : "") +
      (isTenant ? field("au-city", "Current City", "text", "Rajpura", false, false) : "") +
      (!isTenant ? field("au-location", "Property Location", "text", "Phase 7, Mohali", false, false) : "") +
      (!isTenant ? selectField("au-proptype", "Property Type", [
        { v: "", l: "Select type" },
        { v: "pg", l: "PG" },
        { v: "flat", l: "Flat" },
        { v: "hostel", l: "Hostel" },
        { v: "room", l: "Independent Room" }
      ]) : "") +
      pwField("au-pw", "Password") +
      pwField("au-cpw", "Confirm Password") +
      '</div>' +
      '<div class="au-strength" id="au-strength" style="margin-top:0">' +
      '<div class="au-strength-bars"><div class="au-strength-bar" id="ausb0"></div><div class="au-strength-bar" id="ausb1"></div><div class="au-strength-bar" id="ausb2"></div><div class="au-strength-bar" id="ausb3"></div></div>' +
      '<span class="au-strength-label" id="au-strength-label"></span>' +
      '</div>' +
      '<label class="au-checkbox-row" style="margin-top:14px">' +
      '<input type="checkbox" id="au-terms"> I agree to the <a href="#">Terms of Service</a> and <a href="#">Privacy Policy</a>' +
      '</label>' +
      '<button type="submit" class="au-submit" id="au-submit-btn">Create Account</button>' +
      '<p class="au-switch-row">Already have an account? <button type="button" id="au-go-signin">Sign In</button></p>' +
      '</form>';
  }

  /* ─── SIGN IN FORM ─── */
  function buildSignInForm() {
    var isTenant = currentRole === "tenant";
    return '<div class="au-form-heading">' +
      '<h2>Welcome back</h2>' +
      '<p>' + (isTenant ? "Sign in to your tenant account." : "Sign in as a landlord.") + '</p>' +
      '</div>' +
      '<div id="au-error-banner" class="au-error-banner" hidden>' + ERR_SVG + '<span id="au-error-text"></span></div>' +
      '<form id="au-signin-form" class="au-form" novalidate>' +
      '<div class="au-form-grid au-single">' +
      field("au-login-id", "Email Address or Phone", "text", "you@example.com or 98765 43210", true, true, 'autocomplete="username"') +
      pwField("au-login-pw", "Password", true) +
      '</div>' +
      '<div class="au-signin-meta">' +
      '<label class="au-checkbox-row" style="margin-top:0">' +
      '<input type="checkbox" id="au-remember"> Remember me' +
      '</label>' +
      '<button type="button" class="au-forgot" id="au-forgot-btn">Forgot password?</button>' +
      '</div>' +
      '<button type="submit" class="au-submit" id="au-submit-btn">Sign In</button>' +
      '<p class="au-switch-row">Don\'t have an account? <button type="button" id="au-go-signup">Create one</button></p>' +
      '</form>';
  }

  /* ─── Form field builders ─── */
  function field(id, label, type, ph, fullWidth, hasIcon, extraAttrs) {
    return '<div class="au-field' + (fullWidth ? " au-full" : "") + '">' +
      '<label for="' + id + '">' + esc(label) + '</label>' +
      '<div class="au-field-wrap">' +
      '<input type="' + type + '" id="' + id + '" placeholder="' + esc(ph) + '" ' + (extraAttrs || "") + '>' +
      (hasIcon ? '<span class="au-field-icon" aria-hidden="true">' +
        (type === "email" ? MAIL_SVG : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>') +
        '</span>' : "") +
      '</div>' +
      '<span class="au-field-error" id="' + id + '-err" aria-live="polite"></span>' +
      '</div>';
  }

  function pwField(id, label, fullWidth) {
    return '<div class="au-field' + (fullWidth ? " au-full" : "") + '">' +
      '<label for="' + id + '">' + esc(label) + '</label>' +
      '<div class="au-field-wrap">' +
      '<input type="password" id="' + id + '" placeholder="••••••••" autocomplete="' + (id.indexOf("cpw") !== -1 ? "new-password" : id.indexOf("signup") !== -1 || id === "au-pw" ? "new-password" : "current-password") + '">' +
      '<button type="button" class="au-toggle-pass" aria-label="Show password" data-target="' + id + '">' + EYE_SVG + '</button>' +
      '</div>' +
      '<span class="au-field-error" id="' + id + '-err" aria-live="polite"></span>' +
      '</div>';
  }

  function selectField(id, label, opts) {
    return '<div class="au-field">' +
      '<label for="' + id + '">' + esc(label) + '</label>' +
      '<div class="au-field-wrap">' +
      '<select id="' + id + '">' +
      opts.map(function (o) { return '<option value="' + esc(o.v) + '">' + esc(o.l) + '</option>'; }).join("") +
      '</select>' +
      '</div>' +
      '<span class="au-field-error" id="' + id + '-err" aria-live="polite"></span>' +
      '</div>';
  }

  /* ── Wire form events ── */
  function wireForm(panel, area) {
    /* show/hide password toggles */
    area.querySelectorAll(".au-toggle-pass").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var inp = area.querySelector("#" + btn.dataset.target);
        if (!inp) return;
        var isText = inp.type === "text";
        inp.type = isText ? "password" : "text";
        btn.innerHTML = isText ? EYE_SVG : EYE_OFF_SVG;
        btn.setAttribute("aria-label", isText ? "Show password" : "Hide password");
      });
    });

    /* password strength */
    var pwInp = area.querySelector("#au-pw");
    if (pwInp) {
      pwInp.addEventListener("input", function () {
        updateStrength(area, pwInp.value);
      });
    }

    /* real-time validation on blur */
    area.querySelectorAll("input, select").forEach(function (inp) {
      inp.addEventListener("blur", function () { validateField(inp, area); });
      inp.addEventListener("input", function () {
        if (inp.classList.contains("au-error")) validateField(inp, area);
      });
    });

    /* switch links */
    var goSignin = area.querySelector("#au-go-signin");
    if (goSignin) goSignin.addEventListener("click", function () { switchMode(panel, "signin"); });
    var goSignup = area.querySelector("#au-go-signup");
    if (goSignup) goSignup.addEventListener("click", function () { switchMode(panel, "signup"); });

    /* forgot password */
    var forgotBtn = area.querySelector("#au-forgot-btn");
    if (forgotBtn) forgotBtn.addEventListener("click", function () { showForgotPanel(panel); });

    /* form submit */
    var signupForm = area.querySelector("#au-signup-form");
    if (signupForm) signupForm.addEventListener("submit", handleSignUp.bind(null, panel, area));

    var signinForm = area.querySelector("#au-signin-form");
    if (signinForm) signinForm.addEventListener("submit", handleSignIn.bind(null, panel, area));
  }

  /* ── Validation ── */
  function setErr(area, id, msg) {
    var inp = area.querySelector("#" + id);
    var err = area.querySelector("#" + id + "-err");
    if (inp) inp.classList.toggle("au-error", !!msg);
    if (inp) inp.classList.toggle("au-valid", !msg && inp.value.trim() !== "");
    if (err) err.textContent = msg || "";
  }

  function validateField(inp, area) {
    var id = inp.id;
    var v = inp.value.trim();
    var msg = "";
    if (id === "au-name" && v.length < 2) msg = "Please enter your full name.";
    if (id === "au-email" && v && !isEmail(v)) msg = "Enter a valid email address.";
    if (id === "au-phone" && v && !isPhone(v)) msg = "Enter a valid 10-digit mobile number.";
    if (id === "au-pw" && v.length > 0 && v.length < 8) msg = "Password must be at least 8 characters.";
    if (id === "au-cpw") {
      var pw = area.querySelector("#au-pw");
      if (pw && v !== pw.value) msg = "Passwords don't match.";
    }
    if (id === "au-login-id" && v && !isEmailOrPhone(v)) msg = "Enter a valid email or phone number.";
    if (id === "au-proptype" && !v) msg = "Please select a property type.";
    setErr(area, id, msg);
    return !msg;
  }

  function updateStrength(area, pw) {
    var bars = [0,1,2,3].map(function (i) { return area.querySelector("#ausb" + i); });
    var lbl = area.querySelector("#au-strength-label");
    if (!bars[0] || !pw) return;
    var s = pwStrength(pw);
    bars.forEach(function (bar, i) {
      bar.className = "au-strength-bar";
      if (i < s.level) bar.classList.add(s.cls);
    });
    if (lbl) {
      lbl.textContent = pw ? s.label : "";
      lbl.className = "au-strength-label " + (pw ? s.cls : "");
    }
  }

  /* ── Sign Up handler ── */
  function handleSignUp(panel, area, e) {
    e.preventDefault();
    var form = e.target;
    var valid = true;

    var nameVal = (area.querySelector("#au-name") || {}).value || "";
    var emailVal = (area.querySelector("#au-email") || {}).value || "";
    var phoneVal = (area.querySelector("#au-phone") || {}).value || "";
    var pwVal = (area.querySelector("#au-pw") || {}).value || "";
    var cpwVal = (area.querySelector("#au-cpw") || {}).value || "";
    var terms = area.querySelector("#au-terms");

    if (nameVal.trim().length < 2) { setErr(area, "au-name", "Please enter your full name."); valid = false; }
    else setErr(area, "au-name", "");

    if (!isEmail(emailVal.trim())) { setErr(area, "au-email", "Enter a valid email address."); valid = false; }
    else setErr(area, "au-email", "");

    if (!isPhone(phoneVal)) { setErr(area, "au-phone", "Enter a valid 10-digit mobile number."); valid = false; }
    else setErr(area, "au-phone", "");

    if (pwVal.length < 8) { setErr(area, "au-pw", "Password must be at least 8 characters."); valid = false; }
    else setErr(area, "au-pw", "");

    if (pwVal !== cpwVal) { setErr(area, "au-cpw", "Passwords don't match."); valid = false; }
    else if (cpwVal) setErr(area, "au-cpw", "");

    if (terms && !terms.checked) {
      showBanner(area, "Please accept the Terms of Service to continue.");
      valid = false;
    }

    /* Check duplicate email */
    if (valid && findAccount(emailVal.trim())) {
      showBanner(area, "An account with this email already exists. Sign in instead.");
      valid = false;
    }

    if (!valid) return;

    /* Loading state */
    var btn = area.querySelector("#au-submit-btn");
    btn.disabled = true;
    btn.classList.add("au-loading");
    btn.innerHTML = '<span class="au-spinner"></span> Creating account…';

    /* Simulate async (no real backend) */
    setTimeout(function () {
      var account = {
        name: nameVal.trim(),
        email: emailVal.trim().toLowerCase(),
        phone: phoneVal.replace(/\D/g, ""),
        role: currentRole,
        college: ((area.querySelector("#au-college") || {}).value || "").trim(),
        city: ((area.querySelector("#au-city") || {}).value || "").trim(),
        location: ((area.querySelector("#au-location") || {}).value || "").trim(),
        proptype: ((area.querySelector("#au-proptype") || {}).value || ""),
        /* NOTE: In production, NEVER store plain-text passwords. Use bcrypt/Argon2. */
        _pwHash: btoa(pwVal),  /* demo only — base64 is NOT secure hashing */
        createdAt: new Date().toISOString()
      };
      saveAccount(account);
      saveSession({ name: account.name, email: account.email, role: account.role });
      showSuccessPanel();
    }, 1400);
  }

  /* ── Sign In handler ── */
  function handleSignIn(panel, area, e) {
    e.preventDefault();
    var loginId = (area.querySelector("#au-login-id") || {}).value || "";
    var pw = (area.querySelector("#au-login-pw") || {}).value || "";
    var valid = true;

    if (!isEmailOrPhone(loginId.trim())) {
      setErr(area, "au-login-id", "Enter a valid email or phone number."); valid = false;
    } else setErr(area, "au-login-id", "");

    if (pw.length < 1) {
      setErr(area, "au-login-pw", "Please enter your password."); valid = false;
    } else setErr(area, "au-login-pw", "");

    if (!valid) return;

    var btn = area.querySelector("#au-submit-btn");
    btn.disabled = true;
    btn.classList.add("au-loading");
    btn.innerHTML = '<span class="au-spinner"></span> Signing in…';

    setTimeout(function () {
      /* Demo: accept any existing account OR a demo shortcut */
      var acct = findAccount(loginId.trim());
      var isDemoShortcut = (loginId.trim() === "demo" || loginId.trim() === "student@chitkara.edu");

      if (!acct && !isDemoShortcut) {
        btn.disabled = false;
        btn.classList.remove("au-loading");
        btn.innerHTML = "Sign In";
        showBanner(area, "No account found with this email or phone. Create one first.");
        return;
      }

      /* NOTE: demo only — real auth needs server-side password verification */
      if (acct && acct._pwHash !== btoa(pw) && !isDemoShortcut) {
        btn.disabled = false;
        btn.classList.remove("au-loading");
        btn.innerHTML = "Sign In";
        showBanner(area, "Incorrect password. Please try again.");
        return;
      }

      var name = acct ? acct.name : "Demo User";
      var role = acct ? acct.role : currentRole;
      saveSession({ name: name, email: acct ? acct.email : loginId.trim(), role: role });
      showSuccessPanel(true /* isSignIn */);
    }, 1200);
  }

  function showBanner(area, msg) {
    var banner = area.querySelector("#au-error-banner");
    var text = area.querySelector("#au-error-text");
    if (banner && text) { text.textContent = msg; banner.hidden = false; }
  }

  /* ── Forgot password ── */
  function showForgotPanel(panel) {
    var forgot = document.createElement("div");
    forgot.className = "au-panel au-active au-enter-right";
    forgot.innerHTML =
      '<div class="au-forgot-panel">' +
      '<button class="au-back-btn" id="au-back-forgot">' + BACK_SVG + ' Back to Sign In</button>' +
      '<h2>Reset your password</h2>' +
      '<p>Enter your registered email address and we\'ll send you a reset link.</p>' +
      '<div id="au-forgot-content">' +
      '<div class="au-field au-full" style="margin-bottom:16px">' +
      '<label for="au-forgot-email">Email Address</label>' +
      '<div class="au-field-wrap">' +
      '<input type="email" id="au-forgot-email" placeholder="you@example.com" autocomplete="email">' +
      '<span class="au-field-icon" aria-hidden="true">' + MAIL_SVG + '</span>' +
      '</div>' +
      '<span class="au-field-error" id="au-forgot-email-err" aria-live="polite"></span>' +
      '</div>' +
      '<div id="au-error-banner" class="au-error-banner" hidden>' + ERR_SVG + '<span id="au-error-text"></span></div>' +
      '<button class="au-submit" id="au-forgot-submit">Send reset link</button>' +
      '</div>' +
      '</div>';

    var old = screen.querySelector(".au-panel.au-active");
    if (old) old.classList.remove("au-active");
    screen.appendChild(forgot);

    forgot.querySelector("#au-back-forgot").addEventListener("click", function () {
      forgot.remove();
      if (old) old.classList.add("au-active");
    });

    forgot.querySelector("#au-forgot-submit").addEventListener("click", function () {
      var emailInp = forgot.querySelector("#au-forgot-email");
      var v = emailInp.value.trim();
      if (!isEmail(v)) {
        forgot.querySelector("#au-forgot-email-err").textContent = "Enter a valid email address.";
        emailInp.classList.add("au-error");
        return;
      }
      var btn = forgot.querySelector("#au-forgot-submit");
      btn.disabled = true;
      btn.classList.add("au-loading");
      btn.innerHTML = '<span class="au-spinner"></span> Sending…';
      setTimeout(function () {
        forgot.querySelector("#au-forgot-content").innerHTML =
          '<div class="au-forgot-sent">' +
          '<div class="au-success-icon" style="width:60px;height:60px;margin:0 auto 16px">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 5 5L19 7"/></svg>' +
          '</div>' +
          '<strong>Check your email</strong>' +
          '<p>If an account exists for <strong>' + esc(v) + '</strong>, a reset link has been sent.</p>' +
          '<button class="au-submit" id="au-back-from-forgot" style="max-width:200px;margin:0 auto">Back to Sign In</button>' +
          '</div>';
        forgot.querySelector("#au-back-from-forgot").addEventListener("click", function () {
          forgot.remove();
          if (old) old.classList.add("au-active");
        });
      }, 1300);
    });
  }

  /* ── Success screen ── */
  function showSuccessPanel(isSignIn) {
    var session = getSession();
    var name = session ? session.name.split(" ")[0] : "there";
    var role = session ? session.role : currentRole;

    transitionTo("right", function (panel) {
      panel.innerHTML =
        '<div class="au-success-panel">' +
        '<div class="au-blob au-blob-1"></div>' +
        '<div class="au-blob au-blob-2"></div>' +
        '<div class="au-success-icon">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 5 5L19 7"/></svg>' +
        '</div>' +
        '<h2>' + (isSignIn ? 'Welcome back, ' + esc(name) + '!' : 'You\'re in, ' + esc(name) + '!') + '</h2>' +
        '<p>' + (isSignIn
          ? 'Signed in as ' + (role === "landlord" ? 'a landlord' : 'a tenant') + '. Explore TrustNest and find your safe stay.'
          : 'Your TrustNest account is ready. ' + (role === "landlord" ? 'Start listing your property.' : 'Start finding your safe stay.')) +
        '</p>' +
        '<a href="' + (role === "landlord" ? "index.html" : "explore.html") + '" class="btn btn-solid au-submit" style="height:50px;border-radius:12px;font-size:16px;font-weight:600;text-decoration:none">' +
        (role === "landlord" ? 'Go to Dashboard' : 'Explore rooms') +
        '</a>' +
        '<button class="au-submit" id="au-continue-home" style="background:transparent;color:var(--forest);margin-top:10px;font-size:14px;height:36px">Stay on this page</button>' +
        '</div>';

      panel.querySelector("#au-continue-home").addEventListener("click", function () {
        closeAuth();
        injectNavButton(); /* refresh nav label */
      });
    });
  }

  /* ══════════════════════════════════════════
     INIT
  ══════════════════════════════════════════ */
  function init() {
    injectNavButton();

    /* Also wire any element with data-au-open */
    document.querySelectorAll("[data-au-open]").forEach(function (el) {
      el.addEventListener("click", function (e) { e.preventDefault(); openAuth(); });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  /* Expose for external use */
  window.TrustNestAuth = { open: openAuth, close: closeAuth };

})();
