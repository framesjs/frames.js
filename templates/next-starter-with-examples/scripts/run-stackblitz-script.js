import "dotenv/config";
import { spawn } from "node:child_process";

// first start debugger server (it opens the preview on stackblitz automatically)
const debuggerServer = spawn("yarn frames", { shell: true, stdio: "inherit" });

debuggerServer.on("error", (error) => {
  console.error("debugger spawn error", error);
});

debuggerServer.on("spawn", async () => {
  await new Promise((resolve) => setTimeout(resolve, 2000));
  // now open examples server
  const server = spawn("yarn dev:monorepo", { shell: true, stdio: "inherit" });

  server.on("error", (error) => {
    console.error("server spawn error", error);
  });
});
