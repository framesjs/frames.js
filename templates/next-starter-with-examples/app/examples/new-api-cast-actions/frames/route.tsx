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
  const actionUrl = new URL(appURL());
  actionUrl.pathname =
    "/examples/new-api-cast-actions/frames/actions/check-fid";

  const installActionUrl = constructCastActionUrl({
    url: actionUrl.toString(),
  });

  return {
    image: <div>FID Action</div>,
    buttons: [
      <Button action="link" target={installActionUrl}>
        Install
      </Button>,
    ],
  };
});
