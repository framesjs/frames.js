import { execSync } from "node:child_process";
import fs from "node:fs";

/**
 * @returns boolean
 */
export function isInGitRepository() {
  try {
    execSync("git rev-parse --is-inside-work-tree", { stdio: "ignore" });
    return true;
  } catch {}

  return false;
}

/**
 * @returns boolean
 */
export function isDefaultBranchSet() {
  try {
    execSync("git config init.defaultBranch", { stdio: "ignore" });
    return true;
  } catch {}

  return false;
}

/**
 * @param {string} destDir
 * @returns boolean
 */
export function tryGitInit(destDir) {
  let didInit = false;

  try {
    // working directory is set by process.chdir in create.js
    execSync("git --version", { stdio: "ignore" });

    if (isInGitRepository()) {
      return false;
    }

    execSync("git init", { stdio: "ignore" });
    didInit = true;

    if (!isDefaultBranchSet()) {
      execSync("git checkout -b main", { stdio: "ignore" });
    }

    execSync("git add -A", { stdio: "ignore" });
    execSync('git commit -m "Initial commit from Create Frames"', {
      stdio: "ignore",
    });

    return true;
  } catch (e) {
    if (didInit) {
      try {
        fs.rmSync(path.join(destDir, ".git"), { recursive: true, force: true });
      } catch (_) {}
    }

    return false;
  }
}
