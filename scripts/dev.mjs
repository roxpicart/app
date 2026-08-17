import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";
import app from "../worker/index.js";

const projectRoot = resolve(import.meta.dirname, "..");
const imagesRoot = resolve(projectRoot, "images");
const databasePath = resolve(projectRoot, "db.json");
const args = process.argv.slice(2);

function argument(name, fallback) {
  const index = args.indexOf(name);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
}

const host = argument("--host", process.env.HOST || "0.0.0.0");
const port = Number(argument("--port", process.env.PORT || "5173"));

const mimeTypes = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".jfif": "image/jpeg",
  ".webp": "image/webp",
  ".avif": "image/avif",
};

async function serveLocalImage(pathname, response) {
  const requestedPath = resolve(imagesRoot, "." + decodeURIComponent(pathname.slice(7)));
  if (requestedPath !== imagesRoot && !requestedPath.startsWith(imagesRoot + sep)) return false;

  try {
    const bytes = await readFile(requestedPath);
    response.writeHead(200, {
      "content-type": mimeTypes[extname(requestedPath).toLowerCase()] || "application/octet-stream",
      "cache-control": "no-store",
    });
    response.end(bytes);
    return true;
  } catch {
    return false;
  }
}

const server = createServer(async (request, response) => {
  try {
    const origin = "http://" + (request.headers.host || "localhost:" + port);
    const url = new URL(request.url || "/", origin);

    if (url.pathname.startsWith("/images/") && await serveLocalImage(url.pathname, response)) return;
    if (url.pathname === "/db.json") {
      const database = await readFile(databasePath);
      response.writeHead(200, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
      response.end(database);
      return;
    }

    const webRequest = new Request(url, {
      method: request.method,
      headers: request.headers,
    });
    const result = await app.fetch(webRequest, {}, {});
    response.writeHead(result.status, Object.fromEntries(result.headers));
    response.end(Buffer.from(await result.arrayBuffer()));
  } catch (error) {
    console.error(error);
    response.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
    response.end("Eroare a serverului de dezvoltare");
  }
});

server.listen(port, host, () => {
  console.log("Emotional Paintings rulează la http://localhost:" + port);
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
