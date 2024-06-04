import { generateDeclaration } from "dets";
import { writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const debuggerDirectory = dirname(
  resolve(fileURLToPath(import.meta.url), "../")
);

const content = await generateDeclaration({
  name: "@frames.js/debugger",
  root: debuggerDirectory,
  files: ["../frames.js/src/core/**/*.ts"],
  types: ["../frames.js/src/core/index.ts"],
  noModuleDeclaration: true,
});

await mkdir(resolve(debuggerDirectory, "./public/frames.js"), {
  recursive: true,
});

await writeFile(
  resolve(debuggerDirectory, "./public/frames.js/index.d.ts"),
  content.replace(/^export\s+/gm, ""), // remove export modifiers so the types are global
  "utf8"
);
