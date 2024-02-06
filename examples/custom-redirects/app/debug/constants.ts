import { HubHttpUrlOptions } from "frames.js";

export const HOST = process.env["NEXT_PUBLIC_HOST"] || "http://localhost:3000";
export const LOCAL_STORAGE_KEYS = {
  FARCASTER_USER: "farcasterUser",
};

/** WARNING: This is a mock hub for development purposes only that does not verify signatures */
export const DEBUG_HUB_OPTIONS: HubHttpUrlOptions = {
  hubHttpUrl:
    process.env.NODE_ENV === "development"
      ? "http://localhost:3000/debug/hub"
      : undefined,
};
