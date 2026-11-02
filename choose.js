/* choose.js — StayScore / Choose feature
   Works on explore.html (listing grid) and listing.html (detail)
   No ES modules — classic <script> tags only
   localStorage prefix: tn_choose_
*/

/* Resident reviews are shared with TNDB (db.js) in the "choose-reviews" collection,
   so they sync with the team through git when the site runs via `node server.js`. */
window.CH_BOOT = function () {
  "use strict";
  var REVIEWS = window.CH_REVIEWS || {}; // { listingId: [review, ...newest first] }

  /* ── Helpers ── */
  function stayScore(scores) {
    var keys = ["water", "wifi", "noise", "maintenance", "cleanliness", "transport"];
    var total = keys.reduce(function (s, k) { return s + (scores[k] || 0); }, 0);
    return Math.round((total / keys.length) * 10) / 10;
  }

  function scoreBadgeClass(s) {
    if (s >= 7.5) return "";
    if (s >= 6) return "ch-score-mid";
    return "ch-score-bad";
  }

  function barClass(v) {
    if (v >= 7) return "";
    if (v >= 5) return "ch-bar-low";
    return "ch-bar-bad";
  }

  function esc(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function fmtRent(n) {
    return "₹" + Number(n).toLocaleString("en-IN");
  }

  function initials(name) {
    return name.split(" ").map(function (w) { return w[0]; }).join("").slice(0, 2).toUpperCase();
  }

  /* photo fallback helper — returns a placeholder SVG data-URI */
  function photoSrc(url) {
    return url; /* actual files; browser will handle missing gracefully */
  }

  function avatarColor(name) {
    var colors = ["#2E7D4F", "#3A6B8A", "#7B5EA7", "#C0622F", "#5E8C6A", "#8A6B2C"];
    var idx = name.charCodeAt(0) % colors.length;
    return colors[idx];
  }

  /* ── Score bar fragment ── */
  function miniBarHTML(label, val) {
    var pct = (val / 10 * 100).toFixed(0) + "%";
    return '<dl class="ch-mini-bars"><div class="ch-mini-bar"><dt>' + esc(label) + '</dt>' +
      '<dd><span class="' + barClass(val) + '" style="--v:' + pct + '"></span></dd>' +
      '<span class="ch-bar-num">' + val + '</span></div></dl>';
  }

  function detailBarHTML(label, val) {
    var pct = (val / 10 * 100).toFixed(0) + "%";
    return '<div class="ch-detail-bar"><dt>' + esc(label) + '</dt>' +
      '<dd><span class="' + barClass(val) + '" style="--v:' + pct + '"></span></dd>' +
      '<span class="ch-detail-bar-num">' + val + '</span></div>';
  }

  /* ── Build card HTML ── */
  function cardHTML(l) {
    var score = stayScore(l.scores);
    var badgeClass = scoreBadgeClass(score);
    var scoreKeys = Object.keys(l.scores).slice(0, 3);
    var miniHTML = scoreKeys.map(function (k) {
      var pct = (l.scores[k] / 10 * 100).toFixed(0) + "%";
      return '<div class="ch-mini-bar">' +
        '<dt>' + k.charAt(0).toUpperCase() + k.slice(1) + '</dt>' +
        '<dd><span class="' + barClass(l.scores[k]) + '" style="--v:' + pct + '"></span></dd>' +
        '<span class="ch-bar-num">' + l.scores[k] + '</span>' +
        '</div>';
    }).join("");

    var photo = (l.photos && l.photos[0]) ? esc(l.photos[0]) : "";
    var verBadge = l.verifiedOwner
      ? '<span class="ch-verified-badge"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 12 2 2 4-4"/><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Z"/></svg>Verified owner</span>'
      : "";

    return '<article class="ch-card card" tabindex="0" data-id="' + esc(l.id) + '" role="article">' +
      '<div class="ch-card-photo">' +
      (photo ? '<img src="' + photo + '" alt="' + esc(l.title) + '" loading="lazy" onerror="this.style.display=\'none\'">' : '') +
      '<span class="ch-score-badge ' + badgeClass + '" aria-label="StayScore ' + score + '">' + score + '</span>' +
      verBadge +
      '</div>' +
      '<div class="ch-card-body">' +
      '<h3 class="ch-card-title">' + esc(l.title) + '</h3>' +
      '<p class="ch-card-meta"><span>' + esc(l.area) + '</span><span>' + esc(l.distance) + '</span></p>' +
      '<p class="ch-card-price">' + fmtRent(l.rent) + '<span>/month</span></p>' +
      '<dl class="ch-mini-bars">' + miniHTML + '</dl>' +
      '<div class="ch-card-actions">' +
      '<a href="listing.html?id=' + esc(l.id) + '">View details</a>' +
      '<button class="ch-compare-btn" data-id="' + esc(l.id) + '" aria-label="Add ' + esc(l.title) + ' to compare" aria-pressed="false">+ Compare</button>' +
      '</div>' +
      '</div>' +
      '</article>';
  }

  /* ─────────────────────────────────────────
     EXPLORE PAGE (explore.html)
  ───────────────────────────────────────── */
  var grid = document.getElementById("ch-grid");
  if (grid) {
    var compareList = [];
    var currentListings = CH_LISTINGS.slice();

    /* read localStorage user reviews and merge */
    function getStoredReviews() { return REVIEWS; }

    /* recalculate score with user reviews */
    function effectiveScore(l) {
      var stored = getStoredReviews()[l.id];
      if (!stored || stored.length === 0) return stayScore(l.scores);
      var allScores = [l.scores];
      stored.forEach(function (r) { if (r.scores) allScores.push(r.scores); });
      var merged = {};
      var keys = ["water", "wifi", "noise", "maintenance", "cleanliness", "transport"];
      keys.forEach(function (k) {
        var avg = allScores.reduce(function (s, sc) { return s + (sc[k] || 0); }, 0) / allScores.length;
        merged[k] = Math.round(avg * 10) / 10;
      });
      return stayScore(merged);
    }

    /* filter + sort */
    function getFiltered() {
      var area = document.getElementById("ch-area").value;
      var type = document.getElementById("ch-type").value;
      var gender = document.getElementById("ch-gender").value;
      var budget = parseInt(document.getElementById("ch-budget").value, 10);
      var verified = document.getElementById("ch-verified").checked;
      var sort = document.getElementById("ch-sort-sel").value;

      var list = CH_LISTINGS.filter(function (l) {
        if (area && l.area !== area) return false;
        if (type && l.type !== type) return false;
        if (gender && l.gender !== gender) return false;
        if (l.rent > budget) return false;
        if (verified && !l.verifiedOwner) return false;
        return true;
      });

      list.sort(function (a, b) {
        if (sort === "price-asc") return a.rent - b.rent;
        if (sort === "distance") {
          var dm = function (d) { return parseInt(d, 10) || 99; };
          return dm(a.distance) - dm(b.distance);
        }
        /* default: StayScore high→low */
        return effectiveScore(b) - effectiveScore(a);
      });

      return list;
    }

    function render() {
      var list = getFiltered();
      var countEl = document.getElementById("ch-count");
      countEl.innerHTML = "<strong>" + list.length + "</strong> " + (list.length === 1 ? "room" : "rooms");

      if (list.length === 0) {
        grid.innerHTML = '<div class="ch-empty">' +
          '<div class="ch-empty-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M3 10.5v10a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1v-10M2 10l10-7 10 7"/></svg></div>' +
          '<h3>No rooms match.</h3><p>Try a higher budget or different area.</p>' +
          '<button class="btn btn-solid" id="ch-reset-btn">Reset filters</button>' +
          '</div>';
        var rb = document.getElementById("ch-reset-btn");
        if (rb) rb.addEventListener("click", resetFilters);
        return;
      }

      grid.innerHTML = list.map(function (l) { return cardHTML(l); }).join("");

      /* update compare button states */
      compareList.forEach(function (id) {
        var btn = grid.querySelector('.ch-compare-btn[data-id="' + id + '"]');
        if (btn) {
          btn.textContent = "✓ Added";
          btn.classList.add("ch-in-compare");
          btn.setAttribute("aria-pressed", "true");
        }
      });

      /* card click → navigate */
      grid.querySelectorAll(".ch-card").forEach(function (card) {
        card.addEventListener("click", function (e) {
          if (e.target.classList.contains("ch-compare-btn") || e.target.closest(".ch-compare-btn")) return;
          window.location.href = "listing.html?id=" + card.dataset.id;
        });
        card.addEventListener("keydown", function (e) {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            window.location.href = "listing.html?id=" + card.dataset.id;
          }
        });
      });

      /* compare buttons */
      grid.querySelectorAll(".ch-compare-btn").forEach(function (btn) {
        btn.addEventListener("click", function (e) {
          e.stopPropagation();
          toggleCompare(btn.dataset.id, btn);
        });
      });
    }

    function resetFilters() {
      document.getElementById("ch-area").value = "";
      document.getElementById("ch-type").value = "";
      document.getElementById("ch-gender").value = "";
      document.getElementById("ch-budget").value = 15000;
      document.getElementById("ch-budget-val").textContent = "₹15,000";
      document.getElementById("ch-verified").checked = false;
      render();
    }

    /* ── Budget slider label ── */
    document.getElementById("ch-budget").addEventListener("input", function () {
      document.getElementById("ch-budget-val").textContent = "₹" + parseInt(this.value, 10).toLocaleString("en-IN");
      render();
    });

    /* ── Other filter events ── */
    ["ch-area", "ch-type", "ch-gender", "ch-verified", "ch-sort-sel"].forEach(function (id) {
      document.getElementById(id).addEventListener("change", render);
    });

    /* ── Compare logic ── */
    function toggleCompare(id, btn) {
      var idx = compareList.indexOf(id);
      if (idx === -1) {
        if (compareList.length >= 3) {
          alert("You can compare up to 3 rooms at a time.");
          return;
        }
        compareList.push(id);
        if (btn) { btn.textContent = "✓ Added"; btn.classList.add("ch-in-compare"); btn.setAttribute("aria-pressed", "true"); }
      } else {
        compareList.splice(idx, 1);
        if (btn) { btn.textContent = "+ Compare"; btn.classList.remove("ch-in-compare"); btn.setAttribute("aria-pressed", "false"); }
      }
      updateTray();
    }

    function updateTray() {
      var tray = document.getElementById("ch-tray");
      var itemsEl = document.getElementById("ch-tray-items");
      if (compareList.length === 0) {
        tray.classList.remove("ch-tray-visible");
        tray.setAttribute("aria-hidden", "true");
        return;
      }
      tray.classList.add("ch-tray-visible");
      tray.setAttribute("aria-hidden", "false");
      var html = '<span class="ch-tray-label">Compare ' + compareList.length + '/3:</span>';
      compareList.forEach(function (id) {
        var l = CH_LISTINGS.find(function (x) { return x.id === id; });
        if (l) {
          html += '<span class="ch-tray-chip">' + esc(l.title) +
            '<button data-remove="' + esc(id) + '" aria-label="Remove ' + esc(l.title) + ' from compare">&times;</button>' +
            '</span>';
        }
      });
      itemsEl.innerHTML = html;
      itemsEl.querySelectorAll("[data-remove]").forEach(function (btn) {
        btn.addEventListener("click", function () {
          var rmId = btn.dataset.remove;
          compareList = compareList.filter(function (id) { return id !== rmId; });
          /* update card button */
          var cb = grid.querySelector('.ch-compare-btn[data-id="' + rmId + '"]');
          if (cb) { cb.textContent = "+ Compare"; cb.classList.remove("ch-in-compare"); cb.setAttribute("aria-pressed", "false"); }
          updateTray();
        });
      });
    }

    document.getElementById("ch-tray-clear").addEventListener("click", function () {
      compareList = [];
      render();
      updateTray();
    });

    document.getElementById("ch-compare-open").addEventListener("click", openCompareModal);

    /* ── Compare modal ── */
    function openCompareModal() {
      if (compareList.length < 2) { alert("Add at least 2 rooms to compare."); return; }
      var modal = document.getElementById("ch-compare-modal");
      var content = document.getElementById("ch-compare-content");
      var listings = compareList.map(function (id) {
        return CH_LISTINGS.find(function (l) { return l.id === id; });
      }).filter(Boolean);

      var scoreKeys = ["water", "wifi", "noise", "maintenance", "cleanliness", "transport"];

      /* find best values per row */
      var bestRent = Math.min.apply(null, listings.map(function (l) { return l.rent; }));
      var bestDeposit = Math.min.apply(null, listings.map(function (l) { return l.deposit; }));
      var bestScore = Math.max.apply(null, listings.map(function (l) { return stayScore(l.scores); }));
      var bestWifi = Math.max.apply(null, listings.map(function (l) { return l.measuredWifiMbps; }));
      var bestByKey = {};
      scoreKeys.forEach(function (k) {
        bestByKey[k] = Math.max.apply(null, listings.map(function (l) { return l.scores[k]; }));
      });

      /* Header row */
      var headerCells = '<th></th>' + listings.map(function (l) {
        return '<th><div class="ch-cmp-head">' +
          (l.photos && l.photos[0] ? '<img src="' + esc(l.photos[0]) + '" alt="' + esc(l.title) + '" onerror="this.style.display=\'none\'">' : '') +
          '<div class="ch-cmp-title">' + esc(l.title) + '</div>' +
          '<div class="ch-cmp-area">' + esc(l.area) + '</div>' +
          '</div></th>';
      }).join("");

      function row(label, vals, bestFn) {
        return '<tr><td>' + esc(label) + '</td>' +
          vals.map(function (v, i) {
            var isBest = bestFn(i, v);
            return '<td class="' + (isBest ? "ch-best" : "") + '">' + v + '</td>';
          }).join("") + '</tr>';
      }

      var html = '<table class="ch-compare-table"><thead><tr>' + headerCells + '</tr></thead><tbody>';
      html += row("Monthly rent", listings.map(function (l) { return fmtRent(l.rent); }),
        function (i) { return listings[i].rent === bestRent; });
      html += row("Deposit", listings.map(function (l) { return fmtRent(l.deposit); }),
        function (i) { return listings[i].deposit === bestDeposit; });
      html += row("StayScore", listings.map(function (l) { return stayScore(l.scores); }),
        function (i) { return stayScore(listings[i].scores) === bestScore; });
      html += row("Meals included", listings.map(function (l) { return l.meals ? "Yes" : "No"; }),
        function (i) { return listings[i].meals; });
      html += row("Verified owner", listings.map(function (l) { return l.verifiedOwner ? "Yes" : "No"; }),
        function (i) { return listings[i].verifiedOwner; });
      html += row("Wi-Fi (measured)", listings.map(function (l) { return l.measuredWifiMbps + " Mbps"; }),
        function (i) { return listings[i].measuredWifiMbps === bestWifi; });
      scoreKeys.forEach(function (k) {
        html += row(k.charAt(0).toUpperCase() + k.slice(1),
          listings.map(function (l) { return l.scores[k] + " / 10"; }),
          function (i) { return listings[i].scores[k] === bestByKey[k]; });
      });
      html += '</tbody></table>';

      content.innerHTML = html;
      modal.hidden = false;
      document.body.style.overflow = "hidden";
      document.getElementById("ch-modal-close").focus();
    }

    function closeCompareModal() {
      document.getElementById("ch-compare-modal").hidden = true;
      document.body.style.overflow = "";
    }

    document.getElementById("ch-modal-close").addEventListener("click", closeCompareModal);
    document.getElementById("ch-modal-backdrop").addEventListener("click", closeCompareModal);
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeCompareModal();
    });

    /* initial render */
    render();
  }

  /* ─────────────────────────────────────────
     LISTING DETAIL PAGE (listing.html)
  ───────────────────────────────────────── */
  var detailRoot = document.getElementById("ch-detail-root");
  if (detailRoot) {
    var params = new URLSearchParams(window.location.search);
    // id can come from ?id=, from #id (survives redirects), or from the last room opened in this tab
    var id = (params.get("id") || location.hash.replace(/^#/, "") || "").trim().toLowerCase();
    if (!id) { try { id = sessionStorage.getItem("ch_last_room") || ""; } catch (e) {} }
    var listing = CH_LISTINGS.find(function (l) { return l.id.toLowerCase() === id; });

    if (!id) {
      // nothing to show: go to the room list instead of a dead end
      window.location.replace("explore.html");
      return;
    }
    if (listing) {
      try { sessionStorage.setItem("ch_last_room", listing.id); } catch (e) {}
      if (!params.get("id")) history.replaceState(null, "", "listing.html?id=" + listing.id);
    }

    if (!listing) {
      var picks = CH_LISTINGS.slice().sort(function (a, b) { return stayScore(b.scores) - stayScore(a.scores); }).slice(0, 3);
      detailRoot.innerHTML = '<div class="ch-empty"><h3>That room isn\'t listed anymore.</h3><p>Here are the top-rated rooms right now.</p></div>' +
        '<div class="ch-grid">' + picks.map(cardHTML).join("") + '</div>' +
        '<p style="text-align:center;margin-top:28px"><a class="btn btn-outline" href="explore.html">See all rooms</a></p>';
      detailRoot.querySelectorAll(".ch-card").forEach(function (card) {
        card.addEventListener("click", function () { window.location.href = "listing.html?id=" + card.dataset.id; });
      });
    } else {
      document.title = esc(listing.title) + " · TrustNest";

      /* merge user reviews from localStorage */
      function getListingReviews() { return REVIEWS[listing.id] || []; }

      function saveListingReview(review) {
        if (!REVIEWS[listing.id]) REVIEWS[listing.id] = [];
        REVIEWS[listing.id].unshift(review);
        if (window.TNDB) TNDB.add("choose-reviews", Object.assign({ listingId: listing.id }, review)).catch(function () {});
      }

      function computeScores() {
        var userReviews = getListingReviews();
        if (userReviews.length === 0) return listing.scores;
        var allScores = [listing.scores].concat(userReviews.filter(function (r) { return r.scores; }).map(function (r) { return r.scores; }));
        var keys = ["water", "wifi", "noise", "maintenance", "cleanliness", "transport"];
        var merged = {};
        keys.forEach(function (k) {
          merged[k] = Math.round((allScores.reduce(function (s, sc) { return s + (sc[k] || 0); }, 0) / allScores.length) * 10) / 10;
        });
        return merged;
      }

      function allReviews() {
        return getListingReviews().map(function (r) {
          return {
            name: r.name || "Anonymous",
            course: r.course || "",
            monthsStayed: r.months || 1,
            rating: r.rating || 5,
            text: r.text || "",
            verifiedResident: false
          };
        }).concat(listing.reviews);
      }

      function reviewHTML(r) {
        var verTag = r.verifiedResident
          ? '<span class="ch-verified-tag"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><path d="m9 12 2 2 4-4"/></svg>Verified resident</span>'
          : "";
        return '<article class="ch-review card">' +
          '<div class="ch-review-header">' +
          '<div class="ch-reviewer-info">' +
          '<span class="ch-reviewer-name">' + esc(r.name) + '</span>' +
          '<div class="ch-reviewer-meta">' +
          (r.course ? '<span>' + esc(r.course) + '</span>' : '') +
          '<span>' + r.monthsStayed + ' month' + (r.monthsStayed !== 1 ? 's' : '') + ' stayed</span>' +
          verTag +
          '</div></div>' +
          '<div class="ch-review-rating">' + r.rating + '<span>/ 10</span></div>' +
          '</div>' +
          '<p class="ch-review-text">' + esc(r.text) + '</p>' +
          '</article>';
      }

      function renderDetail() {
        var scores = computeScores();
        var score = stayScore(scores);
        var scoreClass = scoreBadgeClass(score);
        var scoreKeys = [
          ["Water supply", "water"],
          ["Wi-Fi speed", "wifi"],
          ["Noise level", "noise"],
          ["Maintenance", "maintenance"],
          ["Cleanliness", "cleanliness"],
          ["Transport", "transport"]
        ];

        /* Gallery */
        var photos = listing.photos && listing.photos.length ? listing.photos : [];
        var galleryMain = '<div class="ch-gallery-main"><img id="ch-main-photo" src="' + esc(photos[0] || "") + '" alt="' + esc(listing.title) + '"></div>';
        var thumbs = photos.length > 1
          ? '<div class="ch-thumbs">' + photos.map(function (p, i) {
            return '<button class="ch-thumb' + (i === 0 ? " ch-thumb-active" : "") + '" data-idx="' + i + '" aria-label="View photo ' + (i + 1) + '">' +
              '<img src="' + esc(p) + '" alt="Photo ' + (i + 1) + '" onerror="this.style.display=\'none\'"></button>';
          }).join("") + '</div>'
          : "";

        /* Chips */
        var chips = [
          '<span class="ch-chip">' + esc(listing.type) + '</span>',
          '<span class="ch-chip">' + esc(listing.gender) + '</span>',
          '<span class="ch-chip">' + esc(listing.distance) + '</span>',
          listing.meals ? '<span class="ch-chip">Meals included</span>' : '',
          listing.verifiedOwner ? '<span class="ch-chip ch-chip-verified">Verified owner</span>' : ''
        ].filter(Boolean).join("");

        /* Advertised vs Reality */
        var avrRows = (listing.advertised || []).map(function (a) {
          var isMatch = a.ad.toLowerCase().replace(/[^a-z0-9]/g, "") === a.reality.toLowerCase().replace(/[^a-z0-9]/g, "")
            || a.reality.toLowerCase().indexOf("match") !== -1;
          var icon = isMatch ? "✓" : "⚠";
          var iconStyle = isMatch ? "color:#2E7D4F" : "color:#C98A12";
          return '<tr><td>' + esc(a.ad) + '</td><td>' + esc(a.reality) + '</td>' +
            '<td class="ch-avr-icon" style="' + iconStyle + '">' + icon + '</td></tr>';
        }).join("");

        /* Score bars */
        var barsHTML = scoreKeys.map(function (pair) {
          return detailBarHTML(pair[0], scores[pair[1]]);
        }).join("");

        /* Reviews */
        var reviews = allReviews();
        var reviewsHTML = reviews.map(reviewHTML).join("");

        /* Owner */
        var ownerInitials = initials(listing.ownerName || "Owner");
        var ownerColor = avatarColor(listing.ownerName || "O");
        var ownerHTML = '<div class="ch-owner-box card">' +
          '<h3>Owner</h3>' +
          '<div class="ch-owner-row">' +
          '<div class="ch-owner-avatar" style="background:' + ownerColor + '">' + ownerInitials + '</div>' +
          '<div><div class="ch-owner-name">' + esc(listing.ownerName || "Owner") + '</div>' +
          (listing.verifiedOwner ? '<div class="ch-owner-verified"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><path d="m9 12 2 2 4-4"/><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Z"/></svg>Verified owner</div>' : '') +
          '</div></div>' +
          '<a href="verify.html" class="btn btn-outline">Check this listing for scams</a>' +
          '</div>';

        /* Rate your stay form */
        var rateHTML = '<div class="ch-rate-section">' +
          '<h3>Rate your stay</h3>' +
          '<p>Stayed here? Add your experience and help other students decide.</p>' +
          '<form class="ch-rate-form card" id="ch-rate-form" novalidate>' +
          '<div class="ch-rate-sliders">' +
          scoreKeys.map(function (pair) {
            var k = pair[1];
            return '<div class="ch-rate-slider-group">' +
              '<label for="ch-sl-' + k + '">' + pair[0] + ' <span id="ch-sl-val-' + k + '">5</span></label>' +
              '<input type="range" id="ch-sl-' + k + '" min="0" max="10" value="5" aria-label="Rate ' + pair[0] + '">' +
              '</div>';
          }).join("") +
          '</div>' +
          '<div class="ch-rate-fields">' +
          '<div class="ch-rate-field"><label for="ch-rate-name">Your name</label><input type="text" id="ch-rate-name" placeholder="Priya Sharma"></div>' +
          '<div class="ch-rate-field"><label for="ch-rate-course">Course</label><input type="text" id="ch-rate-course" placeholder="B.Tech CSE"></div>' +
          '<div class="ch-rate-field"><label for="ch-rate-months">Months stayed</label><input type="number" id="ch-rate-months" min="1" max="60" value="6"></div>' +
          '<div class="ch-rate-field"><label for="ch-rate-wifi">Wi-Fi measured (Mbps)</label><input type="number" id="ch-rate-wifi" min="0" placeholder="Optional"></div>' +
          '<div class="ch-rate-field ch-full"><label for="ch-rate-text">Your experience</label><textarea id="ch-rate-text" rows="3" placeholder="What was staying here like?"></textarea></div>' +
          '</div>' +
          '<button type="submit" class="btn btn-solid">Save entry</button>' +
          '<p class="ch-rate-success" id="ch-rate-success" hidden>Thanks! Your review has been saved.</p>' +
          '</form></div>';

        detailRoot.innerHTML =
          '<div class="ch-detail-grid">' +
          /* Left: gallery */
          '<div class="ch-gallery">' + galleryMain + thumbs + '</div>' +
          /* Right: info */
          '<div class="ch-detail-info card">' +
          '<div class="ch-detail-type">' + esc(listing.type) + ' · ' + esc(listing.area) + '</div>' +
          '<h1 class="ch-detail-title">' + esc(listing.title) + '</h1>' +
          '<p class="ch-detail-addr"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 2C8.1 2 5 5.1 5 9c0 5.3 7 13 7 13s7-7.7 7-13c0-3.9-3.1-7-7-7Z"/><circle cx="12" cy="9" r="2.5"/></svg>' + esc(listing.address) + '</p>' +
          '<div class="ch-detail-chips">' + chips + '</div>' +
          '<div class="ch-detail-price-row">' +
          '<div><div class="ch-detail-rent">' + fmtRent(listing.rent) + '<span>/mo</span></div></div>' +
          '<div class="ch-detail-deposit">Deposit: <strong>' + fmtRent(listing.deposit) + '</strong></div>' +
          '</div>' +
          '<div class="ch-detail-actions">' +
          '<a href="tel:+911234567890" class="btn btn-solid">Contact owner</a>' +
          '</div>' +
          '</div>' +
          '</div>' +

          /* Score section */
          '<div class="ch-score-section">' +
          '<div class="section-head"><div class="step">StayScore</div><h2 id="ch-overall-score-head">Overall ' + score + ' / 10</h2></div>' +
          '<div style="display:grid;grid-template-columns:1fr 1fr;gap:22px;margin-top:22px;">' +
          '<div class="ch-score-top card">' +
          '<div class="ch-score-badge ' + scoreClass + ' ch-score-lg" aria-label="StayScore ' + score + '">' + score + '</div>' +
          '<div class="ch-score-label"><h3>StayScore</h3><p>Average of 6 real living quality ratings from residents.</p></div>' +
          '</div>' +
          '<div class="ch-wifi-box"><div class="ch-wifi-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M5 12.5C7.2 10.3 9.9 9 12 9s4.8 1.3 7 3.5M1.5 9C4.7 5.8 8.2 4 12 4s7.3 1.8 10.5 5M8.5 16c1-.9 2.2-1.5 3.5-1.5s2.5.6 3.5 1.5M12 19.5h.01"/></svg></div><div class="ch-wifi-text">Ad said <strong>' + (listing.advertised && listing.advertised.find(function(a){return a.ad.toLowerCase().indexOf("mbps")!==-1||a.ad.toLowerCase().indexOf("wi-fi")!==-1||a.ad.toLowerCase().indexOf("wifi")!==-1;}) ? esc((listing.advertised.find(function(a){return a.ad.toLowerCase().indexOf("mbps")!==-1||a.ad.toLowerCase().indexOf("wi-fi")!==-1||a.ad.toLowerCase().indexOf("wifi")!==-1;})||{ad:"N/A"}).ad) : "Wi-Fi included") + '</strong><br>Residents measured <strong>' + listing.measuredWifiMbps + ' Mbps</strong></div></div>' +
          '</div>' +
          '<div class="ch-detail-bars card" style="margin-top:22px;"><h4>Score breakdown</h4><dl>' + barsHTML + '</dl></div>' +
          '</div>' +

          /* Advertised vs Reality */
          '<div class="ch-avr-section" style="margin-top:40px;">' +
          '<div class="section-head"><h2>Advertised vs reality</h2></div>' +
          '<div class="card" style="overflow:hidden;margin-top:22px;"><table class="ch-avr-table"><thead><tr><th>What the ad said</th><th>What residents say</th><th></th></tr></thead><tbody>' + avrRows + '</tbody></table></div>' +
          '</div>' +

          /* Reviews */
          '<div class="ch-reviews-section" id="ch-reviews-section">' +
          '<div class="section-head" style="margin-bottom:0;"><h2>Reviews (' + reviews.length + ')</h2></div>' +
          '<div class="ch-reviews-list" style="margin-top:22px;">' + reviewsHTML + '</div>' +
          '</div>' +

          /* Owner */
          ownerHTML +

          /* Rate form */
          rateHTML;

        /* Thumbnail switcher */
        detailRoot.querySelectorAll(".ch-thumb").forEach(function (btn) {
          btn.addEventListener("click", function () {
            var idx = parseInt(btn.dataset.idx, 10);
            var mainImg = document.getElementById("ch-main-photo");
            if (mainImg && photos[idx]) mainImg.src = photos[idx];
            detailRoot.querySelectorAll(".ch-thumb").forEach(function (b) { b.classList.remove("ch-thumb-active"); });
            btn.classList.add("ch-thumb-active");
          });
        });

        /* Slider labels */
        scoreKeys.forEach(function (pair) {
          var k = pair[1];
          var sl = document.getElementById("ch-sl-" + k);
          var lbl = document.getElementById("ch-sl-val-" + k);
          if (sl && lbl) {
            sl.addEventListener("input", function () { lbl.textContent = sl.value; });
          }
        });

        /* Rate form submit */
        var rateForm = document.getElementById("ch-rate-form");
        if (rateForm) {
          rateForm.addEventListener("submit", function (e) {
            e.preventDefault();
            var scores = {};
            scoreKeys.forEach(function (pair) {
              var sl = document.getElementById("ch-sl-" + pair[1]);
              scores[pair[1]] = sl ? parseFloat(sl.value) : 5;
            });
            var review = {
              scores: scores,
              name: document.getElementById("ch-rate-name").value.trim() || "Anonymous",
              course: document.getElementById("ch-rate-course").value.trim(),
              months: parseInt(document.getElementById("ch-rate-months").value, 10) || 1,
              rating: Math.round(scoreKeys.reduce(function (s, p) { return s + scores[p[1]]; }, 0) / scoreKeys.length),
              text: document.getElementById("ch-rate-text").value.trim()
            };
            saveListingReview(review);
            document.getElementById("ch-rate-success").hidden = false;
            /* re-render to show updated score and review */
            setTimeout(function () { renderDetail(); }, 600);
          });
        }
      }

      renderDetail();
    }
  }

};

(function () {
  var load = window.TNDB ? TNDB.list("choose-reviews") : Promise.resolve([]);
  load.catch(function () { return []; }).then(function (rows) {
    var map = {};
    rows.slice().reverse().forEach(function (r) { (map[r.listingId] = map[r.listingId] || []).push(r); });
    window.CH_REVIEWS = map;
    window.CH_BOOT();
  });
})();
