import { POST as POSTNext, PreviousFrame } from "frames.js/next/server";
import { NextRequest, NextResponse } from "next/server";

export function POST(req: NextRequest, res: NextResponse) {
  const redirectHandler = (prevFrame: PreviousFrame) => {
    if (prevFrame.postBody?.untrustedData.buttonIndex === 4)
      return "https://www.framesjs.org";
  };
  return POSTNext(req, res, redirectHandler);
}
