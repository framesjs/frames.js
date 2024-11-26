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

/**
 * @param {number} port
 * @returns {Promise<{ title: string; url: string; }[]>}
 */
async function getExamplesFromDirectory(port) {
  return [
    {
      title: "Frames v2 Starter",
      url: `http://localhost:${port}`,
    },
  ];
}

const nextPort = await getOpenPort(3001);
const debuggerPort = await getOpenPort(3010);
let command = "npm";
let args = ["run", "dev:monorepo"];

// this sets hub url for debugger
process.env.DEBUGGER_HUB_HTTP_URL = `http://localhost:${debuggerPort}/hub`;
// this sets the app url for the starter so the initial server side render works properly
process.env.APP_URL = `http://localhost:${nextPort}`;

if (!process.env.FJS_MONOREPO) {
  const url = `http://localhost:${nextPort}`;

  const examples = await getExamplesFromDirectory(nextPort);

  process.env.DEBUGGER_EXAMPLES_JSON = JSON.stringify(examples);

  command = "concurrently";
  args = [
    "--kill-others",
    `"next dev -p ${nextPort}"`,
    `"frames --port ${debuggerPort} --url ${url} ${process.env.FARCASTER_DEVELOPER_FID ? `--fid '${process.env.FARCASTER_DEVELOPER_FID}'` : ""} ${process.env.FARCASTER_DEVELOPER_MNEMONIC ? `--fdm '${process.env.FARCASTER_DEVELOPER_MNEMONIC}'` : ""} "`,
  ];
}

// Spawn the child process
const child = spawn(command, args, {
  stdio: "inherit",
  shell: true,
  env: {
    ...process.env,
    PORT: nextPort,
  },
});

child.on("error", (error) => {
  console.error(`spawn error: ${error}`);
});
