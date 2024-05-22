import fs from "node:fs";
import { spawnSync, spawn } from "node:child_process";

console.log("Pinning next.js version to 14.1.4");
const packageJsonPath = "package.json";
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));

packageJson.dependencies.next = "14.1.4";
packageJson.devDependencies["@next/swc-wasm-nodejs"] = "14.1.4";

fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));

console.log("Installing dependencies");
spawnSync("yarn", ["install"], {
  shell: true,
  stdio: "inherit",
});

console.log("Running debugger and examples server");

import("dotenv/config").then(() => {
  // first start debugger server (it opens the preview on stackblitz automatically)
  const debuggerServer = spawn("yarn frames", {
    shell: true,
    stdio: "inherit",
  });

  debuggerServer.on("error", (error) => {
    console.error("debugger spawn error", error);
  });

  debuggerServer.on("spawn", async () => {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    // now open examples server
    const server = spawn("yarn dev:monorepo", {
      shell: true,
      stdio: "inherit",
    });

    server.on("error", (error) => {
      console.error("server spawn error", error);
    });
  });
});
