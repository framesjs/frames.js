import { NextRequest } from "next/server";

function getHubUrl(url: string, hubPath: string[]) {
  const newUrl = new URL(url);
  newUrl.protocol = "https";
  newUrl.hostname = "nemes.farcaster.xyz";
  newUrl.port = "2281";
  newUrl.pathname = hubPath.join("/");
  return newUrl;
}

const host =
  process.env.NEXT_PUBLIC_HOST?.replace("http://", "") ?? "localhost:3000";

export async function GET(
  request: NextRequest,
  { params: { hubPath } }: { params: { hubPath: string[] } }
) {
  console.warn(
    `info: Mock hub: Forwarding message ${hubPath.join("/")} to a real hub`
  );

  const url = getHubUrl(request.url, hubPath);

  const requestHeaders = new Headers(request.headers);
  // Remove in order to fix this: https://github.com/node-fetch/node-fetch/discussions/1678
  requestHeaders.delete("host");
  requestHeaders.delete("referer");
  const response = await fetch(url, {
    headers: requestHeaders,
  });

  return response;
}

export async function POST(
  request: NextRequest,
  { params: { hubPath } }: { params: { hubPath: string[] } }
) {
  const url = getHubUrl(request.url, hubPath);
  const requestHeaders = new Headers(request.headers);

  // Remove in order to fix this: https://github.com/node-fetch/node-fetch/discussions/1678
  requestHeaders.delete("host");
  requestHeaders.delete("referer");

  const response = await fetch(url, {
    method: "POST",
    headers: requestHeaders,
    body: request.body,
  });
  return response;
}
