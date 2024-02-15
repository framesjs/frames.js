// @ts-ignore - missing type defs, same as @vercel/og
import { ImageResponse } from "workers-og";
import { Buffer } from "node:buffer";

interface Env {
  OG_SERVICE_KEY: string;
}

export default {
  /**
   * Generates an image using workers-og based on provided search parameters.
   *
   * Allows only GET requests with s and o query parameter scontaining a JSON string containing the structure of element and options.
   * Also check signature of the request.
   */
  async fetch(req: Request, env: Env, ctx: ExecutionContext) {
    if (req.method !== "GET") {
      return new Response("Method Not Allowed", { status: 405 });
    }

    const url = new URL(req.url);
    const settings = url.searchParams.get("s");
    const options = url.searchParams.get("o");
    const signature = url.searchParams.get("sig");

    if (!settings || !options || !signature) {
      return new Response("Bad Request", { status: 400 });
    }

    // check signature
    const encoder = new TextEncoder();
    const searchParams = new URLSearchParams(url.search);
    searchParams.delete("sig");
    const dataToAuthenticate = searchParams.toString();
    const receivedMac = Buffer.from(signature, "base64");
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(env.OG_SERVICE_KEY),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign", "verify"]
    );

    const verified = await crypto.subtle.verify(
      "HMAC",
      key,
      receivedMac,
      encoder.encode(dataToAuthenticate)
    );

    if (!verified) {
      return new Response("Unauthorized", { status: 403 });
    }

    try {
      const ogImageStructure = JSON.parse(url.searchParams.get("s")!);
      const ogImageOptions = JSON.parse(url.searchParams.get("o")!);

      return new ImageResponse(ogImageStructure, ogImageOptions);
    } catch (e) {
      return new Response("Bad Request", { status: 400 });
    }
  },
};
