/*
  TrustNest local server + git-synced database
  --------------------------------------------
  Run:   node server.js        (or double-click start.bat on Windows)
  Open:  http://localhost:3000

  Every record is saved as one JSON file:  data/<collection>/<id>.json
  Commit and push the data/ folder and your teammates get the same data
  after `git pull`. One file per record means two people adding records
  at the same time never create a merge conflict.

  No npm install needed: uses only Node's built-in modules (Node 16+).
*/
const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const ROOT = __dirname;
const DATA = path.join(ROOT, "data");
const PORT = Number(process.env.PORT) || 3000;
const HOST = process.argv.includes("--lan") ? "0.0.0.0" : "127.0.0.1";
const MAX_BODY = 12 * 1024 * 1024; // 12 MB (photos are stored as compressed data URLs)
const SAFE = /^[a-z0-9_-]{1,64}$/i;

const TYPES = {
  ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8", ".md": "text/markdown; charset=utf-8", ".svg": "image/svg+xml",
  ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".gif": "image/gif",
  ".ico": "image/x-icon", ".pdf": "application/pdf", ".woff2": "font/woff2"
};

function send(res, code, body, type = "application/json; charset=utf-8") {
  res.writeHead(code, { "Content-Type": type, "Cache-Control": "no-store" });
  res.end(typeof body === "string" || Buffer.isBuffer(body) ? body : JSON.stringify(body));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on("data", c => {
      size += c.length;
      if (size > MAX_BODY) { reject(new Error("Body too large")); req.destroy(); return; }
      chunks.push(c);
    });
    req.on("end", () => {
      try { resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString("utf8")) : {}); }
      catch (e) { reject(new Error("Invalid JSON")); }
    });
    req.on("error", reject);
  });
}

const colDir = c => path.join(DATA, c);
const recFile = (c, id) => path.join(DATA, c, id + ".json");

function listCollection(c) {
  const dir = colDir(c);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter(f => f.endsWith(".json"))
    .map(f => { try { return JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")); } catch (e) { return null; } })
    .filter(Boolean)
    .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
}

function writeRecord(c, rec) {
  fs.mkdirSync(colDir(c), { recursive: true });
  const tmp = recFile(c, rec.id) + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(rec, null, 2) + "\n");
  fs.renameSync(tmp, recFile(c, rec.id)); // atomic replace
}

function newId() {
  return Date.now().toString(36) + "-" + crypto.randomBytes(3).toString("hex");
}

async function api(req, res, parts) {
  // parts: ["api", collection?, id?]
  const [, collection, id] = parts;
  if (!collection) return send(res, 200, { ok: true, mode: "server" });
  if (collection === "ping") return send(res, 200, { ok: true, mode: "server" });
  if (!SAFE.test(collection) || (id && !SAFE.test(id))) return send(res, 400, { error: "Invalid collection or id" });

  try {
    if (req.method === "GET" && !id) return send(res, 200, listCollection(collection));

    if (req.method === "GET" && id) {
      const f = recFile(collection, id);
      return fs.existsSync(f) ? send(res, 200, fs.readFileSync(f, "utf8")) : send(res, 404, { error: "Not found" });
    }

    if (req.method === "POST" && !id) {
      const body = await readBody(req);
      const rec = { ...body, id: body.id && SAFE.test(body.id) ? body.id : newId(), createdAt: body.createdAt || Date.now() };
      writeRecord(collection, rec);
      return send(res, 201, rec);
    }

    if ((req.method === "PUT" || req.method === "PATCH") && id) {
      const f = recFile(collection, id);
      const prev = fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, "utf8")) : { createdAt: Date.now() };
      const body = await readBody(req);
      const rec = { ...prev, ...body, id, updatedAt: Date.now() };
      writeRecord(collection, rec);
      return send(res, 200, rec);
    }

    if (req.method === "DELETE" && id) {
      const f = recFile(collection, id);
      if (fs.existsSync(f)) fs.unlinkSync(f);
      return send(res, 200, { ok: true });
    }

    return send(res, 405, { error: "Method not allowed" });
  } catch (e) {
    return send(res, e.message === "Body too large" ? 413 : 400, { error: e.message });
  }
}

function serveStatic(req, res, urlPath) {
  let rel = decodeURIComponent(urlPath);
  if (rel.endsWith("/")) rel += "index.html";
  const file = path.normalize(path.join(ROOT, rel));
  // stay inside the project, and never serve git internals or the server itself
  if (!file.startsWith(ROOT + path.sep) || /[\\/]\.(git|claude)([\\/]|$)/.test(file)) return send(res, 403, "Forbidden", "text/plain");
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) return send(res, 404, "Not found", "text/plain");
    res.writeHead(200, { "Content-Type": TYPES[path.extname(file).toLowerCase()] || "application/octet-stream", "Cache-Control": "no-cache" });
    fs.createReadStream(file).pipe(res);
  });
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, "http://localhost");
  const parts = url.pathname.split("/").filter(Boolean);
  if (parts[0] === "api") return api(req, res, parts);
  if (req.method !== "GET" && req.method !== "HEAD") return send(res, 405, { error: "Method not allowed" });
  serveStatic(req, res, url.pathname);
});

fs.mkdirSync(DATA, { recursive: true });
server.listen(PORT, HOST, () => {
  console.log("\n  TrustNest is running");
  console.log(`  Open  http://localhost:${PORT}`);
  console.log(`  Data  ${DATA}`);
  console.log("  Commit and push the data/ folder to share records with your team.\n");
});
server.on("error", e => {
  if (e.code === "EADDRINUSE") console.error(`Port ${PORT} is busy. Run with another port:  set PORT=3001 && node server.js`);
  else console.error(e);
  process.exit(1);
});
