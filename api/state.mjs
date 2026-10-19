import { createHash } from "node:crypto";

// Vercel realtime state endpoint — mirrors server/realtime-node.mjs semantics,
// backed by a GitHub repository file (Yusfkarim/tgc-state → state.json).
// Env: GH_TOKEN (repo contents read+write). Local dev without a token falls
// back to in-memory only.

const REPO = process.env.TGC_STATE_REPO || "Yusfkarim/tgc-state";
const FILE = "state.json";
const TAG = "tgc-live-v1";
const MSG_CAP = 600;
const TYPING_TTL = 2600;

const fresh = () => ({ tag: TAG, rev: 0, savedAt: 0, users: {}, chats: [], invitations: [], typing: [] });

let cache = { snap: fresh(), sha: "", etag: "", at: 0 };


const gh = (path, init = {}) =>
  fetch(`https://api.github.com/repos/${REPO}/contents/${path.replace(/^\/+/, "")}`, {
    ...init,
    headers: {
      authorization: `Bearer ${process.env.GH_TOKEN}`,
      accept: "application/vnd.github+json",
      "user-agent": "tgc-live",
      ...(init.headers ?? {}),
    },
  });

const pruned = (snap) => {
  const now = Date.now();
  snap.typing = (snap.typing ?? []).filter((t) => t.at + TYPING_TTL > now);
  for (const c of snap.chats ?? []) {
    if (Array.isArray(c.messages) && c.messages.length > MSG_CAP) c.messages = c.messages.slice(-MSG_CAP);
  }
  return snap;
};

const readRemote = async () => {
  if (!process.env.GH_TOKEN) return cache;
  const res = await gh(`/${FILE}`, {
    headers: cache.etag ? { "if-none-match": cache.etag } : {},
  });
  if (res.status === 304) return cache;
  if (res.status === 404) {
    cache = { snap: fresh(), sha: "", etag: "", at: Date.now() };
    return cache;
  }
  if (!res.ok) return cache;
  const j = await res.json();
  let snap;
  try {
    snap = JSON.parse(Buffer.from(j.content ?? "", "base64").toString("utf8"));
  } catch {
    snap = fresh();
  }
  if (snap?.tag !== TAG || typeof snap.rev !== "number") snap = fresh();
  cache = { snap: pruned({ ...fresh(), ...snap }), sha: j.sha ?? "", etag: res.headers.get("etag") ?? "", at: Date.now() };
  return cache;
};

const writeRemote = async (snap) => {
  if (!process.env.GH_TOKEN) return { ok: false, reason: "no token" };
  const put = () =>
    gh(`/${FILE}`, {
      method: "PUT",
      body: JSON.stringify({
        message: `state ${snap.rev}`,
        content: Buffer.from(JSON.stringify(snap)).toString("base64"),
        ...(cache.sha ? { sha: cache.sha } : {}),
      }),
      headers: { "content-type": "application/json" },
    });
  const res = await put();
  if (!res.ok) {
    if (res.status !== 409 && res.status !== 422) return { ok: false, reason: `put ${res.status}` };
    // another instance wrote meanwhile — refresh the sha and retry once
    cache.etag = "";
    await readRemote();
    const retry = await put();
    if (!retry.ok) return { ok: false, reason: `put ${retry.status}` };
    const j2 = await retry.json();
    cache.sha = j2.content?.sha ?? cache.sha;
    cache.etag = "";
    return { ok: true };
  }
  const j = await res.json();
  cache.sha = j.content?.sha ?? cache.sha;
  cache.etag = "";
  return { ok: true };
};

const merge = (prev, body) => {
  const now = Date.now();
  body.typing = (body.typing ?? []).filter((t) => t.at + TYPING_TTL > now - 1500);
  for (const c of body.chats ?? []) {
    if (Array.isArray(c.messages) && c.messages.length > MSG_CAP) c.messages = c.messages.slice(-MSG_CAP);
  }
  const incoming = { ...body, rev: Math.max(body.rev ?? 0, prev.rev ?? 0, 1), savedAt: now };
  const known = new Set((incoming.chats ?? []).map((c) => c.id));
  for (const c of prev.chats ?? []) if (!known.has(c.id)) incoming.chats.push(c);
  const keepUsers = { ...prev.users };
  for (const [id, u] of Object.entries(incoming.users ?? {})) keepUsers[id] = u;
  incoming.users = keepUsers;
  return incoming;
};

export default async function handler(req, res) {
  if (req.method === "POST" && new URL(req.url ?? "/", `http://${req.headers.host}`).searchParams.get("reset") === "1") {
    await readRemote().catch(() => {});
    const sha = cache.sha;
    cache = { snap: fresh(), sha, etag: "", at: 0 };
    const wrote = await writeRemote(cache.snap);
    if (!wrote.ok) cache = { snap: fresh(), sha, etag: "", at: 0 };
    res.status(200).json({ ok: wrote.ok, tag: TAG, rev: 0 });
    return;
  }

  if (req.method === "POST") {
    let body;
    try {
      body = JSON.parse(
        await new Promise((resolve, reject) => {
          const c = [];
          req.on("data", (d) => c.push(d));
          req.on("end", () => resolve(Buffer.concat(c).toString("utf8")));
          req.on("error", reject);
        })
      );
    } catch {
      res.status(400).end();
      return;
    }
    if (body?.tag !== TAG) {
      res.status(400).json({ error: "bad tag" });
      return;
    }
    const prev = await readRemote();
    const snap = merge(prev.snap, body);
    cache.snap = snap;
    cache.at = Date.now();
    // must AWAIT: Vercel freezes the lambda after the response, killing pending work
    const wrote = await writeRemote(snap);
    res.status(200).json({ ok: true, rev: snap.rev, wrote: Boolean(wrote?.ok ?? false) });
    return;
  }

  if (req.method === "GET") {
    const cur = await readRemote();
    // headers must be ASCII — digest anything that could carry RTL text
    const fp = createHash("sha1")
      .update(JSON.stringify(cur.snap.chats) + "|" + JSON.stringify(cur.snap.typing) + "|" + cur.snap.rev)
      .digest("hex")
      .slice(0, 32);
    if (req.headers["x-tgc-fp"] === fp) {
      res.setHeader("x-cache", "same");
      res.status(200).json({ tag: TAG, rev: cur.snap.rev, same: true });
      return;
    }
    res.setHeader("x-tgc-fp", fp);
    res.status(200).json(cur.snap);
    return;
  }

  res.status(405).end();
}
