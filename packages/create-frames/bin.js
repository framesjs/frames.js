#!/usr/bin/env node
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { getTemplates } from "./utils/getTemplates.js";
import { create } from "./create.js";

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
  .parse();
