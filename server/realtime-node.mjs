import { createServer } from "node:http";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const PORT = Number(process.env.PORT ?? 4173);
const ROOT = path.resolve(process.cwd(), "dist");
const DB = path.resolve(process.cwd(), "server-data", "state.json");
const TAG = "tgc-live-v1";
const TYPING_TTL = 2600;
const MSG_CAP = 600;

let snap = { tag: TAG, rev: 0, savedAt: 0, users: {}, chats: [], invitations: [], typing: [] };
let snapFingerprint = "";
try {
  if (process.env.RT_WIPE === "1" && existsSync(DB)) {
    await writeFile(DB, JSON.stringify(null));
  }
  if (existsSync(DB)) {
    const raw = await readFile(DB, "utf8");
    if (raw && raw !== "null") snap = JSON.parse(raw);
  }
} catch { /* fresh */ }

const saveSoon = (() => {
  let t;
  return (snap2) => {
    clearTimeout(t);
    t = setTimeout(async () => {
      try {
        await mkdir(path.dirname(DB), { recursive: true });
        await writeFile(DB, JSON.stringify(snap2));
      } catch (e) { console.error("persist failed", e.message); }
    }, 250);
  };
})();

const readBody = (req) =>
  new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });

const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png", ".woff2": "font/woff2", ".json": "application/json" };

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", `http://${req.headers.host}`);

  if (url.pathname === "/api/reset" && req.method === "POST") {
    snap = { tag: TAG, rev: 0, savedAt: 0, users: {}, chats: [], invitations: [], typing: [] };
    snapFingerprint = "";
    saveSoon(snap);
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ ok: true, tag: TAG, rev: 0 }));
    return;
  }

  if (url.pathname === "/api/state") {
    if (req.method === "GET") {
      const fingerprint = JSON.stringify(snap.chats) + "|" + JSON.stringify(snap.typing);
      if (fingerprint === snapFingerprint) {
        res.writeHead(200, { "content-type": "application/json", "x-cache": "same" });
        res.end(JSON.stringify(snap));
      } else {
        snapFingerprint = fingerprint;
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify(snap));
      }
      return;
    }
    if (req.method === "POST") {
      try {
        const body = JSON.parse((await readBody(req)).toString("utf8") || "{}");
        if (body.tag !== TAG) throw new Error("bad tag");
        const now = Date.now();
        // prune old typing pings
        body.typing = (body.typing ?? []).filter((t) => t.at + TYPING_TTL > now - 1500);
        // cap each chat's tape
        for (const c of body.chats ?? []) {
          if (!Array.isArray(c.messages)) continue;
          if (c.messages.length > MSG_CAP) c.messages = c.messages.slice(-MSG_CAP);
        }
        // incoming blob: if the client claims a NEWER savedAt for something, server still owns rev
        const incoming = { ...body, rev: Math.max(body.rev ?? 0, snap.rev, 1), savedAt: now };
        // the client state is authoritative on write; server only ADDS chats its snapshot owns
        // that the client has never known (novel discovery from a different device)
        const known = new Set((incoming.chats ?? []).map((c) => c.id));
        for (const c of snap.chats ?? []) {
          if (!known.has(c.id)) incoming.chats.push(c);
        }
        // merge users
        const keepUsers = { ...snap.users };
        for (const [id, u] of Object.entries(incoming.users ?? {})) keepUsers[id] = u;
        incoming.users = keepUsers;
        snap = incoming;
        // tombstone GC — chats the merged blob dropped entirely, plus stale typing
        const liveIds = new Set((incoming.chats ?? []).map((c) => c.id).concat());
        saveSoon(snap);
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify(snap));
      } catch (e) {
        res.writeHead(400, { "content-type": "application/json" });
        res.end(JSON.stringify({ error: e.message }));
      }
      return;
    }
    res.writeHead(405).end();
    return;
  }

  // static file server for dist/
  let file = url.pathname === "/" ? "/index.html" : url.pathname;
  file = path.join(ROOT, path.normalize(file).replace(/^(\.\.[/\\])+/, ""));
  if (!file.startsWith(ROOT)) { res.writeHead(403).end(); return; }
  try {
    const buf = await readFile(file);
    res.writeHead(200, { "content-type": TYPES[path.extname(file)] ?? "application/octet-stream" });
    res.end(buf);
  } catch {
    try {
      const buf = await readFile(path.join(ROOT, "index.html"));
      res.writeHead(200, { "content-type": "text/html" });
      res.end(buf);
    } catch {
      res.writeHead(404).end();
    }
  }
});

server.listen(PORT, () => console.log(`tgc realtime node on :${PORT}`));
