import type { NextRequest } from "next/server";

export function createNotificationsUrl(req: NextRequest): string {
  return new URL(
    `/notifications/${crypto.randomUUID()}`,
    req.nextUrl.href
  ).toString();
}
