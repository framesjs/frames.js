import type { StorageInterface } from "./types";

export async function getStorage(serverUrl: string): Promise<StorageInterface> {
  const { KV_REST_API_TOKEN, KV_REST_API_URL } = process.env;

  if (KV_REST_API_TOKEN && KV_REST_API_URL) {
    const redis = await import("./storage/redis");

    return redis.getStorage(KV_REST_API_TOKEN, KV_REST_API_URL, serverUrl);
  } else {
    const sqlite = await import("./storage/sqlite");

    return sqlite.getStorage(serverUrl);
  }
}
