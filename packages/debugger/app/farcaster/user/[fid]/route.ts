import type { NextRequest } from "next/server";
import { z } from "zod";

const validator = z.object({
  fid: z.coerce.number().int().positive(),
});

export async function GET(
  _: NextRequest,
  { params }: { params: { fid: string } }
) {
  try {
    const { fid } = validator.parse(params);

    const url = new URL("https://api.neynar.com/v2/farcaster/user/bulk");

    url.searchParams.set("fids", fid.toString());

    const response = await fetch(url, {
      headers: {
        accept: "application/json",
        "x-api-key": "NEYNAR_FRAMES_JS",
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return Response.json({ error: "User not found" }, { status: 404 });
      }

      throw new Error(`Unexpected response: ${response.status}`);
    }

    const data = await response.json();

    return Response.json(data.users[0]);
  } catch (e) {
    if (e instanceof z.ZodError) {
      return Response.json({ error: e.errors }, { status: 400 });
    }

    throw e;
  }
}
