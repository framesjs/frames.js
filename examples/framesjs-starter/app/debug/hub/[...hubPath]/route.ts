import { NextRequest } from "next/server";

function getHubRequest(request: NextRequest, hubPath: string[]) {
  const { url, headers: originalHeaders, ...rest } = request;

  const newUrl = new URL(url);
  newUrl.protocol = "https";
  newUrl.hostname = "api.neynar.com";
  newUrl.port = "2281";
  newUrl.pathname = hubPath.join("/");

  const headers = new Headers({
    api_key: "NEYNAR_FRAMES_JS",
    ...originalHeaders,
  });
  headers.delete("host");
  headers.delete("referer");

  const hubRequest = new Request(newUrl, {
    headers,
    ...rest,
  });

  return hubRequest;
}

export async function GET(
  request: NextRequest,
  { params: { hubPath } }: { params: { hubPath: string[] } }
) {
  console.warn(
    `info: Mock hub: Forwarding message ${hubPath.join("/")} to a real hub`
  );

  const hubRequest = getHubRequest(request, hubPath);
  const response = await fetch(hubRequest);
  return response;
}

export async function POST(
  request: NextRequest,
  { params: { hubPath } }: { params: { hubPath: string[] } }
) {
  console.warn(
    `info: Mock hub: Forwarding message ${hubPath.join("/")} to a real hub`
  );

  const hubRequest = getHubRequest(request, hubPath);
  const response = await fetch(hubRequest);
  return response;
}
