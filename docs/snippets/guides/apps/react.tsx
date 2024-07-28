"use client";
// [!code focus:7]
import {
  type FarcasterSigner,
  signFrameAction,
} from "@frames.js/render/farcaster";
import { useFrame } from "@frames.js/render/use-frame";
import { fallbackFrameContext } from "@frames.js/render";

export default function App() {
  // @TODO: replace with your farcaster signer
  // [!code focus:40]
  const farcasterSigner: FarcasterSigner = {
    fid: 1,
    status: "approved",
    publicKey:
      "0x00000000000000000000000000000000000000000000000000000000000000000",
    privateKey:
      "0x00000000000000000000000000000000000000000000000000000000000000000",
  };

  const frameState = useFrame({
    // replace with frame URL
    homeframeUrl:
      "https://fc-polls.vercel.app/polls/73c6efda-bae7-4d46-8f36-3bb3b8377448",
    // corresponds to the name of the route for POST and GET in step 2
    frameActionProxy: "/frames",
    frameGetProxy: "/frames",
    connectedAddress: undefined,
    frameContext: fallbackFrameContext,
    // map to your identity if you have one
    signerState: {
      hasSigner:
        farcasterSigner.status === "approved" ||
        farcasterSigner.status === "impersonating",
      signer: farcasterSigner,
      isLoadingSigner: false,
      onSignerlessFramePress: () => {
        // Only run if `hasSigner` is set to `false`
        // This is a good place to throw an error or prompt the user to login
        console.log(
          "A frame button was pressed without a signer. Perhaps you want to prompt a login"
        );
      },
      signFrameAction,
      logout() {
        // here you can add your logout logic
        console.log("logout");
      },
    },
  });

  // @TODO here will go the renderer
  return null;
}
