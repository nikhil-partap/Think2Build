/* smooth.js — buttery inertial scrolling + scroll progress line on every page.
   Desktop mouse/trackpad only; touch devices keep native scrolling.
   Text boxes, dropdowns, dialogs and scrollable panels keep their own scrolling.
   Skipped entirely for visitors who prefer reduced motion. */
(function () {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  var fine = window.matchMedia("(pointer: fine) and (min-width: 900px)").matches;
  document.documentElement.classList.toggle("tn-smooth", fine);

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
  bar.className = "tn-progress";
  bar.setAttribute("aria-hidden", "true");
  document.body.appendChild(bar);
  var onProgress = function () {
    var max = document.documentElement.scrollHeight - window.innerHeight;
    bar.style.transform = "scaleX(" + (max > 0 ? window.scrollY / max : 0).toFixed(4) + ")";
  };
  window.addEventListener("scroll", onProgress, { passive: true });
  onProgress();

})();
