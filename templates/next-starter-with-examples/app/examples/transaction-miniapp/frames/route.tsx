/* eslint-disable react/jsx-key */
import { Button } from "frames.js/next";
import { frames } from "./frames";
import { appURL } from "../../../utils";

function constructCastActionUrl(params: { url: string }): string {
  // Construct the URL
  const baseUrl = "https://warpcast.com/~/composer-action";
  const urlParams = new URLSearchParams({
    url: params.url,
  });

  return `${baseUrl}?${urlParams.toString()}`;
}

export const GET = frames(async (ctx) => {
  const transactionMiniappUrl = constructCastActionUrl({
    url: `${appURL()}/examples/transaction-miniapp/frames/actions/miniapp`,
  });

  return {
    image: <div>Transaction Miniapp Example</div>,
    buttons: [
      <Button action="link" target={transactionMiniappUrl}>
        Transaction Miniapp
      </Button>,
    ],
  };
});
