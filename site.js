/* TrustNest site-wide: student sign-in (demo, stored in this browser only).
   Any page can include <script src="site.js"></script> after its nav. */

(function () {
  const KEY = "tn_user";
  const get = () => { try { return JSON.parse(localStorage.getItem(KEY) || "null"); } catch (e) { return null; } };
  const set = u => { try { u ? localStorage.setItem(KEY, JSON.stringify(u)) : localStorage.removeItem(KEY); } catch (e) {} };

  const nav = document.querySelector(".nav");
  if (!nav) return;
  const cta = nav.querySelector(".btn");

  // Slot for the sign-in link / user chip, placed just before the main nav button
  const slot = document.createElement("div");
  slot.className = "nav-user";
  nav.insertBefore(slot, cta);

  // Dialog
  const dlg = document.createElement("dialog");
  dlg.className = "signin card";
  dlg.innerHTML = `
    <form method="dialog" class="signin-form" novalidate>
      <button type="button" class="signin-close" aria-label="Close">×</button>
      <h2>Sign in with your college email</h2>
      <p class="signin-sub">Students get a verified badge, and other students trust your reviews and reports more.</p>
      <label>Your name<input name="name" type="text" autocomplete="name" placeholder="Riya Malhotra" required></label>
      <label>College email<input name="email" type="email" autocomplete="email" placeholder="riya.m@chitkara.edu.in" required></label>
      <p class="signin-error" hidden></p>
      <button type="submit" class="btn btn-solid">Continue</button>
      <p class="signin-fine">Demo sign-in: details stay in this browser.</p>
    </form>`;
  document.body.append(dlg);

  const form = dlg.querySelector("form");
  const err = dlg.querySelector(".signin-error");
  dlg.querySelector(".signin-close").addEventListener("click", () => dlg.close());
  dlg.addEventListener("click", e => { if (e.target === dlg) dlg.close(); });

  form.addEventListener("submit", e => {
    e.preventDefault();
    const name = form.name.value.trim();
    const email = form.email.value.trim().toLowerCase();
    if (!name) return showErr("Enter your name.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return showErr("Enter a valid email address.");
    const college = /\.(edu|ac)(\.[a-z]{2})?$/.test(email.split("@")[1]);
    set({ name, email, college, since: Date.now() });
    dlg.close();
    render();
  });
  function showErr(m) { err.textContent = m; err.hidden = false; }
  form.addEventListener("input", () => (err.hidden = true));

  function render() {
    const u = get();
    slot.innerHTML = "";
    if (!u) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "nav-signin";
      b.textContent = "Sign in";
      b.addEventListener("click", () => { form.reset(); err.hidden = true; dlg.showModal(); });
      slot.append(b);
      return;
    }
    const first = u.name.split(/\s+/)[0];
    const wrap = document.createElement("div");
    wrap.className = "nav-chip";
    wrap.innerHTML = `
      <button type="button" class="nav-chip-btn" aria-expanded="false">
        <span class="nav-avatar"></span><span class="nav-name"></span>
      </button>
      <div class="nav-menu" hidden>
        <p><strong></strong><span></span></p>
        <button type="button" class="nav-signout">Sign out</button>
      </div>`;
    wrap.querySelector(".nav-avatar").textContent = first[0].toUpperCase();
    wrap.querySelector(".nav-name").textContent = first;
    wrap.querySelector(".nav-menu strong").textContent = u.name;
    wrap.querySelector(".nav-menu span").textContent = u.college ? "Verified student · " + u.email : u.email;
    if (u.college) wrap.querySelector(".nav-avatar").classList.add("verified");
    const btn = wrap.querySelector(".nav-chip-btn"), menu = wrap.querySelector(".nav-menu");
    btn.addEventListener("click", () => { menu.hidden = !menu.hidden; btn.setAttribute("aria-expanded", String(!menu.hidden)); });
    document.addEventListener("click", e => { if (!wrap.contains(e.target)) { menu.hidden = true; btn.setAttribute("aria-expanded", "false"); } });
    wrap.querySelector(".nav-signout").addEventListener("click", () => { set(null); render(); });
    slot.append(wrap);
  }

  render();
  window.TrustNestUser = get;
})();
