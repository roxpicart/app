import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import app from "../worker/index.js";

const projectRoot = resolve(import.meta.dirname, "..");
const pagesRoot = resolve(projectRoot, "docs");

await rm(pagesRoot, { recursive: true, force: true });
await mkdir(pagesRoot, { recursive: true });

const response = await app.fetch(new Request("https://pages.local/"), {}, {});
if (!response.ok) throw new Error("Nu s-a putut genera pagina principală.");

await writeFile(resolve(pagesRoot, "index.html"), await response.text(), "utf8");
await cp(resolve(projectRoot, "db.json"), resolve(pagesRoot, "db.json"));
await cp(resolve(projectRoot, "images"), resolve(pagesRoot, "images"), { recursive: true });
await writeFile(resolve(pagesRoot, ".nojekyll"), "", "utf8");

console.log("Versiunea GitHub Pages a fost generată în folderul docs.");
