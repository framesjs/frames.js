import { POST as POSTNextjs, PreviousFrame } from "frames.js/next/server";
import { NextRequest } from "next/server";

export function POST(req: NextRequest) {
  const redirectHandler = (prevFrame: PreviousFrame) => {
    if (prevFrame.postBody?.untrustedData.buttonIndex === 4)
      return "https://www.framesjs.org";
  };
  return POSTNextjs(req, redirectHandler);
}
