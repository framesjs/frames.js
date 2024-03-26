import { detect } from "detect-package-manager";

export async function packageManagerRunCommand(command) {
  const pkgManager = await detect();

  switch (pkgManager) {
    case "bun":
      return `bun run ${command}`;
    case "pnpm":
      return `pnpm ${command}`;
    case "yarn":
      return `yarn ${command}`;
    default:
      return `npm run ${command}`;
  }
}
