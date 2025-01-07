import { z } from "zod";

export function GET() {
  return Response.json(
    {
      fid: z.coerce
        .number()
        .int()
        .parse(process.env.FARCASTER_DEVELOPER_FID || "-1"),
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}
