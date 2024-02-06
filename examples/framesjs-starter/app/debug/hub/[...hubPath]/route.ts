import { NextRequest } from "next/server";

function getHubUrl(url: string, hubPath: string[]) {
  const newUrl = new URL(url);
  newUrl.protocol = "https";
  newUrl.hostname = "nemes.farcaster.xyz";
  newUrl.port = "2281";
  newUrl.pathname = hubPath.join("/");
  return newUrl;
}

export async function GET(
  request: NextRequest,
  { params: { hubPath } }: { params: { hubPath: string[] } }
) {
  console.warn(
    `info: Mock hub: Forwarding message ${hubPath.join("/")} to a real hub`
  );

  const url = getHubUrl(request.url, hubPath);
  const response = await fetch(url, {
    headers: request.headers,
  });

  return response;
}

export async function POST(
  request: NextRequest,
  { params: { hubPath } }: { params: { hubPath: string[] } }
) {
  const url = getHubUrl(request.url, hubPath);
  const response = await fetch(url, {
    method: "POST",
    headers: request.headers,
    body: request.body,
  });
  return response;
}
