import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { readdirSync, readFileSync } from "node:fs";

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * @returns {string[]}
 */
export function getTemplates() {
  // make sure you build the frames.js first so templates are copied to templates directory
  return readdirSync(resolve(__dirname, "../templates"), {
    withFileTypes: true,
  })
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => dirent.name);
}

/**
 * @returns string
 */
export function getDefaultTemplate() {
  return JSON.parse(
    readFileSync(resolve(__dirname, "../templates/metadata.json"), "utf-8")
  ).default;
}
