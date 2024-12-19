import { Redis } from "@upstash/redis";

export function createRedis() {
  if (!process.env.KV_REST_API_TOKEN || !process.env.KV_REST_API_URL) {
    throw new Error("Missing KV_REST_API_TOKEN or KV_REST_API_URL");
  }

  return new Redis({
    url: process.env.KV_REST_API_URL,
    token: process.env.KV_REST_API_TOKEN,
  });
}
