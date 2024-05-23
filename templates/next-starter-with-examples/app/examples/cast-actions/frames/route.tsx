/* eslint-disable react/jsx-key */
import { Button } from "frames.js/next";
import { frames } from "./frames";
import { appURL } from "../../../utils";

function constructCastActionUrl(params: { url: string }): string {
  // Construct the URL
  const baseUrl = "https://warpcast.com/~/add-cast-action";
  const urlParams = new URLSearchParams({
    url: params.url,
  });

  return `${baseUrl}?${urlParams.toString()}`;
}

export const GET = frames(async (ctx) => {
  const installActionUrl = constructCastActionUrl({
    url: `${appURL()}/examples/cast-actions/frames/actions/check-fid`,
  });

  const installFrameActionUrl = constructCastActionUrl({
    url: `${appURL()}/examples/cast-actions/frames/actions/check-fid-frame`,
  });

  return {
    image: <div>FID Action</div>,
    buttons: [
      <Button action="link" target={installActionUrl}>
        Install message response
      </Button>,
      <Button action="link" target={installFrameActionUrl}>
        Install frame response
      </Button>,
    ],
  };
});
