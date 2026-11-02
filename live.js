/* live.js — Live / Flatmates feature
   Works on flatmates.html
   No ES modules — classic <script> tags only
   localStorage prefix: tn_live_
*/

/* Shared data (vacancies, intro requests, handover progress) is stored with TNDB (db.js),
   so it syncs with the team through git when the site runs via `node server.js`.
   The quiz answers (tn_live_profile) stay in this browser on purpose. */
window.LV_BOOT = function () {
  "use strict";
  var SHARED = window.LV_SHARED || { vacancies: [], intros: {}, handover: null };
  function dbSave(fn) { if (window.TNDB) fn().catch(function () { /* keeps working offline */ }); }

  /* ── Utils ── */
  function esc(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function fmtRent(n) {
    return "₹" + Math.round(Number(n) || 0).toLocaleString("en-IN");
  }

  function initials(name) {
    return String(name || "?").split(" ").map(function (w) { return w[0]; }).join("").slice(0, 2).toUpperCase();
  }

  function avatarColor(name) {
    var colors = ["#2E7D4F", "#3A6B8A", "#7B5EA7", "#C0622F", "#5E8C6A", "#8A6B2C"];
    return colors[(String(name || "").charCodeAt(0) || 0) % colors.length];
  }

  /* ── localStorage helpers ── */
  function lsGet(key) {
    if (key === "tn_live_vacancies") return SHARED.vacancies.slice();
    if (key === "tn_live_intros") return Object.assign({}, SHARED.intros);
    if (key === "tn_live_handover") return SHARED.handover ? JSON.parse(JSON.stringify(SHARED.handover)) : null;
    try { return JSON.parse(localStorage.getItem(key) || "null"); }
    catch (e) { return null; }
  }
  function lsSet(key, val) {
    if (key === "tn_live_vacancies") {
      // new vacancies are the ones without an id yet: save each as its own record
      val.forEach(function (v) {
        if (!v.id) {
          v.id = Date.now().toString(36) + "-" + Math.random().toString(16).slice(2, 8);
          dbSave(function () { return TNDB.add("live-vacancies", v); });
        }
      });
      SHARED.vacancies = val.slice();
      return;
    }
    if (key === "tn_live_intros") {
      Object.keys(val).forEach(function (id) {
        if (!SHARED.intros[id] && /^[a-z0-9_-]{1,64}$/i.test(id)) dbSave(function () { return TNDB.update("live-intros", id, { sent: true, sentAt: Date.now() }); });
      });
      SHARED.intros = Object.assign({}, val);
      return;
    }
    if (key === "tn_live_handover") {
      SHARED.handover = val;
      dbSave(function () { return TNDB.update("live-handover", "state", { data: val }); });
      return;
    }
    try { localStorage.setItem(key, JSON.stringify(val)); }
    catch (e) { /* storage full */ }
  }

  /* ── Only run on flatmates.html ── */
  if (!document.querySelector(".lv-tabs")) return;

  /* ═══════════════════════════════════════
     TABS
  ═══════════════════════════════════════ */
  var tabs = document.querySelectorAll(".lv-tab");
  var panels = document.querySelectorAll(".lv-panel");

  tabs.forEach(function (tab) {
    tab.addEventListener("click", function () {
      tabs.forEach(function (t) {
        t.classList.remove("lv-tab-active");
        t.setAttribute("aria-selected", "false");
      });
      panels.forEach(function (p) { p.classList.remove("lv-panel-active"); });
      tab.classList.add("lv-tab-active");
      tab.setAttribute("aria-selected", "true");
      var target = document.getElementById(tab.getAttribute("aria-controls"));
      if (target) target.classList.add("lv-panel-active");
    });
  });

  /* ═══════════════════════════════════════
     VIBE QUIZ
  ═══════════════════════════════════════ */
  var currentQ = 0;
  var answers = {};
  var questions = LV_VIBE_QUESTIONS;

  function renderQuestion() {
    var q = questions[currentQ];
    var total = questions.length;
    var pct = ((currentQ + 1) / total * 100).toFixed(0) + "%";

    document.getElementById("lv-progress-label").textContent =
      "Question " + (currentQ + 1) + " of " + total;
    var bar = document.getElementById("lv-progress-bar");
    bar.setAttribute("aria-valuenow", currentQ + 1);
    document.getElementById("lv-progress-fill").style.width = pct;

    var optionsHTML = q.options.map(function (o) {
      var selected = answers[q.key] === o.value ? " lv-selected" : "";
      return '<button type="button" class="lv-option-btn' + selected + '" data-value="' + esc(o.value) + '">' +
        esc(o.label) + '</button>';
    }).join("");

    var navHTML = '<div class="lv-quiz-nav">' +
      (currentQ > 0 ? '<button type="button" class="btn btn-outline" id="lv-prev-btn">Back</button>' : '') +
      (currentQ < total - 1
        ? '<button type="button" class="btn btn-solid" id="lv-next-btn">Next</button>'
        : '<button type="button" class="btn btn-solid" id="lv-next-btn">See my matches</button>') +
      '</div>';

    document.getElementById("lv-question-card").innerHTML =
      '<p class="lv-question-text">' + esc(q.question) + '</p>' +
      '<div class="lv-options">' + optionsHTML + '</div>' +
      navHTML;

    /* Option selection */
    document.querySelectorAll(".lv-option-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        answers[q.key] = btn.dataset.value;
        document.querySelectorAll(".lv-option-btn").forEach(function (b) { b.classList.remove("lv-selected"); });
        btn.classList.add("lv-selected");
      });
    });

    var prevBtn = document.getElementById("lv-prev-btn");
    if (prevBtn) prevBtn.addEventListener("click", function () {
      if (currentQ > 0) { currentQ--; renderQuestion(); }
    });

    var nextBtn = document.getElementById("lv-next-btn");
    if (nextBtn) nextBtn.addEventListener("click", function () {
      var q2 = questions[currentQ];
      if (!answers[q2.key]) {
        /* pick first option automatically */
        answers[q2.key] = q2.options[0].value;
      }
      if (currentQ < questions.length - 1) {
        currentQ++;
        renderQuestion();
      } else {
        /* done — save and show results */
        lsSet("tn_live_profile", answers);
        showResults();
      }
    });
  }

  /* ── compatibility score ── */
  function compatPct(houseVibe, userVibe) {
    var weights = {
      sleep: 3,
      cleanliness: 3,
      smoking: 3,
      food: 2,
      noise: 2,
      guests: 2,
      studyHabits: 1,
      sharing: 1
    };
    var total = 0, matches = 0;
    Object.keys(weights).forEach(function (k) {
      total += weights[k];
      if (houseVibe[k] === userVibe[k]) matches += weights[k];
    });
    return Math.round((matches / total) * 100);
  }

  function matchClass(pct) {
    if (pct >= 75) return "lv-match-high";
    if (pct >= 50) return "lv-match-mid";
    return "lv-match-low";
  }

  function getVacancyListings() {
    var stored = lsGet("tn_live_vacancies") || [];
    return stored.map(function (v, i) {
      return {
        id: "lv-user-" + i,
        members: [{ name: v.leavingName || "Someone", course: "", year: 0 }],
        area: v.area || "Rajpura",
        flatType: v.flatType || "Flat",
        rentShare: Math.round((parseInt(v.totalRent, 10) || 0) / (parseInt(v.numPeople, 10) || 2)),
        deposit: 0,
        moveInDate: v.leavingDate || "",
        leavingReason: v.reason || "",
        vibe: v.vibe || {},
        houseRules: v.rules ? v.rules.split("\n").filter(Boolean) : [],
        photo: "",
        isNew: true
      };
    });
  }

  function showResults() {
    document.getElementById("lv-quiz-section").hidden = true;
    document.getElementById("lv-results-section").hidden = false;
    var profile = lsGet("tn_live_profile") || {};

    var allListings = LV_HOUSEHOLDS.concat(getVacancyListings());
    var ranked = allListings.map(function (h) {
      return { h: h, pct: compatPct(h.vibe, profile) };
    }).sort(function (a, b) { return b.pct - a.pct; });

    var html = ranked.map(function (item) {
      var h = item.h, pct = item.pct;
      var vibeBreakdown = Object.keys(h.vibe).map(function (k) {
        var match = (h.vibe[k] === profile[k]);
        var icon = match ? "✓" : "✗";
        var label = k.charAt(0).toUpperCase() + k.slice(1);
        return '<span class="lv-vibe-chip' + (match ? "" : " lv-chip-mismatch") + '">' + icon + " " + label + '</span>';
      }).join("");

      var sentState = lsGet("tn_live_intros") || {};
      var sent = sentState[h.id];

      return '<article class="lv-hh-card card" data-id="' + esc(h.id) + '">' +
        '<div class="lv-hh-photo">' +
        (h.photo ? '<img src="' + esc(h.photo) + '" alt="' + esc(h.area) + ' flat" loading="lazy" onerror="this.style.display=\'none\'">' : '') +
        '<span class="lv-match-badge ' + matchClass(pct) + '" aria-label="' + pct + '% match">' + pct + '% match</span>' +
        (h.isNew ? '<span class="lv-new-badge">New</span>' : '') +
        '</div>' +
        '<div class="lv-hh-body">' +
        '<h3 class="lv-hh-title">' + esc(h.flatType) + ' · ' + esc(h.area) + '</h3>' +
        '<p class="lv-hh-meta">' + h.members.map(function (m) { return esc(m.name); }).join(", ") +
        (h.leavingReason ? ' · ' + esc(h.leavingReason) : '') + '</p>' +
        '<p class="lv-hh-price">' + fmtRent(h.rentShare) + '<span>/person/mo</span></p>' +
        '<div class="lv-vibe-chips">' + vibeBreakdown + '</div>' +
        '<div class="lv-hh-card-actions">' +
        '<button type="button" class="btn btn-solid lv-view-btn" data-id="' + esc(h.id) + '">View details</button>' +
        (sent
          ? '<span class="lv-intro-sent">Intro sent</span>'
          : '<button type="button" class="btn btn-outline lv-intro-btn" data-id="' + esc(h.id) + '" data-names="' + esc(h.members.map(function(m){return m.name;}).join(" & ")) + '">Request intro</button>') +
        '</div>' +
        '</div>' +
        '</article>';
    }).join("");

    document.getElementById("lv-household-grid").innerHTML = html;
    document.getElementById("lv-results-title").textContent =
      "Your matches (" + ranked.length + ")";

    /* View details */
    document.querySelectorAll(".lv-view-btn").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.stopPropagation();
        openDrawer(btn.dataset.id, ranked);
      });
    });

    /* Intro buttons */
    document.querySelectorAll(".lv-intro-btn").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.stopPropagation();
        var id = btn.dataset.id;
        var names = btn.dataset.names;
        var intros = lsGet("tn_live_intros") || {};
        intros[id] = true;
        lsSet("tn_live_intros", intros);
        btn.outerHTML = '<span class="lv-intro-sent">Intro sent to ' + esc(names) + '</span>';
      });
    });

    /* Card click */
    document.querySelectorAll(".lv-hh-card").forEach(function (card) {
      card.addEventListener("click", function () {
        openDrawer(card.dataset.id, ranked);
      });
    });
  }

  /* ── Household detail drawer ── */
  function openDrawer(id, ranked) {
    var item = ranked.find(function (x) { return x.h.id === id; });
    if (!item) return;
    var h = item.h, pct = item.pct;
    var drawer = document.getElementById("lv-hh-drawer");
    var profile = lsGet("tn_live_profile") || {};
    var sentState = lsGet("tn_live_intros") || {};
    var sent = sentState[id];

    var membersHTML = h.members.map(function (m) {
      var col = avatarColor(m.name);
      return '<div class="lv-member-row">' +
        '<div class="lv-member-avatar" style="background:' + col + '">' + initials(m.name) + '</div>' +
        '<div><div class="lv-member-name">' + esc(m.name) + '</div>' +
        (m.course ? '<div class="lv-member-meta">' + esc(m.course) + (m.year ? ' · Year ' + m.year : '') + '</div>' : '') +
        '</div></div>';
    }).join("");

    var rulesHTML = (h.houseRules || []).map(function (r) {
      return '<li>' + esc(r) + '</li>';
    }).join("");

    var matchBreakdown = Object.keys(h.vibe).map(function (k) {
      var match = (h.vibe[k] === profile[k]);
      return '<span class="lv-vibe-chip' + (match ? "" : " lv-chip-mismatch") + '">' +
        (match ? "✓" : "✗") + " " + k.charAt(0).toUpperCase() + k.slice(1) + '</span>';
    }).join("");

    var moveIn = h.moveInDate
      ? new Date(h.moveInDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
      : "TBD";

    drawer.innerHTML =
      '<button class="lv-drawer-close" id="lv-close-drawer" aria-label="Close details">&times;</button>' +
      '<h2 class="lv-drawer-title" id="lv-drawer-title">' + esc(h.flatType) + ' in ' + esc(h.area) + '</h2>' +
      '<p class="lv-drawer-meta">' + fmtRent(h.rentShare) + '/person/month · Available from ' + moveIn + '</p>' +

      '<div class="lv-drawer-section">' +
      '<h4>Compatibility: ' + pct + '%</h4>' +
      '<div class="lv-match-breakdown">' + matchBreakdown + '</div>' +
      '</div>' +

      '<div class="lv-drawer-section">' +
      '<h4>Current members</h4>' +
      '<div class="lv-members-list">' + membersHTML + '</div>' +
      '</div>' +

      (h.leavingReason ? '<div class="lv-drawer-section"><h4>Why there\'s a vacancy</h4><p style="font-size:15px;color:var(--text);">' + esc(h.leavingReason) + '</p></div>' : '') +

      (rulesHTML ? '<div class="lv-drawer-section"><h4>House rules</h4><ul class="lv-rules-list">' + rulesHTML + '</ul></div>' : '') +

      '<div class="lv-drawer-actions">' +
      (sent
        ? '<p style="font-size:15px;color:#22603C;font-weight:500;padding:10px 0;">Intro already sent.</p>'
        : '<button type="button" class="btn btn-solid" id="lv-drawer-intro" data-id="' + esc(id) + '" data-names="' + esc(h.members.map(function(m){return m.name;}).join(" & ")) + '">Request intro</button>') +
      '<button type="button" class="btn btn-outline" id="lv-close-drawer2">Close</button>' +
      '</div>';

    document.getElementById("lv-hh-modal").hidden = false;
    document.body.style.overflow = "hidden";
    document.getElementById("lv-close-drawer").focus();

    function closeDrawer() {
      document.getElementById("lv-hh-modal").hidden = true;
      document.body.style.overflow = "";
    }

    document.getElementById("lv-close-drawer").addEventListener("click", closeDrawer);
    document.getElementById("lv-close-drawer2").addEventListener("click", closeDrawer);
    document.getElementById("lv-hh-backdrop").addEventListener("click", closeDrawer);

    var introBtn = document.getElementById("lv-drawer-intro");
    if (introBtn) {
      introBtn.addEventListener("click", function () {
        var intros = lsGet("tn_live_intros") || {};
        intros[introBtn.dataset.id] = true;
        lsSet("tn_live_intros", intros);
        introBtn.outerHTML = '<p style="font-size:15px;color:#22603C;font-weight:500;padding:10px 0;">Intro sent to ' + esc(introBtn.dataset.names) + '!</p>';
      });
    }
  }

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      var modal = document.getElementById("lv-hh-modal");
      if (modal && !modal.hidden) { modal.hidden = true; document.body.style.overflow = ""; }
    }
  });

  /* ── Retake quiz ── */
  document.getElementById("lv-retake-btn").addEventListener("click", function () {
    answers = {};
    currentQ = 0;
    lsSet("tn_live_profile", null);
    document.getElementById("lv-quiz-section").hidden = false;
    document.getElementById("lv-results-section").hidden = true;
    renderQuestion();
  });

  /* ── Check saved profile ── */
  var savedProfile = lsGet("tn_live_profile");
  if (savedProfile && Object.keys(savedProfile).length >= questions.length) {
    answers = savedProfile;
    showResults();
  } else {
    renderQuestion();
  }

  /* ═══════════════════════════════════════
     POST A VACANCY
  ═══════════════════════════════════════ */
  var vacancyForm = document.getElementById("lv-vacancy-form");
  if (vacancyForm) {
    vacancyForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var vacancy = {
        area: document.getElementById("lv-area").value,
        flatType: document.getElementById("lv-flat-type").value,
        totalRent: document.getElementById("lv-total-rent").value,
        numPeople: document.getElementById("lv-num-people").value,
        leavingName: document.getElementById("lv-leaving-name").value,
        leavingDate: document.getElementById("lv-leaving-date").value,
        reason: document.getElementById("lv-leaving-reason").value,
        rules: document.getElementById("lv-house-rules").value,
        vibe: lsGet("tn_live_profile") || {},
        postedAt: new Date().toISOString()
      };
      var vacancies = lsGet("tn_live_vacancies") || [];
      vacancies.unshift(vacancy);
      lsSet("tn_live_vacancies", vacancies);
      document.getElementById("lv-post-success").hidden = false;
      vacancyForm.reset();
    });
  }

  /* ── Rent calculator ── */
  function calcRent() {
    var totalRent = parseFloat(document.getElementById("lv-calc-rent").value) || 18000;
    var numPeople = Math.max(2, parseInt(document.getElementById("lv-calc-people").value, 10) || 3);
    var days = Math.max(1, parseInt(document.getElementById("lv-calc-days").value, 10) || 30);

    var normal = totalRent / numPeople;
    var withEmpty = totalRent / (numPeople - 1);
    var extra = withEmpty - normal;
    var perDay = extra / 30;
    var totalLost = extra * (days / 30) * (numPeople - 1);

    document.getElementById("lv-res-normal").textContent = fmtRent(normal) + "/mo";
    document.getElementById("lv-res-empty").textContent = fmtRent(withEmpty) + "/mo";
    document.getElementById("lv-res-extra").textContent = fmtRent(extra) + "/mo";
    document.getElementById("lv-res-day").textContent = fmtRent(perDay) + "/day";
    document.getElementById("lv-res-total").textContent = fmtRent(totalLost);
  }

  ["lv-calc-rent", "lv-calc-people", "lv-calc-days"].forEach(function (id) {
    var el = document.getElementById(id);
    if (el) el.addEventListener("input", calcRent);
  });
  calcRent();

  /* ── Sync vacancy form to calculator ── */
  var totalRentInput = document.getElementById("lv-total-rent");
  var numPeopleInput = document.getElementById("lv-num-people");
  if (totalRentInput) totalRentInput.addEventListener("input", function () {
    document.getElementById("lv-calc-rent").value = totalRentInput.value;
    calcRent();
  });
  if (numPeopleInput) numPeopleInput.addEventListener("input", function () {
    document.getElementById("lv-calc-people").value = numPeopleInput.value;
    calcRent();
  });

  /* ═══════════════════════════════════════
     HANDOVER TRACKER
  ═══════════════════════════════════════ */
  var HANDOVER_STEPS = [
    {
      title: "Match accepted",
      desc: "Both sides agreed to move forward.",
      action: { label: "Accept the match", doneLabel: "Match accepted" }
    },
    {
      title: "Landlord approval",
      desc: "Owner must approve the new flatmate.",
      action: { label: "Send approval request", doneLabel: "Approved by owner" }
    },
    {
      title: "Agreement transfer",
      desc: "Update the rental agreement with the new name.",
      checklist: ["Old name removed from agreement", "New name added to agreement", "Signed by both parties"]
    },
    {
      title: "Deposit settlement",
      desc: "Outgoing flatmate's deposit is calculated and settled.",
      action: { label: "Mark deposit settled", doneLabel: "Deposit settled" }
    },
    {
      title: "Key handover",
      desc: "Keys physically handed to the new flatmate.",
      action: { label: "Confirm key handover", doneLabel: "Keys handed over" }
    }
  ];

  function loadHandover() {
    return lsGet("tn_live_handover") || { completedSteps: [], dates: {}, checklist: {}, landlordStatus: null };
  }

  function saveHandover(data) {
    lsSet("tn_live_handover", data);
  }

  function renderHandover() {
    var data = loadHandover();
    var html = HANDOVER_STEPS.map(function (step, i) {
      var done = data.completedSteps.indexOf(i) !== -1;
      var active = !done && (i === 0 || data.completedSteps.indexOf(i - 1) !== -1);
      var cls = done ? " lv-step-done" : (active ? " lv-step-active" : "");
      var dotContent = done ? "✓" : (i + 1);

      var actionHTML = "";
      if (step.action && !done && active) {
        actionHTML = '<div class="lv-step-action">' +
          '<button type="button" class="btn btn-outline lv-complete-step" data-step="' + i + '">' +
          step.action.label + '</button>' +
          '</div>';
      } else if (step.action && done && data.landlordStatus === i) {
        actionHTML = '<div class="lv-step-action"><p style="font-size:13px;color:#2E7D4F;font-weight:500;">' + step.action.doneLabel + '</p></div>';
      }

      if (step.checklist && active && !done) {
        var checkHTML = step.checklist.map(function (item, ci) {
          var checked = (data.checklist[i] || []).indexOf(ci) !== -1;
          return '<label class="lv-check-item' + (checked ? " lv-checked" : "") + '">' +
            '<input type="checkbox" class="lv-check" data-step="' + i + '" data-check="' + ci + '"' + (checked ? " checked" : "") + '> ' +
            esc(item) + '</label>';
        }).join("");
        actionHTML += '<div class="lv-checklist">' + checkHTML + '</div>' +
          '<div class="lv-step-action" style="margin-top:12px;">' +
          '<button type="button" class="btn btn-outline lv-complete-step" data-step="' + i + '">Mark complete</button>' +
          '</div>';
      }

      var dateHTML = done && data.dates[i]
        ? '<div class="lv-step-date">Completed ' + new Date(data.dates[i]).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) + '</div>'
        : "";

      return '<li class="lv-step-item' + cls + '">' +
        '<div class="lv-step-dot" aria-label="Step ' + (i + 1) + (done ? " (done)" : "") + '">' + dotContent + '</div>' +
        '<div class="lv-step-content">' +
        '<div class="lv-step-title">' + esc(step.title) + '</div>' +
        '<div class="lv-step-desc">' + esc(step.desc) + '</div>' +
        dateHTML +
        actionHTML +
        '</div></li>';
    }).join("");

    var list = document.getElementById("lv-steps-list");
    if (list) {
      list.innerHTML = html;

      list.querySelectorAll(".lv-complete-step").forEach(function (btn) {
        btn.addEventListener("click", function () {
          var step = parseInt(btn.dataset.step, 10);
          var d = loadHandover();
          if (d.completedSteps.indexOf(step) === -1) {
            d.completedSteps.push(step);
            d.dates[step] = new Date().toISOString();
            if (step === 1) d.landlordStatus = 1;
          }
          saveHandover(d);
          renderHandover();
        });
      });

      list.querySelectorAll(".lv-check").forEach(function (cb) {
        cb.addEventListener("change", function () {
          var step = parseInt(cb.dataset.step, 10);
          var checkIdx = parseInt(cb.dataset.check, 10);
          var d = loadHandover();
          if (!d.checklist[step]) d.checklist[step] = [];
          if (cb.checked) {
            if (d.checklist[step].indexOf(checkIdx) === -1) d.checklist[step].push(checkIdx);
          } else {
            d.checklist[step] = d.checklist[step].filter(function (x) { return x !== checkIdx; });
          }
          saveHandover(d);
          renderHandover();
        });
      });
    }
  }

  renderHandover();

  /* ── Deposit settlement calculator ── */
  function calcDeposit() {
    var total = parseFloat(document.getElementById("lv-dep-total").value) || 0;
    var damage = parseFloat(document.getElementById("lv-dep-damage").value) || 0;
    var elec = parseFloat(document.getElementById("lv-dep-electricity").value) || 0;
    var rent = parseFloat(document.getElementById("lv-dep-rent").value) || 0;
    var deductions = damage + elec + rent;
    var refund = Math.max(0, total - deductions);

    document.getElementById("lv-rec-orig").textContent = fmtRent(total);
    document.getElementById("lv-rec-damage").textContent = damage > 0 ? "−" + fmtRent(damage) : fmtRent(0);
    document.getElementById("lv-rec-elec").textContent = elec > 0 ? "−" + fmtRent(elec) : fmtRent(0);
    document.getElementById("lv-rec-rent").textContent = rent > 0 ? "−" + fmtRent(rent) : fmtRent(0);
    document.getElementById("lv-rec-refund").textContent = fmtRent(refund);
    document.getElementById("lv-rec-note").textContent =
      "The incoming flatmate pays " + fmtRent(total) + " directly to the landlord as their deposit.";
  }

  ["lv-dep-total", "lv-dep-damage", "lv-dep-electricity", "lv-dep-rent"].forEach(function (id) {
    var el = document.getElementById(id);
    if (el) el.addEventListener("input", calcDeposit);
  });
  calcDeposit();

};

(function () {
  var load = window.TNDB
    ? Promise.all([TNDB.list("live-vacancies"), TNDB.list("live-intros"), TNDB.list("live-handover")])
    : Promise.resolve([[], [], []]);
  load.catch(function () { return [[], [], []]; }).then(function (r) {
    var intros = {};
    r[1].forEach(function (x) { intros[x.id] = true; });
    var hand = r[2].filter(function (x) { return x.id === "state"; })[0];
    window.LV_SHARED = { vacancies: r[0].slice().reverse(), intros: intros, handover: hand ? hand.data : null };
    window.LV_BOOT();
  });
})();
