import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join } from "node:path";
const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json" };
createServer(async (req, res) => {
  const url = (req.url || "/").split("?")[0];
  const file = url === "/" ? "index.html" : url.slice(1);
  try {
    const data = await readFile(join("dist", file));
    res.writeHead(200, { "content-type": types[extname(file)] || "application/octet-stream" });
    res.end(data);
  } catch {
    res.writeHead(404); res.end("nf");
  }
}).listen(4173, "127.0.0.1", () => console.log("up"));
