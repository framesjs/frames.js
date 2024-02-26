#!/usr/bin/env node

import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { createServer } from "http";
import { parse } from "url";
import next from "next";
import isPortReachable from "is-port-reachable";
import path from "node:path";
import { fileURLToPath } from "node:url";
import open from "open";

const args = yargs(hideBin(process.argv))
  .usage("Usage: $0 [args]")
  .option("farcaster-developer-mnmonic", {
    alias: "fdm",
    type: "string",
    description:
      "Needed for the debugger to create a real Farcaster signer. Get this by exporting your seed phrase from the Warpcast app. Don't share that seed phrase with anyone.",
  })
  .option("farcaster-developer-id", {
    alias: "fid",
    type: "number",
    description: `Only needed for the debugger to create a real Farcaster signer. Get this by visiting your Warpccast profile, pressing the kebab (three dots) menu and then "About" and then your fid should be there.`,
  })
  .option("port", {
    alias: "p",
    type: "number",
    description: "Port to run the debugger on. Default is 3010.",
    default: 3010,
  }).argv;

process.env.FARCASTER_DEVELOPER_MNEMONIC = args["farcaster-developer-mnmonic"];
process.env.FARCASTER_DEVELOPER_ID = args["farcaster-developer-id"];

const dev = false;
const hostname = "localhost";

/**
 * @param {Number} min
 * @param {Number} max
 * @returns Number
 */
function getRandomInt(min, max) {
  const minCeiled = Math.ceil(min);
  const maxFloored = Math.floor(max);
  return Math.floor(Math.random() * (maxFloored - minCeiled) + minCeiled);
}

/**
 * @param {Number} port
 * @returns Promise<Number>
 */
async function resolveAvailablePort(port) {
  const isReachable = await isPortReachable(port, { host: hostname });

  if (isReachable) {
    return resolveAvailablePort(getRandomInt(3000, 50000));
  }

  return port;
}

const port = await resolveAvailablePort(args.port);
const app = next({
  dev,
  hostname,
  port,
  // resolve dirname relative to current file as we can call the command from any directory in the system
  dir: path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../"),
});
const handle = app.getRequestHandler();
const url = `http://${hostname}:${port}`;
const hubUrl = `${url}/hub`;

await app.prepare();

createServer(async (req, res) => {
  try {
    // Be sure to pass `true` as the second argument to `url.parse`.
    // This tells it to parse the query portion of the URL.
    const parsedUrl = parse(req.url, true);
    const { pathname, query } = parsedUrl;

    if (pathname === "/a") {
      await app.render(req, res, "/a", query);
    } else if (pathname === "/b") {
      await app.render(req, res, "/b", query);
    } else {
      await handle(req, res, parsedUrl);
    }
  } catch (err) {
    console.error("Error occurred handling", req.url, err);
    res.statusCode = 500;
    res.end("internal server error");
  }
})
  .once("error", (err) => {
    console.error(err);
    process.exit(1);
  })
  .listen(port, async () => {
    console.log(`> Debugger ready on ${url}`);
    console.log(`> Debug HUB URL is ${hubUrl}`);

    console.log("> Opening browser...");
    await open(url);
  });
