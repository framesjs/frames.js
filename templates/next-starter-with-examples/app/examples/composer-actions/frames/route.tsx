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
  const installFormActionUrl = constructCastActionUrl({
    url: `${appURL()}/examples/composer-actions/frames/actions/create-game`,
  });

  return {
    image: <div>Composer Form Action</div>,
    buttons: [
      <Button action="link" target={installFormActionUrl}>
        Install form response
      </Button>,
    ],
  };
});
