/* lv-side.js — side panels for the Flatmates vibe quiz.
   Left: "Your vibe" card that fills in trait by trait as you answer.
   Right: live top-3 matches that re-rank (with a smooth slide) after every answer.
   Listens to the "lv:answers" event that live.js sends. */
(function () {
  if (!document.getElementById("lv-quiz-section") || typeof LV_HOUSEHOLDS === "undefined") return;

  var ICON = {
    sleep: '<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z"/>',
    cleanliness: '<path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/>',
    food: '<path d="M5 19c9 1 14-5 14-15C9 4 4 9 5 19Z"/><path d="M5 19 13 11"/>',
    guests: '<circle cx="9" cy="8" r="3.2"/><path d="M3.5 19a5.5 5.5 0 0 1 11 0"/><circle cx="17" cy="9" r="2.4"/><path d="M15.5 14.2A4.5 4.5 0 0 1 21 18.5"/>',
    noise: '<path d="M4 9v6h4l5 4V5L8 9Z"/><path d="M16.5 9a4 4 0 0 1 0 6"/><path d="M19 6.5a8 8 0 0 1 0 11"/>',
    smoking: '<rect x="2.5" y="13" width="15" height="4" rx="1"/><path d="M20 13v4M17.5 4c0 2 2 2 2 4s-2 2-2 4"/>',
    studyHabits: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5Z"/><path d="M4 20.5A2.5 2.5 0 0 1 6.5 18H20v3H6.5"/>',
    sharing: '<path d="M7 5h10M7 9h10M9.5 5c4 0 4 8 0 8H7l7 7"/>'
  };
  var LABEL = { sleep: "Sleep", cleanliness: "Cleaning", food: "Food", guests: "Guests", noise: "Noise", smoking: "Smoking", studyHabits: "Study", sharing: "Money" };
  var WEIGHTS = { sleep: 3, cleanliness: 3, smoking: 3, food: 2, noise: 2, guests: 2, studyHabits: 1, sharing: 1 };
  var COLORS = ["#2E7D4F", "#3A6B8A", "#7B5EA7", "#C0622F", "#5E8C6A", "#8A6B2C"];
  var KEYS = LV_VIBE_QUESTIONS.map(function (q) { return q.key; });

  function svg(path) { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + path + '</svg>'; }
  function esc(s) { return String(s || "").replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function shortLabel(key, value) {
    var q = LV_VIBE_QUESTIONS.filter(function (x) { return x.key === key; })[0];
    var o = q && q.options.filter(function (x) { return x.value === value; })[0];
    return o ? o.label.split(/ [—(]/)[0] : value;
  }

  /* ---------- Build the layout around the quiz ---------- */
  var wrap = document.querySelector("#lv-quiz-section .lv-quiz-wrap");
  var stage = document.createElement("div");
  stage.className = "lv-stage";
  wrap.parentNode.insertBefore(stage, wrap);

  var left = document.createElement("aside");
  left.className = "lv-side lv-side-left card";
  left.setAttribute("aria-label", "Your vibe so far");
  left.innerHTML =
    '<div class="lv-side-top"><span class="lv-me" aria-hidden="true">' + svg('<circle cx="12" cy="8.5" r="3.6"/><path d="M5 20a7 7 0 0 1 14 0"/>') + '</span>' +
    '<div><h3>Your vibe</h3><p id="lv-side-count">0 of ' + KEYS.length + ' traits</p></div>' +
    '<svg class="lv-ring" viewBox="0 0 36 36" aria-hidden="true"><circle cx="18" cy="18" r="15.5"/><circle id="lv-ring-fill" cx="18" cy="18" r="15.5" pathLength="100" stroke-dasharray="0 100"/></svg></div>' +
    '<ul class="lv-traits">' + KEYS.map(function (k) {
      return '<li data-key="' + k + '"><span class="lv-ti">' + svg(ICON[k] || ICON.sleep) + '</span><span class="lv-tl">' + LABEL[k] + '</span><span class="lv-tv">—</span></li>';
    }).join("") + '</ul>';

  var right = document.createElement("aside");
  right.className = "lv-side lv-side-right card";
  right.setAttribute("aria-label", "Live matches");
  right.innerHTML =
    '<div class="lv-side-head"><h3>Live matches</h3><span class="lv-live"><i></i>Updating</span></div>' +
    '<p class="lv-side-sub">Households looking for a flatmate, ranked as you answer.</p>' +
    '<ol class="lv-mini" id="lv-mini"></ol>' +
    '<p class="lv-tip"><strong>Tip:</strong> honest answers mean fewer arguments about dishes at 1 am.</p>';

  stage.appendChild(left);
  stage.appendChild(wrap);
  stage.appendChild(right);

  /* soft floating doodles in the background of the stage */
  var doodles = document.createElement("div");
  doodles.className = "lv-doodles";
  doodles.setAttribute("aria-hidden", "true");
  doodles.innerHTML = ["sleep", "cleanliness", "food", "noise", "studyHabits"].map(function (k, i) {
    return '<span class="lv-doodle d' + i + '">' + svg(ICON[k]) + '</span>';
  }).join("");
  stage.appendChild(doodles);

  /* ---------- Live state ---------- */
  var listEl = document.getElementById("lv-mini");
  var rows = {}; // id -> li

  function partialPct(houseVibe, ans) {
    var tot = 0, hit = 0;
    Object.keys(ans).forEach(function (k) {
      var w = WEIGHTS[k] || 1;
      tot += w;
      if (houseVibe[k] === ans[k]) hit += w;
    });
    return tot ? Math.round((hit / tot) * 100) : null;
  }

  function update(ans, current) {
    var done = Object.keys(ans).length;

    // left: traits
    KEYS.forEach(function (k, i) {
      var li = left.querySelector('[data-key="' + k + '"]');
      var was = li.classList.contains("set");
      li.classList.toggle("set", !!ans[k]);
      li.classList.toggle("now", i === current);
      li.querySelector(".lv-tv").textContent = ans[k] ? shortLabel(k, ans[k]) : "—";
      if (ans[k] && !was) { li.classList.remove("pop"); void li.offsetWidth; li.classList.add("pop"); }
    });
    document.getElementById("lv-side-count").textContent = done + " of " + KEYS.length + " traits";
    document.getElementById("lv-ring-fill").setAttribute("stroke-dasharray", (done / KEYS.length * 100).toFixed(1) + " 100");

    // right: top 3, re-ranked with a FLIP slide
    var ranked = LV_HOUSEHOLDS.map(function (h) { return { h: h, pct: partialPct(h.vibe || {}, ans) }; })
      .sort(function (a, b) { return (b.pct || 0) - (a.pct || 0); })
      .slice(0, 3);

    var before = {};
    Object.keys(rows).forEach(function (id) { before[id] = rows[id].getBoundingClientRect().top; });

    var keep = {};
    ranked.forEach(function (r, idx) {
      var id = r.h.id;
      keep[id] = true;
      var li = rows[id];
      if (!li) {
        li = document.createElement("li");
        var m = (r.h.members || [])[0] || { name: "Flatmate" };
        var names = (r.h.members || []).map(function (x) { return x.name.split(" ")[0]; }).join(" & ");
        li.innerHTML =
          '<span class="lv-av" style="background:' + COLORS[(m.name.charCodeAt(0) || 0) % COLORS.length] + '">' + esc(m.name.charAt(0)) + '</span>' +
          '<span class="lv-who"><strong>' + esc(names) + '</strong><small>' + esc(r.h.flatType + " · " + r.h.area) + '</small><i class="lv-bar"><b></b></i></span>' +
          '<span class="lv-pc">—</span>';
        li.classList.add("enter");
        rows[id] = li;
      }
      li.querySelector(".lv-pc").textContent = r.pct === null ? "—" : r.pct + "%";
      li.querySelector(".lv-bar b").style.width = (r.pct || 0) + "%";
      li.classList.toggle("top", idx === 0 && r.pct !== null);
      listEl.appendChild(li); // moves it into rank order
    });
    Object.keys(rows).forEach(function (id) { if (!keep[id]) { rows[id].remove(); delete rows[id]; } });

    // FLIP: animate from old position to new
    Object.keys(rows).forEach(function (id) {
      var li = rows[id];
      if (before[id] === undefined) { requestAnimationFrame(function () { li.classList.remove("enter"); }); return; }
      var dy = before[id] - li.getBoundingClientRect().top;
      if (!dy) return;
      li.style.transition = "none";
      li.style.transform = "translateY(" + dy + "px)";
      requestAnimationFrame(function () {
        li.style.transition = "";
        li.style.transform = "";
      });
    });
  }

  document.addEventListener("lv:answers", function (e) { update(e.detail.answers, e.detail.current); });
  update({}, 0);
})();
