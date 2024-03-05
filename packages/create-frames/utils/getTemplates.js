import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { readdirSync } from "node:fs";

const __dirname = dirname(fileURLToPath(import.meta.url));

export function getTemplates() {
  // make sure you build the frames.js first so templates are copied to templates directory
  return readdirSync(resolve(__dirname, "../templates"));
}
