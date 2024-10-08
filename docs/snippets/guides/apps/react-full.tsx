"use client";
import {
  type FarcasterSigner,
  signFrameAction,
} from "@frames.js/render/farcaster";
import { useFrame } from "@frames.js/render/use-frame";
import { fallbackFrameContext } from "@frames.js/render";
// [!code focus:64]
import {
  FrameUI,
  type FrameUIComponents,
  type FrameUITheme,
} from "@frames.js/render/ui";

/**
 * StylingProps is a type that defines the props that can be passed to the components to style them.
 */
type StylingProps = {
  className?: string;
  style?: React.CSSProperties;
};

/**
 * You can override components to change their internal logic or structure if you want.
 * By default it is not necessary to do that since the default structure is already there
 * so you can just pass an empty object and use theme to style the components.
 *
 * You can also style components here and completely ignore theme if you wish.
 */
const components: FrameUIComponents<StylingProps> = {};

/**
 * By default there are no styles so it is up to you to style the components as you wish.
 */
const theme: FrameUITheme<StylingProps> = {
  ButtonsContainer: {
    className: "flex gap-[8px] px-2 pb-2 bg-white",
  },
  Button: {
    className:
      "border text-sm text-gray-700 rounded flex-1 bg-white border-gray-300 p-2",
  },
  Root: {
    className:
      "flex flex-col w-full gap-2 border rounded-lg overflow-hidden bg-white relative",
  },
  Error: {
    className:
      "flex text-red-500 text-sm p-2 bg-white border border-red-500 rounded-md shadow-md aspect-square justify-center items-center",
  },
  LoadingScreen: {
    className: "absolute top-0 left-0 right-0 bottom-0 bg-gray-300 z-10",
  },
  Image: {
    className: "w-full object-cover max-h-full",
  },
  ImageContainer: {
    className:
      "relative w-full h-full border-b border-gray-300 overflow-hidden",
    style: {
      aspectRatio: "var(--frame-image-aspect-ratio)", // fixed loading skeleton size
    },
  },
  TextInput: {
    className: "p-[6px] border rounded border-gray-300 box-border w-full",
  },
  TextInputContainer: {
    className: "w-full px-2",
  },
};

export default function App() {
  // @TODO: replace with your farcaster signer
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
    homeframeUrl: "https://framesjs.org",
    // corresponds to the name of the route for POST and GET in step 2
    frameActionProxy: "/frames",
    frameGetProxy: "/frames",
    connectedAddress: undefined,
    frameContext: fallbackFrameContext,
    // map to your identity if you have one
    signerState: {
      hasSigner: farcasterSigner.status === "approved",
      signer: farcasterSigner,
      isLoadingSigner: false,
      async onSignerlessFramePress() {
        // Only run if `hasSigner` is set to `false`
        // This is a good place to throw an error or prompt the user to login
        console.log(
          "A frame button was pressed without a signer. Perhaps you want to prompt a login"
        );
      },
      signFrameAction,
      async logout() {
        // here you can add your logout logic
        console.log("logout");
      },
    },
  });

  // [!code focus:4]
  return (
    <FrameUI frameState={frameState} components={components} theme={theme} />
  );
}
