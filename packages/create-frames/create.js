import { intro, log, outro, select, confirm, text } from "@clack/prompts";
import { getTemplates } from "./utils/getTemplates.js";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import ignore from "ignore";
import pc from "picocolors";
import { detect as detectPackageManager } from "detect-package-manager";
import {
  cpSync,
  readFileSync,
  readdirSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import { packageManagerRunCommand } from "./utils/packageManagerRunCommand.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 *
 * @param {import('yargs').ArgumentsCamelCase<{ t?: string, n?: string }>} params
 */
export async function create(params) {
  if (params.$0 !== "create-frames") {
    throw new Error("Invalid command");
  }

  intro("Welcome to frames.js");

  // if there is no -n argument (name, ask for the name of new project)
  let projectName =
    params.n ||
    (await text({
      message: "Enter the name of your project",
      placeholder: "my-frames-app",
      validate(input) {
        if (!input) {
          return "Project name is required";
        }

        return;
      },
    }));

  const destDir = resolve(process.cwd(), projectName);

  const template =
    params.t ||
    (await select({
      message: "Choose a template for the project",
      options: getTemplates().map((template) => ({
        name: template,
        value: template,
      })),
      defaultValue: "next",
      validate(input) {
        if (!input) {
          return "Template is required";
        }

        return;
      },
    }));

  const templateDir = resolve(__dirname, "./templates", template);
  const ignoredPatterns = readFileSync(
    resolve(templateDir, "_gitignore"),
    "utf-8"
  );
  const ignored = ignore().add(ignoredPatterns);

  cpSync(templateDir, destDir, {
    force: true,
    recursive: true,
    filter(src) {
      const path = relative(templateDir, src);

      return !path || !ignored.ignores(path);
    },
  });

  for (const file of readdirSync(destDir)) {
    if (!file.startsWith("_")) continue;

    renameSync(
      resolve(destDir, file),
      resolve(destDir, file.replace("_", "."))
    );
  }

  const pkgJsonPath = resolve(destDir, "package.json");
  const pkgJson = JSON.parse(readFileSync(pkgJsonPath, "utf-8"));
  pkgJson.name = projectName;
  writeFileSync(pkgJsonPath, JSON.stringify(pkgJson, null, 2));

  log.success(`Project successfully scaffolded in ${pc.blue(destDir)}!`);

  const pkgManager = await detectPackageManager();

  const wantsToInstallDependencies = await confirm({
    message: `Do you want to install the dependencies using ${pkgManager}?`,
    initialValue: true,
  });

  if (wantsToInstallDependencies) {
    log.message(`Installing the dependencies...`);
    const result = spawnSync(pkgManager, ["install"], {
      cwd: destDir,
      stdio: "ignore",
    });

    if (result.status !== 0) {
      log.error(
        `Failed to install the dependencies, please install them manually.`
      );
      process.exit(1);
    }

    log.success(`Dependencies installed!`);
  }

  log.message("Next steps:");
  log.step(
    `1. Go to the project directory by running: ${pc.blue(`cd ./${projectName}`)}`
  );
  log.step(
    `2. Start the development server and run the app in debugger by running: ${pc.blue(await packageManagerRunCommand("dev"))}`
  );
  log.step(
    `3. Open your browser and go to ${pc.blue(`http://localhost:3010`)} to see your app running in the debugger`
  );

  outro("Done! Your project has been set up! 🎉");
}
