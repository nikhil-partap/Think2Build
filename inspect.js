/* inspect.js — Move-in check (hidden damage detection) on the Trust Check page.
   Owner uploads a dated photo of each spot at handover; tenant uploads the same
   spot after moving in. We compare the two photos pixel by pixel (after evening
   out lighting), highlight the areas that changed, and let the tenant report a
   hidden issue straight into the Protect evidence locker.
   Data: TNDB collection "inspect-properties" (synced through git with server.js). */
(function () {
  var $ = function (id) { return document.getElementById(id); };
  if (!$("tc-inspect")) return;

  var COL = "inspect-properties";
  var props = [];      // all properties
  var prop = null;     // selected property
  var spot = null;     // selected spot
  var role = "tenant";

  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function today() { var d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
  function fmt(iso) { if (!iso) return ""; var p = iso.split("-").map(Number); return new Date(p[0], p[1] - 1, p[2]).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }); }
  function uid() { return Date.now().toString(36) + Math.random().toString(16).slice(2, 6); }
  function save() { if (prop) return TNDB.update(COL, prop.id, prop).catch(function () {}); }

  /* ---------- Tabs ---------- */
  var tabs = [$("tc-tab-scan"), $("tc-tab-inspect")];
  function selectTab(t, focus) {
    tabs.forEach(function (x) {
      var on = x === t;
      x.classList.toggle("on", on);
      x.setAttribute("aria-selected", on);
      x.tabIndex = on ? 0 : -1;
      $(x.getAttribute("aria-controls")).hidden = !on;
    });
    if (focus) t.focus();
    history.replaceState(null, "", t === tabs[1] ? "#move-in" : location.pathname + location.search);
  }
  tabs.forEach(function (t, i) {
    t.addEventListener("click", function () { selectTab(t); });
    t.addEventListener("keydown", function (e) {
      if (e.key === "ArrowRight" || e.key === "ArrowLeft") selectTab(tabs[1 - i], true);
    });
  });
  if (location.hash === "#move-in") selectTab(tabs[1]);

  /* ---------- Role ---------- */
  document.querySelectorAll(".in-role [data-role]").forEach(function (b) {
    b.addEventListener("click", function () {
      role = b.dataset.role;
      document.querySelectorAll(".in-role [data-role]").forEach(function (x) { x.classList.toggle("on", x === b); });
      renderView();
    });
  });

  /* ---------- Properties ---------- */
  function renderProps() {
    var sel = $("in-prop");
    sel.innerHTML = '<option value="">Choose a property</option>' + props.map(function (p) {
      return '<option value="' + esc(p.id) + '">' + esc(p.name) + "</option>";
    }).join("");
    sel.value = prop ? prop.id : "";
  }
  $("in-prop").addEventListener("change", function () {
    prop = props.filter(function (p) { return p.id === this.value; }, this)[0] || null;
    spot = null;
    renderAll();
  });
  $("in-newprop").addEventListener("submit", function (e) {
    e.preventDefault();
    var name = $("in-prop-name").value.trim();
    if (!name) return $("in-prop-name").focus();
    TNDB.add(COL, { name: name, spots: [] }).then(function (p) {
      props.push(p); prop = p; spot = null; $("in-prop-name").value = "";
      renderAll();
    });
  });

  /* ---------- Spots ---------- */
  function statusOf(s) {
    if (s.status === "issue") return { cls: "bad", text: "Hidden issue" };
    if (s.status === "ok") return { cls: "good", text: "Same as handover" };
    if (s.before && s.after) return { cls: "warn", text: "Ready to compare" };
    if (s.before) return { cls: "", text: "Waiting for tenant" };
    return { cls: "", text: "Waiting for owner" };
  }
  function renderSpots() {
    var ul = $("in-spots");
    if (!prop) { ul.innerHTML = '<li class="in-none">Choose or add a property first.</li>'; $("in-sum").textContent = ""; return; }
    if (!prop.spots.length) ul.innerHTML = '<li class="in-none">No spots yet. Add the things that usually break: switchboards, taps, drains, walls.</li>';
    else ul.innerHTML = prop.spots.map(function (s) {
      var st = statusOf(s);
      return '<li><button type="button" data-id="' + s.id + '" class="' + (spot && spot.id === s.id ? "on" : "") + '">' +
        '<span class="in-thumbs">' + (s.before ? '<img src="' + s.before.img + '" alt="">' : "<i></i>") + (s.after ? '<img src="' + s.after.img + '" alt="">' : "<i></i>") + "</span>" +
        '<span class="in-spot-t"><strong>' + esc(s.item) + "</strong><small>" + esc(s.room) + "</small></span>" +
        '<span class="in-dot ' + st.cls + '" title="' + st.text + '"></span></button></li>';
    }).join("");
    ul.querySelectorAll("button[data-id]").forEach(function (b) {
      b.addEventListener("click", function () { spot = prop.spots.filter(function (s) { return s.id === b.dataset.id; })[0]; renderAll(); });
    });
    var issues = prop.spots.filter(function (s) { return s.status === "issue"; }).length;
    $("in-sum").textContent = prop.spots.length + " spots" + (issues ? " · " + issues + " issue" + (issues > 1 ? "s" : "") : "");
  }
  $("in-newspot").addEventListener("submit", function (e) {
    e.preventDefault();
    if (!prop) return $("in-prop-name").focus();
    var item = $("in-item").value.trim();
    if (!item) return $("in-item").focus();
    var s = { id: uid(), room: $("in-room").value, item: item, before: null, after: null, status: null, note: "" };
    prop.spots.push(s); spot = s; $("in-item").value = "";
    save(); renderAll();
  });

  /* ---------- Uploads (resized so they fit in storage) ---------- */
  function resize(file, cb) {
    var r = new FileReader();
    r.onload = function () {
      var img = new Image();
      img.onload = function () {
        var k = Math.min(1, 1000 / img.width), c = document.createElement("canvas");
        c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        cb(c.toDataURL("image/jpeg", 0.78));
      };
      img.src = r.result;
    };
    r.readAsDataURL(file);
  }
  document.querySelectorAll(".in-up input").forEach(function (inp) {
    inp.addEventListener("change", function () {
      var f = inp.files[0]; inp.value = "";
      if (!f || !spot) return;
      var side = inp.dataset.side;
      resize(f, function (data) {
        var user = window.TrustNestUser ? window.TrustNestUser() : null;
        spot[side] = { img: data, date: today(), by: user ? user.name : (side === "before" ? "Owner" : "Tenant") };
        if (side === "after" || side === "before") { spot.status = null; spot.diff = null; }
        save(); renderAll();
      });
    });
  });

  /* ---------- Compare: real pixel difference ---------- */
  function loadImg(src) { return new Promise(function (res) { var i = new Image(); i.onload = function () { res(i); }; i.src = src; }); }
  var GW = 120, GH = 90; // analysis grid
  function pixels(img) {
    var c = document.createElement("canvas"); c.width = GW; c.height = GH;
    var x = c.getContext("2d");
    // cover-fit so both photos are compared over the same framing
    var r = Math.max(GW / img.width, GH / img.height), w = img.width * r, h = img.height * r;
    x.filter = "blur(1px)";
    x.drawImage(img, (GW - w) / 2, (GH - h) / 2, w, h);
    return x.getImageData(0, 0, GW, GH).data;
  }
  function compare(a, b) {
    var A = pixels(a), B = pixels(b), n = GW * GH;
    // even out exposure: match mean brightness of each channel
    var ma = [0, 0, 0], mb = [0, 0, 0];
    for (var i = 0; i < n; i++) for (var c = 0; c < 3; c++) { ma[c] += A[i * 4 + c]; mb[c] += B[i * 4 + c]; }
    var gain = [0, 1, 2].map(function (c) { return mb[c] ? ma[c] / mb[c] : 1; });
    var mask = new Uint8Array(n), changed = 0;
    for (i = 0; i < n; i++) {
      var d = 0;
      for (c = 0; c < 3; c++) d += Math.abs(A[i * 4 + c] - B[i * 4 + c] * gain[c]);
      if (d > 70) { mask[i] = 1; changed++; }
    }
    // clean up speckle: keep pixels with at least 3 changed neighbours
    var clean = new Uint8Array(n), kept = 0;
    for (var y = 1; y < GH - 1; y++) for (var x2 = 1; x2 < GW - 1; x2++) {
      var k = y * GW + x2; if (!mask[k]) continue;
      var nb = mask[k - 1] + mask[k + 1] + mask[k - GW] + mask[k + GW] + mask[k - GW - 1] + mask[k - GW + 1] + mask[k + GW - 1] + mask[k + GW + 1];
      if (nb >= 3) { clean[k] = 1; kept++; }
    }
    // where is it? split into a 3x3 map
    var zones = [0, 0, 0, 0, 0, 0, 0, 0, 0];
    for (y = 0; y < GH; y++) for (x2 = 0; x2 < GW; x2++) if (clean[y * GW + x2]) zones[Math.floor(y / (GH / 3)) * 3 + Math.floor(x2 / (GW / 3))]++;
    var top = zones.indexOf(Math.max.apply(null, zones));
    return { mask: clean, pct: Math.round(kept / n * 1000) / 10, zone: top };
  }
  var ZONE = ["top left", "top", "top right", "left side", "middle", "right side", "bottom left", "bottom", "bottom right"];

  function drawHeat(res) {
    var cv = $("in-heat"), box = $("in-slider").getBoundingClientRect();
    cv.width = GW; cv.height = GH;
    var x = cv.getContext("2d"), id = x.createImageData(GW, GH);
    for (var i = 0; i < GW * GH; i++) if (res.mask[i]) { id.data[i * 4] = 225; id.data[i * 4 + 1] = 40; id.data[i * 4 + 2] = 30; id.data[i * 4 + 3] = 150; }
    x.putImageData(id, 0, 0);
    cv.hidden = !$("in-highlight").checked;
  }
  $("in-highlight").addEventListener("change", function () { $("in-heat").hidden = !this.checked; });

  /* slider */
  function setSlider(v) {
    $("in-cmp-before-wrap").style.clipPath = "inset(0 " + (100 - v) + "% 0 0)";
    $("in-handle").style.left = v + "%";
  }
  $("in-range").addEventListener("input", function () { setSlider(+this.value); });

  /* ---------- Main view ---------- */
  function slotHTML(side) {
    var d = spot[side];
    var fig = $(side === "before" ? "in-before" : "in-after");
    fig.querySelector(".in-frame").innerHTML = d
      ? '<img src="' + d.img + '" alt=""><span class="in-date">' + fmt(d.date) + " · " + esc(d.by) + "</span>"
      : '<div class="in-ph">' + (side === "before" ? "Owner hasn't added a handover photo" : "No photo after move-in yet") + "</div>";
    var can = side === "before" ? role === "landlord" : role === "tenant";
    var locked = side === "before" && spot.after; // handover photo can't change once the tenant has compared
    var up = fig.querySelector(".in-up");
    up.hidden = !can || locked;
    up.firstChild.textContent = d ? "Replace photo" : (side === "before" ? "Upload owner photo" : "Upload tenant photo");
    fig.classList.toggle("in-locked", !!locked);
  }

  function renderView() {
    $("in-empty").hidden = !!spot;
    $("in-view").hidden = !spot;
    if (!spot) return;
    $("in-crumb").textContent = (prop ? prop.name + " · " : "") + spot.room;
    $("in-title").textContent = spot.item;
    var st = statusOf(spot);
    $("in-status").className = "in-status " + st.cls;
    $("in-status").textContent = st.text;
    slotHTML("before"); slotHTML("after");
    $("in-note").value = spot.note || "";
    $("in-note").disabled = role !== "tenant";

    var both = spot.before && spot.after;
    $("in-compare").hidden = !both;
    if (!both) return;
    $("in-cmp-before").src = spot.before.img;
    $("in-cmp-after").src = spot.after.img;
    $("in-range").value = 50; setSlider(50);
    $("in-verdict").innerHTML = '<span class="in-spin"></span> Comparing the two photos…';
    Promise.all([loadImg(spot.before.img), loadImg(spot.after.img)]).then(function (im) {
      var res = compare(im[0], im[1]);
      spot.diff = { pct: res.pct, zone: res.zone };
      drawHeat(res);
      var big = res.pct >= 1.5;
      $("in-verdict").className = "in-verdict " + (big ? "bad" : "good");
      $("in-verdict").innerHTML = big
        ? "<strong>" + res.pct + "% of the photo has changed</strong> since handover, mostly at the " + ZONE[res.zone] + ". This wasn't visible in the owner's photo from " + fmt(spot.before.date) + "."
        : "<strong>Looks the same as handover</strong> (" + res.pct + "% difference, within normal lighting changes).";
      animateSweep();
    });
    $("in-report").disabled = role !== "tenant";
    $("in-ok").disabled = role !== "tenant";
  }

  // when a comparison loads, sweep the slider once so the change is obvious
  function animateSweep() {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    var t0 = performance.now();
    (function f(t) {
      var k = Math.min(1, (t - t0) / 1400), v = 50 + Math.sin(k * Math.PI * 2) * 38 * (1 - k);
      $("in-range").value = v; setSlider(v);
      if (k < 1) requestAnimationFrame(f);
    })(t0);
  }

  $("in-report").addEventListener("click", function () {
    if (!spot) return;
    spot.status = "issue"; spot.note = $("in-note").value.trim(); spot.reportedOn = today();
    save(); renderAll();
    $("in-reportcard").scrollIntoView({ behavior: "smooth", block: "start" });
  });
  $("in-ok").addEventListener("click", function () {
    if (!spot) return;
    spot.status = "ok"; spot.note = $("in-note").value.trim();
    save(); renderAll();
  });
  $("in-note").addEventListener("change", function () { if (spot) { spot.note = this.value.trim(); save(); } });

  /* ---------- Report ---------- */
  function renderReport() {
    var card = $("in-reportcard");
    var issues = prop ? prop.spots.filter(function (s) { return s.status === "issue"; }) : [];
    card.hidden = !issues.length;
    if (!issues.length) return;
    var checked = prop.spots.filter(function (s) { return s.before && s.after; }).length;
    $("in-report-sub").textContent = prop.name + " · " + issues.length + " hidden issue" + (issues.length > 1 ? "s" : "") + " out of " + checked + " spots compared";
    $("in-issues").innerHTML = issues.map(function (s) {
      return '<li><div class="in-pairmini"><img src="' + s.before.img + '" alt="Handover"><img src="' + s.after.img + '" alt="After move-in"></div>' +
        '<div><strong>' + esc(s.room) + " · " + esc(s.item) + "</strong>" +
        "<p>" + (s.note ? esc(s.note) : "Damage not visible at handover.") + "</p>" +
        "<small>Handover photo " + fmt(s.before.date) + " · Found " + fmt(s.after.date) + (s.diff ? " · " + s.diff.pct + "% changed" : "") + "</small></div></li>";
    }).join("");
  }
  $("in-pdf").addEventListener("click", function () { document.body.classList.add("in-printing"); window.print(); setTimeout(function () { document.body.classList.remove("in-printing"); }, 500); });
  $("in-locker").addEventListener("click", function () {
    var btn = this;
    var issues = prop.spots.filter(function (s) { return s.status === "issue"; });
    Promise.all(issues.map(function (s) {
      return TNDB.update("protect-evidence", "in-" + s.id, {
        date: s.after.date, category: "Maintenance complaint",
        title: "Hidden issue: " + s.room + " " + s.item.toLowerCase(),
        note: (s.note ? s.note + " " : "") + "Not visible in the owner's handover photo from " + fmt(s.before.date) + "." + (s.diff ? " Photo comparison: " + s.diff.pct + "% changed." : ""),
        amount: null, photos: [s.before.img, s.after.img]
      });
    })).then(function () {
      btn.textContent = "Added to evidence locker ✓";
      setTimeout(function () { btn.textContent = "Add to evidence locker"; }, 2500);
    });
  });

  function renderAll() { renderProps(); renderSpots(); renderView(); renderReport(); }

  /* ---------- Demo flat: real photos with real damage painted in ---------- */
  function damaged(src, paint) {
    return loadImg(src).then(function (img) {
      var c = document.createElement("canvas"); c.width = img.width; c.height = img.height;
      var x = c.getContext("2d"); x.drawImage(img, 0, 0);
      paint(x, c.width, c.height);
      return c.toDataURL("image/jpeg", 0.85);
    });
  }
  function toData(src) { return damaged(src, function () {}); }
  function stain(x, cx, cy, r) {
    var g = x.createRadialGradient(cx, cy, r * 0.1, cx, cy, r);
    g.addColorStop(0, "rgba(78,54,26,.85)"); g.addColorStop(0.55, "rgba(110,80,40,.55)"); g.addColorStop(1, "rgba(120,88,45,0)");
    x.fillStyle = g; x.beginPath(); x.ellipse(cx, cy, r, r * 1.35, 0.3, 0, Math.PI * 2); x.fill();
  }
  function crack(x, pts, w) {
    x.strokeStyle = "rgba(40,32,26,.85)"; x.lineWidth = w; x.lineJoin = "round"; x.beginPath();
    pts.forEach(function (p, i) { i ? x.lineTo(p[0], p[1]) : x.moveTo(p[0], p[1]); }); x.stroke();
  }

  $("in-demo").addEventListener("click", function () {
    var btn = this; btn.disabled = true; btn.textContent = "Loading demo…";
    var ago = function (n) { var d = new Date(); d.setDate(d.getDate() - n); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); };
    Promise.all([
      toData("assets/room-1.jpg"),
      damaged("assets/room-1.jpg", function (x, w, h) {
        stain(x, w * 0.33, h * 0.26, w * 0.1);
        stain(x, w * 0.4, h * 0.14, w * 0.05);
        crack(x, [[w * .22, h * .1], [w * .25, h * .2], [w * .23, h * .3], [w * .27, h * .42], [w * .25, h * .52]], Math.max(2, w / 260));
        crack(x, [[w * .25, h * .2], [w * .3, h * .26]], Math.max(1.5, w / 360));
      }),
      toData("assets/choose/ch01-c.jpg"),
      damaged("assets/choose/ch01-c.jpg", function (x, w, h) {
        var g = x.createRadialGradient(w * .52, h * .9, 4, w * .52, h * .9, w * .2);
        g.addColorStop(0, "rgba(70,60,40,.7)"); g.addColorStop(1, "rgba(70,60,40,0)");
        x.fillStyle = g; x.fillRect(0, h * .7, w, h * .3);
        stain(x, w * .14, h * .35, w * .05);
      }),
      toData("assets/choose/ch01-b.jpg")
    ]).then(function (im) {
      var demo = {
        id: "demo-sunrise-pg",
        name: "Demo · Room 3, Sunrise PG",
        spots: [
          { id: "d1", room: "Bedroom", item: "Wall above desk", before: { img: im[0], date: ago(9), by: "Mr. R. Sharma (owner)" }, after: { img: im[1], date: ago(2), by: "Riya (tenant)" }, status: null, note: "Damp patch and a crack appeared on the wall. It gets worse when it rains." },
          { id: "d2", room: "Bathroom", item: "Floor drain", before: { img: im[2], date: ago(9), by: "Mr. R. Sharma (owner)" }, after: { img: im[3], date: ago(3), by: "Riya (tenant)" }, status: null, note: "Drain is blocked, water stays on the floor for hours." },
          { id: "d3", room: "Hall", item: "Mess area", before: { img: im[4], date: ago(9), by: "Mr. R. Sharma (owner)" }, after: { img: im[4], date: ago(3), by: "Riya (tenant)" }, status: null, note: "" },
          { id: "d4", room: "Bedroom", item: "Switchboard", before: null, after: null, status: null, note: "" }
        ]
      };
      return TNDB.update(COL, demo.id, demo).then(function (saved) {
        props = props.filter(function (p) { return p.id !== demo.id; }).concat(saved);
        prop = saved; spot = saved.spots[0];
        role = "tenant";
        document.querySelectorAll(".in-role [data-role]").forEach(function (x) { x.classList.toggle("on", x.dataset.role === "tenant"); });
        renderAll();
        btn.disabled = false; btn.textContent = "Reload demo flat";
      });
    });
  });

  /* ---------- Start ---------- */
  TNDB.list(COL).then(function (rows) {
    props = rows;
    prop = props[props.length - 1] || null;
    renderAll();
  }).catch(function () { renderAll(); });
})();
