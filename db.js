/*
  TNDB: the shared TrustNest database (classic script, include before your page script)

  When the site is opened through the local server (node server.js -> http://localhost:3000),
  every record is saved as a file in data/<collection>/<id>.json inside the git repo,
  so git push / git pull shares it with the whole team.

  When the page is opened by double-clicking the HTML file (file://), it falls back to
  this browser's localStorage so the site still works.

  API (all return Promises):
    TNDB.list(collection)            -> array of records (oldest first)
    TNDB.add(collection, record)     -> saved record (gets id + createdAt)
    TNDB.update(collection, id, patch)-> saved record
    TNDB.remove(collection, id)      -> true
    TNDB.mode()                      -> "server" or "local"

  Collection names: lowercase letters, numbers, - and _. Prefix with your feature,
  e.g. "verify-reports", "protect-evidence", "choose-reviews", "live-vacancies".
*/
(function () {
  const LS_PREFIX = "tndb_";
  let modePromise = null;

  function detect() {
    if (!modePromise) {
      modePromise = location.protocol.startsWith("http")
        ? fetch("/api/ping", { cache: "no-store" }).then(r => (r.ok ? "server" : "local")).catch(() => "local")
        : Promise.resolve("local");
    }
    return modePromise;
  }

  function check(name) {
    if (!/^[a-z0-9_-]{1,64}$/i.test(name)) throw new Error("TNDB: invalid name " + name);
  }

  const newId = () => Date.now().toString(36) + "-" + Math.random().toString(16).slice(2, 8);

  // ---------- localStorage fallback ----------
  const local = {
    read(c) { try { return JSON.parse(localStorage.getItem(LS_PREFIX + c) || "[]"); } catch (e) { return []; } },
    write(c, rows) {
      try { localStorage.setItem(LS_PREFIX + c, JSON.stringify(rows)); }
      catch (e) { throw new Error("Browser storage is full. Remove some photos or entries."); }
    },
    list(c) { return local.read(c).sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0)); },
    add(c, rec) {
      const rows = local.read(c);
      const r = { ...rec, id: rec.id || newId(), createdAt: rec.createdAt || Date.now() };
      rows.push(r); local.write(c, rows); return r;
    },
    update(c, id, patch) {
      const rows = local.read(c);
      const i = rows.findIndex(r => r.id === id);
      const r = { ...(i >= 0 ? rows[i] : { createdAt: Date.now() }), ...patch, id, updatedAt: Date.now() };
      if (i >= 0) rows[i] = r; else rows.push(r);
      local.write(c, rows); return r;
    },
    remove(c, id) { local.write(c, local.read(c).filter(r => r.id !== id)); return true; }
  };

  // ---------- server (files in the repo) ----------
  async function req(method, url, body) {
    const res = await fetch(url, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      cache: "no-store"
    });
    if (!res.ok) throw new Error("TNDB: " + method + " " + url + " failed (" + res.status + ")");
    return res.json();
  }

  window.TNDB = {
    mode: detect,
    async list(c) { check(c); return (await detect()) === "server" ? req("GET", "/api/" + c) : local.list(c); },
    async add(c, rec) { check(c); return (await detect()) === "server" ? req("POST", "/api/" + c, rec) : local.add(c, rec); },
    async update(c, id, patch) { check(c); check(id); return (await detect()) === "server" ? req("PUT", "/api/" + c + "/" + id, patch) : local.update(c, id, patch); },
    async remove(c, id) { check(c); check(id); if ((await detect()) === "server") await req("DELETE", "/api/" + c + "/" + id); else local.remove(c, id); return true; }
  };
})();
