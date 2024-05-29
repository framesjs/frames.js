import "dotenv/config";
import { spawn } from "node:child_process";
import isPortReachable from "is-port-reachable";

async function getOpenPort(port) {
  const isReachable = await isPortReachable(port, { host: "localhost" });

  if (isReachable) {
    return getOpenPort(Math.floor(Math.random() * (30000 - 3001 + 1)) + 3001);
  }

  return port;
}

const vitePort = await getOpenPort(5173);
const debuggerPort = await getOpenPort(3010);

// this sets hub url for debugger
process.env.DEBUGGER_HUB_HTTP_URL = `http://localhost:${debuggerPort}/hub`;

const url = `http://localhost:${vitePort}`;

// Spawn the child process
const child = spawn(
  "concurrently",
  [
    "--kill-others",
    `"vite --port ${vitePort}"`,
    `"frames --port ${debuggerPort} --url ${url} ${process.env.FARCASTER_DEVELOPER_FID ? `--fid '${process.env.FARCASTER_DEVELOPER_FID}'` : ""} ${process.env.FARCASTER_DEVELOPER_MNEMONIC ? `--fdm '${process.env.FARCASTER_DEVELOPER_MNEMONIC}'` : ""} "`,
  ],
  { stdio: "inherit", shell: true }
);

child.on("error", (error) => {
  console.error(`spawn error: ${error}`);
});
