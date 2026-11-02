/* home-motion.js — extra motion for the landing page only (index.html).
   Loads after motion.js. Adds: smooth inertial scrolling, scroll progress line,
   floating icons + drifting light behind the hero, typing search placeholder,
   a self-playing scam scan in the Verify demo, smoothly re-ordering flatmate
   matches, a typing complaint letter, active story chapter, a living CTA.
   Layout and content are untouched; everything is skipped for reduced motion. */
(function () {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  var fine = window.matchMedia("(pointer: fine) and (min-width: 900px)").matches;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  function icon(path) { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + path + "</svg>"; }
  var ICONS = {
    shield: '<path d="M12 3 4.5 6v5.5c0 4.6 3.1 8 7.5 9.5 4.4-1.5 7.5-4.9 7.5-9.5V6Z"/><path d="m8.8 12 2.2 2.2 4.4-4.6"/>',
    key: '<circle cx="8" cy="15" r="4"/><path d="m11 12 8.5-8.5M16.5 6l2.5 2.5M14.5 8l2 2"/>',
    house: '<path d="M4 11 12 4l8 7"/><path d="M6 10v10h12V10"/><path d="M12 17.5c-2-1.1-3-2.4-3-3.8 0-1 .8-1.8 1.7-1.8.6 0 1 .3 1.3.8.3-.5.7-.8 1.3-.8.9 0 1.7.8 1.7 1.8 0 1.4-1 2.7-3 3.8Z"/>',
    receipt: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2Z"/><path d="M9.5 8h5M9.5 8c2.6 0 2.6 4 0 4H9l4.5 4"/>',
    chat: '<path d="M4 5h16v11H9l-5 4Z"/>'
  };

  /* ---------- 1. Smooth inertial scrolling (desktop mouse/trackpad) ---------- */
  if (fine) {
    var target = window.scrollY, current = window.scrollY, running = false, ours = false;
    var maxScroll = function () { return document.documentElement.scrollHeight - window.innerHeight; };
    var canScrollInside = function (el, dy) {
      for (; el && el !== document.body; el = el.parentElement) {
        if (el.matches && el.matches("textarea, select, dialog[open], [data-native-scroll]")) return true;
        var cs = getComputedStyle(el);
        if (/(auto|scroll)/.test(cs.overflowY) && el.scrollHeight > el.clientHeight + 1) {
          if ((dy < 0 && el.scrollTop > 0) || (dy > 0 && el.scrollTop + el.clientHeight < el.scrollHeight - 1)) return true;
        }
      }
      return false;
    };
    var step = function () {
      current += (target - current) * 0.11;
      if (Math.abs(target - current) < 0.4) current = target;
      ours = true;
      window.scrollTo(0, current);
      if (current !== target) requestAnimationFrame(step); else running = false;
    };
    window.addEventListener("wheel", function (e) {
      if (e.ctrlKey || document.querySelector("dialog[open]")) return;
      var dy = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? window.innerHeight : 1);
      if (canScrollInside(e.target, dy)) return;
      e.preventDefault();
      if (!running) { current = window.scrollY; target = current; }
      target = Math.max(0, Math.min(maxScroll(), target + dy));
      if (!running) { running = true; requestAnimationFrame(step); }
    }, { passive: false });
    // in-page links glide through the same engine
    document.addEventListener("click", function (e) {
      var a = e.target.closest && e.target.closest('a[href^="#"]');
      if (!a || a.getAttribute("href").length < 2) return;
      var dest = document.querySelector(a.getAttribute("href"));
      if (!dest) return;
      e.preventDefault();
      current = window.scrollY;
      target = Math.max(0, Math.min(maxScroll(), dest.getBoundingClientRect().top + window.scrollY - 24));
      history.replaceState(null, "", a.getAttribute("href"));
      if (!running) { running = true; requestAnimationFrame(step); }
    });
    // keyboard, scrollbar drags and anchor jumps: follow the browser
    window.addEventListener("scroll", function () {
      if (ours) { ours = false; return; }
      if (!running) { target = current = window.scrollY; }
    }, { passive: true });
  }

  /* ---------- 2. Scroll progress line ---------- */
  var bar = document.createElement("div");
  bar.className = "hm-progress";
  bar.setAttribute("aria-hidden", "true");
  document.body.appendChild(bar);
  var onProgress = function () {
    var max = document.documentElement.scrollHeight - window.innerHeight;
    bar.style.transform = "scaleX(" + (max > 0 ? window.scrollY / max : 0).toFixed(4) + ")";
  };
  window.addEventListener("scroll", onProgress, { passive: true });
  onProgress();

  /* ---------- 3. Hero: drifting light + floating icons ---------- */
  var hero = $(".hero");
  var visual = $(".hero-visual");
  if (hero) {
    var glow = document.createElement("div");
    glow.className = "hm-glow";
    glow.setAttribute("aria-hidden", "true");
    glow.innerHTML = "<i></i><i></i><i></i>";
    hero.insertBefore(glow, hero.firstChild);
  }
  var floats = [];
  if (visual) {
    var spec = [
      { k: "shield", cls: "f1", depth: 1.4, label: "" },
      { k: "key", cls: "f2", depth: 0.9, label: "" },
      { k: "chat", cls: "f3", depth: 1.8, label: "92% match" },
      { k: "receipt", cls: "f4", depth: 1.1, label: "" },
      { k: "house", cls: "f5", depth: 0.7, label: "" }
    ];
    spec.forEach(function (s, i) {
      var f = document.createElement("span");
      f.className = "hm-float " + s.cls + (s.label ? " has-label" : "");
      f.setAttribute("aria-hidden", "true");
      f.style.setProperty("--fi", i);
      f.innerHTML = '<span class="hm-bob">' + icon(ICONS[s.k]) + (s.label ? "<b>" + s.label + "</b>" : "") + "</span>";
      visual.appendChild(f);
      floats.push({ el: f, depth: s.depth });
    });
    var mx = 0, my = 0, cx = 0, cy = 0, sy = 0, rafF = null;
    var drawFloats = function () {
      cx += (mx - cx) * 0.07; cy += (my - cy) * 0.07;
      floats.forEach(function (f) {
        f.el.style.translate = (cx * 26 * f.depth).toFixed(1) + "px " + (cy * 20 * f.depth - sy * 0.12 * f.depth).toFixed(1) + "px";
      });
      rafF = (Math.abs(mx - cx) > 0.002 || Math.abs(my - cy) > 0.002) ? requestAnimationFrame(drawFloats) : null;
    };
    if (fine) {
      hero.addEventListener("pointermove", function (e) {
        mx = e.clientX / window.innerWidth - 0.5;
        my = e.clientY / window.innerHeight - 0.5;
        if (!rafF) rafF = requestAnimationFrame(drawFloats);
      });
    }
    window.addEventListener("scroll", function () {
      sy = Math.min(window.scrollY, 900);
      if (!rafF) rafF = requestAnimationFrame(drawFloats);
    }, { passive: true });
  }

  /* ---------- 4. Search placeholder types itself ---------- */
  var q = $("#q");
  if (q) {
    var phrases = ["Search near Chitkara University", "Search PGs in Rajpura", "Search flats in Zirakpur", "Search rooms in Mohali"];
    var pi = 0, ci = 0, del = false, typing = true;
    q.addEventListener("focus", function () { typing = false; q.placeholder = "Search near your campus"; });
    q.addEventListener("blur", function () { if (!q.value) { typing = true; tick(); } });
    var tick = function () {
      if (!typing) return;
      var p = phrases[pi];
      ci += del ? -1 : 1;
      q.placeholder = p.slice(0, ci) + (ci % 2 ? "" : "");
      var wait = del ? 28 : 55;
      if (!del && ci === p.length) { del = true; wait = 1600; }
      else if (del && ci === 0) { del = false; pi = (pi + 1) % phrases.length; wait = 300; }
      setTimeout(tick, wait);
    };
    setTimeout(tick, 1400);
  }

  /* ---------- 5. Verify demo plays itself once ---------- */
  var scanner = $(".scanner");
  var listing = $("#listing");
  if (scanner && listing && typeof PRESETS !== "undefined") {
    var played = false, stopped = false;
    listing.addEventListener("focus", function () { stopped = true; });
    $$("[data-preset]", scanner).forEach(function (b) { b.addEventListener("click", function () { stopped = true; }); });
    new IntersectionObserver(function (en, obs) {
      if (!en[0].isIntersecting || played) return;
      played = true; obs.disconnect();
      if (listing.value.trim() || stopped) return;
      var text = PRESETS.army, i = 0;
      var area = $("#area"); if (area) area.value = "mohali";
      var armyBtn = $('[data-preset="army"]', scanner); if (armyBtn) armyBtn.classList.add("on");
      listing.classList.add("hm-typing");
      (function type() {
        if (stopped) { listing.classList.remove("hm-typing"); return; }
        i = Math.min(text.length, i + 3);
        listing.value = text.slice(0, i);
        listing.scrollTop = listing.scrollHeight;
        if (i < text.length) return setTimeout(type, 16);
        listing.classList.remove("hm-typing");
        scanner.style.setProperty("--scan-h", scanner.offsetHeight + "px");
        scanner.classList.add("scanning");
        setTimeout(function () {
          scanner.classList.remove("scanning");
          var btn = $("#scanBtn"); if (btn) btn.click();
        }, 750);
      })();
    }, { threshold: 0.55 }).observe(scanner);
  }

  /* ---------- 6. Flatmate matches slide into their new order ---------- */
  var matches = $("#matches");
  if (matches) {
    var before = null;
    document.addEventListener("pointerdown", function (e) {
      if (!e.target.closest || !e.target.closest(".matcher .seg button")) return;
      before = {};
      $$("li", matches).forEach(function (li) { before[li.querySelector("strong").textContent] = li.getBoundingClientRect().top; });
    }, true);
    new MutationObserver(function () {
      if (!before) return;
      var b = before; before = null;
      $$("li", matches).forEach(function (li) {
        var key = li.querySelector("strong").textContent;
        if (b[key] === undefined) return;
        var dy = b[key] - li.getBoundingClientRect().top;
        if (!dy) { li.animate([{ transform: "scale(.985)" }, { transform: "none" }], { duration: 300, easing: "ease-out" }); return; }
        li.animate([{ transform: "translateY(" + dy + "px)" }, { transform: "none" }], { duration: 650, easing: "cubic-bezier(.16,1,.3,1)" });
      });
    }).observe(matches, { childList: true });
  }

  /* ---------- 7. Evidence log drops in, letter types itself ---------- */
  var locker = $(".locker");
  if (locker) {
    var letterPs = $$(".letter p", locker);
    var full = letterPs.map(function (p) { return p.innerHTML; });
    new IntersectionObserver(function (en, obs) {
      if (!en[0].isIntersecting) return;
      obs.disconnect();
      locker.classList.add("hm-play");
      // type the letter after the log has landed
      var plain = letterPs.map(function (p) { return p.textContent; });
      letterPs.forEach(function (p) { p.textContent = ""; });
      var pi2 = 0, ci2 = 0;
      setTimeout(function typeLetter() {
        if (pi2 >= letterPs.length) { letterPs.forEach(function (p, k) { p.innerHTML = full[k]; }); return; }
        ci2 = Math.min(plain[pi2].length, ci2 + 2);
        letterPs[pi2].textContent = plain[pi2].slice(0, ci2);
        letterPs[pi2].classList.add("hm-caret");
        if (ci2 >= plain[pi2].length) { letterPs[pi2].classList.remove("hm-caret"); pi2++; ci2 = 0; }
        setTimeout(typeLetter, 14);
      }, 900);
    }, { threshold: 0.35 }).observe(locker);
  }

  /* ---------- 8. Story: the chapter in view lights up ---------- */
  var chapters = $$(".timeline li");
  if (chapters.length) {
    var lightChapter = function () {
      var mid = window.innerHeight * 0.55, best = null, bestD = Infinity;
      chapters.forEach(function (li) {
        var r = li.getBoundingClientRect();
        if (r.bottom < 0 || r.top > window.innerHeight) return;
        var d = Math.abs((r.top + r.bottom) / 2 - mid);
        if (d < bestD) { bestD = d; best = li; }
      });
      // on wide screens all four sit in one row: light them in order as the row scrolls past
      var tl = $(".timeline");
      var p = parseFloat(getComputedStyle(tl).getPropertyValue("--tl")) || 0;
      if (window.innerWidth > 1024) best = chapters[Math.min(chapters.length - 1, Math.floor(p * chapters.length * 1.15))];
      chapters.forEach(function (li) { li.classList.toggle("hm-active", li === best); });
      chapters.forEach(function (li, k) { li.classList.toggle("hm-lit", window.innerWidth > 1024 ? k <= chapters.indexOf(best) : li === best || li.classList.contains("hm-lit")); });
    };
    window.addEventListener("scroll", lightChapter, { passive: true });
    lightChapter();
  }

  /* ---------- 9. Cards tilt toward the cursor ---------- */
  if (fine) {
    $$(".stay, .feature").forEach(function (card) {
      card.addEventListener("pointermove", function (e) {
        var r = card.getBoundingClientRect();
        var x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
        card.style.transform = "perspective(900px) rotateY(" + (x * 5).toFixed(2) + "deg) rotateX(" + (-y * 5).toFixed(2) + "deg) translateY(-4px)";
      });
      card.addEventListener("pointerleave", function () { card.style.transform = ""; });
    });
  }

  /* ---------- 10. CTA: drifting light, floating icons, magnetic button ---------- */
  var cta = $(".cta");
  if (cta) {
    var layer = document.createElement("div");
    layer.className = "hm-cta-layer";
    layer.setAttribute("aria-hidden", "true");
    layer.innerHTML = ["shield", "key", "house", "receipt"].map(function (k, i) { return '<span class="hm-cf c' + i + '">' + icon(ICONS[k]) + "</span>"; }).join("");
    cta.insertBefore(layer, cta.firstChild);
    var mbtn = $(".btn", cta);
    if (mbtn && fine) {
      cta.addEventListener("pointermove", function (e) {
        var r = mbtn.getBoundingClientRect();
        var dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
        var d = Math.hypot(dx, dy);
        if (d < 180) mbtn.style.translate = (dx * 0.22).toFixed(1) + "px " + (dy * 0.3).toFixed(1) + "px";
        else mbtn.style.translate = "";
        cta.style.setProperty("--mx", ((e.clientX - cta.getBoundingClientRect().left) / cta.offsetWidth * 100).toFixed(1) + "%");
        cta.style.setProperty("--my", ((e.clientY - cta.getBoundingClientRect().top) / cta.offsetHeight * 100).toFixed(1) + "%");
      });
      cta.addEventListener("pointerleave", function () { mbtn.style.translate = ""; });
    }
  }
})();
