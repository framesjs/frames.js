import {
  type FarcasterSigner,
  signFrameAction,
} from "@frames.js/render/farcaster";
import { useFrame } from "@frames.js/render/use-frame";
import { fallbackFrameContext } from "@frames.js/render";
import {
  FrameUI,
  type FrameUIComponents,
  type FrameUITheme,
} from "@frames.js/render/ui";
import type { ImageStyle, TextStyle, ViewStyle } from "react-native";
import { View } from "react-native";
/**
 * NativeWind uses their own implementation of createElement() to style native components by className prop.
 *
 * This is already a dependency of nativewind
 */
// [!code focus:10]
import { createInteropElement } from "react-native-css-interop";

/**
 * StylingProps is a type that defines the props that can be passed to the components to style them.
 */
type StylingProps = {
  className?: string; // [!code ++]
  style?: ImageStyle | TextStyle | ViewStyle;
};

/**
 * You can override components to change their internal logic or structure if you want.
 * By default it is not necessary to do that since the default structure is already there
 * so you can just pass an empty object and use theme to style the components.
 *
 * You can also style components here and completely ignore theme if you wish.
 */
const components: FrameUIComponents<StylingProps> = {
  ImageContainer(props, stylingProps) {
    return (
      <View
        style={{
          // helps loading screen to stretch and also provides a minimal space when frame is loading
          aspectRatio: props.aspectRatio,
        }}
      >
        {props.image}
        {props.messageTooltip}
      </View>
    );
  },
};

/**
 * By default there are no styles so it is up to you to style the components as you wish.
 */
// [!code focus:23]
const theme: FrameUITheme<StylingProps> = {
  Root: {
    className: "relative", // [!code ++]
    // [!code --:4]
    style: {
      position: "relative",
    } satisfies ViewStyle,
  },
  LoadingScreen: {
    className: "absolute top-0 left-0 right-0 bottom-0 bg-gray-300 z-10", // [!code ++]
    // [!code --:10]
    style: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "gray",
      zIndex: 10,
    } satisfies ViewStyle,
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

  // [!code focus:8]
  return (
    <FrameUI
      frameState={frameState}
      components={components}
      theme={theme}
      // [!code ++:3]
      createElement={
        createInteropElement as unknown as typeof React.createElement
      }
    />
  );
}
