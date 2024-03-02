import { NextRequest } from "next/server";

export function GET(req: NextRequest) {
  // Redirect to /
  const { url } = req;
  const newUrl = new URL(url);
  newUrl.pathname = "/";
  return Response.redirect(newUrl, 301);
}
