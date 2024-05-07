#!/usr/bin/env node
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { dirname, resolve } from "node:path";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { getTemplates } from "./utils/getTemplates.js";
import { create } from "./create.js";

const packageJsonFilePath = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "./package.json"
);

// use only default command
yargs(hideBin(process.argv))
  .scriptName("create-frames")
  .usage("Usage: $0 [options]")
  .command(
    "$0",
    "Create a new project",
    {
      name: {
        alias: "n",
        describe: "Name of the project",
        type: "string",
      },
      template: {
        alias: "t",
        describe: "Choose a template for the project",
        choices: getTemplates(),
      },
    },
    (args) => {
      create(args);
    }
  )
  .version(JSON.parse(readFileSync(packageJsonFilePath)).version)
  .parse();
