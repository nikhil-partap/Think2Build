/* TrustNest motion layer (all pages). Include right after site.js:
     <script src="motion.js"></script>
   - Headline words rise in on load, hero photo unveils, badges pop
   - Cards, sections and timeline chapters glide in as you scroll (staggered)
   - Score bars fill and numbers count up when they come into view
   - Sticky frosted nav, gentle hero parallax + tilt, button press feedback
   - Smooth fade between pages
   Everything is skipped when the visitor prefers reduced motion,
   and content stays visible if this script never runs. */
(function () {
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var root = document.documentElement;

  /* ---------- Sticky nav: frosted once you scroll ---------- */
  var nav = document.querySelector(".nav");
  if (nav) {
    var onScroll = function () { nav.classList.toggle("nav-scrolled", window.scrollY > 12); };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  if (reduce) return;
  root.classList.add("js-motion");

  /* ---------- Page enter / leave ---------- */
  requestAnimationFrame(function () { requestAnimationFrame(function () { root.classList.add("page-in"); }); });
  window.addEventListener("pageshow", function (e) { if (e.persisted) root.classList.remove("page-out"); });
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest("a[href]");
    if (!a || a.target === "_blank" || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    var href = a.getAttribute("href");
    if (!href || href.charAt(0) === "#" || /^(mailto:|tel:|javascript:)/.test(href)) return;
    var url = new URL(a.href, location.href);
    if (url.origin !== location.origin && location.protocol !== "file:") return;
    if (url.pathname === location.pathname && url.hash) return; // in-page jump
    if (document.startViewTransition) return; // the browser animates the switch itself
    e.preventDefault();
    root.classList.add("page-out");
    setTimeout(function () { location.href = a.href; }, 220);
  });

  /* ---------- Headline: words rise from a mask ---------- */
  function splitWords(el) {
    if (!el || el.dataset.split) return;
    el.dataset.split = "1";
    var i = 0;
    (function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (n) {
        if (n.nodeType === 3) {
          var frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(function (part) {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
            var mask = document.createElement("span");
            mask.className = "w-mask";
            var w = document.createElement("span");
            w.className = "w";
            w.style.setProperty("--i", i++);
            w.textContent = part;
            mask.appendChild(w);
            frag.appendChild(mask);
          });
          node.replaceChild(frag, n);
        } else if (n.nodeType === 1 && n.tagName !== "BR") {
          walk(n);
        }
      });
    })(el);
    el.setAttribute("aria-label", el.textContent.replace(/\s+/g, " ").trim());
    el.classList.add("tn-split");
  }
  var h1 = document.querySelector(".page h1");
  splitWords(h1);

  /* ---------- Scroll reveal ---------- */
  var REVEAL = [
    ".hero-copy > *:not(h1)", ".hero-visual", ".feature",
    ".section-head", ".timeline li", ".stay", ".scanner", ".matcher", ".locker", ".empty-bed", ".cta", ".more-row",
    ".v-head > p", ".v-form", ".v-report", ".v-feed-head", ".v-feed-list li",
    ".pr-head > p", ".pr-tabs", ".pr-grid > .card", ".pr-tracker-card",
    ".ch-head > *:not(h1)", ".ch-filters", ".ch-card", ".ch-detail-bars", ".card",
    ".lv-head > *:not(h1)", ".lv-tabs", ".lv-quiz-card", ".lv-hh-card",
    ".footer"
  ].join(",");

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (!en.isIntersecting) return;
      var el = en.target;
      // stagger siblings that appear together
      var sibs = el.parentElement ? Array.prototype.filter.call(el.parentElement.children, function (c) { return c.classList.contains("rv") && !c.classList.contains("in"); }) : [];
      var idx = Math.max(0, sibs.indexOf(el));
      el.style.setProperty("--d", Math.min(idx, 6) * 70 + "ms");
      el.classList.add("in");
      countUp(el);
      io.unobserve(el);
      // once it has landed, hand the element back to its normal hover/transition styles
      setTimeout(function () { el.classList.remove("rv", "in"); el.style.removeProperty("--d"); }, 1400 + idx * 70);
    });
  }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });

  function register(scope) {
    var list = (scope.matches && scope.matches(REVEAL)) ? [scope] : [];
    list = list.concat(Array.prototype.slice.call(scope.querySelectorAll ? scope.querySelectorAll(REVEAL) : []));
    list.forEach(function (el) {
      if (el.classList.contains("rv") || el.closest("dialog, .nav, .ch-compare-tray")) return;
      // don't double-animate a card that sits inside another revealing element
      var parent = el.parentElement && el.parentElement.closest(".rv:not(.in)");
      if (parent && parent !== el) return;
      el.classList.add("rv");
      io.observe(el);
    });
  }
  register(document);

  // Pages that render their content with JavaScript (explore, flatmates, protect...)
  new MutationObserver(function (muts) {
    muts.forEach(function (m) {
      Array.prototype.forEach.call(m.addedNodes, function (n) { if (n.nodeType === 1) { register(n); countUp(n, true); } });
    });
  }).observe(document.body, { childList: true, subtree: true });

  /* ---------- Numbers count up ---------- */
  var COUNT = ".trust-item strong, .pill, .empty-bed strong, .pr-summary-item strong, .ch-score-badge, .ch-big-score, .pct strong";
  function countUp(scope, onlyVisible) {
    var els = [];
    if (scope.matches && scope.matches(COUNT)) els.push(scope);
    if (scope.querySelectorAll) els = els.concat(Array.prototype.slice.call(scope.querySelectorAll(COUNT)));
    els.forEach(function (el) {
      if (el.dataset.counted || el.children.length) return;
      var m = el.textContent.match(/^(\D*?)([\d,]+(?:\.\d+)?)(.*)$/);
      if (!m) return;
      if (onlyVisible && !el.closest(".in")) return;
      el.dataset.counted = "1";
      var pre = m[1], raw = m[2], post = m[3];
      var target = parseFloat(raw.replace(/,/g, ""));
      var dec = (raw.split(".")[1] || "").length;
      var commas = raw.indexOf(",") !== -1;
      var start = performance.now(), dur = 1100;
      (function tick(now) {
        var k = Math.min(1, (now - start) / dur);
        var v = target * (1 - Math.pow(1 - k, 3));
        var s = v.toFixed(dec);
        if (commas) s = Number(s).toLocaleString("en-IN", { minimumFractionDigits: dec, maximumFractionDigits: dec });
        el.textContent = pre + s + post;
        if (k < 1) requestAnimationFrame(tick); else el.textContent = pre + raw + post;
      })(start);
    });
  }

  /* ---------- Hero: parallax + soft tilt ---------- */
  var arch = document.querySelector(".hero-visual .arch");
  var heroImg = arch && arch.querySelector("img");
  var badge = document.querySelector(".hero-visual .badge");
  if (arch && window.matchMedia("(min-width: 761px) and (pointer: fine)").matches) {
    var visual = document.querySelector(".hero-visual");
    var tx = 0, ty = 0, cx = 0, cy = 0, raf = null;
    var loop = function () {
      cx += (tx - cx) * 0.08; cy += (ty - cy) * 0.08;
      arch.style.transform = "perspective(900px) rotateY(" + (cx * 5).toFixed(2) + "deg) rotateX(" + (-cy * 5).toFixed(2) + "deg)";
      if (badge) badge.style.translate = (cx * -14).toFixed(1) + "px " + (cy * -10).toFixed(1) + "px";
      raf = (Math.abs(tx - cx) > 0.001 || Math.abs(ty - cy) > 0.001) ? requestAnimationFrame(loop) : null;
    };
    visual.addEventListener("pointermove", function (e) {
      var r = visual.getBoundingClientRect();
      tx = (e.clientX - r.left) / r.width - 0.5;
      ty = (e.clientY - r.top) / r.height - 0.5;
      if (!raf) raf = requestAnimationFrame(loop);
    });
    visual.addEventListener("pointerleave", function () { tx = 0; ty = 0; if (!raf) raf = requestAnimationFrame(loop); });
  }
  if (heroImg) {
    window.addEventListener("scroll", function () {
      var y = Math.min(window.scrollY, 700);
      heroImg.style.translate = "0 " + (y * 0.08).toFixed(1) + "px";
    }, { passive: true });
  }

  /* ---------- Timeline line draws as you scroll ---------- */
  var tl = document.querySelector(".timeline");
  if (tl) {
    var drawTl = function () {
      var r = tl.getBoundingClientRect();
      var p = Math.min(1, Math.max(0, (window.innerHeight * 0.85 - r.top) / (r.height + window.innerHeight * 0.3)));
      tl.style.setProperty("--tl", p.toFixed(3));
    };
    window.addEventListener("scroll", drawTl, { passive: true });
    drawTl();
  }

  /* ---------- Buttons: ripple on press ---------- */
  document.addEventListener("pointerdown", function (e) {
    var b = e.target.closest && e.target.closest(".btn");
    if (!b || b.disabled) return;
    var r = b.getBoundingClientRect();
    var s = document.createElement("span");
    s.className = "ripple";
    var size = Math.max(r.width, r.height) * 1.6;
    s.style.width = s.style.height = size + "px";
    s.style.left = e.clientX - r.left - size / 2 + "px";
    s.style.top = e.clientY - r.top - size / 2 + "px";
    b.appendChild(s);
    setTimeout(function () { s.remove(); }, 650);
  });
})();
