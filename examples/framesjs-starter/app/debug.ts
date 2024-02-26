const DEFAULT_DEBUGGER_URL = "http://localhost:3010/";

export const DEFAULT_DEBUGGER_HUB_URL = new URL(
  "/hub",
  DEFAULT_DEBUGGER_URL
).toString();

export function createDebugUrl(frameURL: string | URL): string {
  const url = new URL("/", DEFAULT_DEBUGGER_URL);

  url.searchParams.set("url", frameURL.toString());

  return url.toString();
}
