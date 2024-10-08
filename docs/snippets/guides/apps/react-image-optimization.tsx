import { type FrameUIComponents } from "@frames.js/render/ui";
import Image from "next/image";

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
const components: FrameUIComponents<StylingProps> = {
  Image: (props, stylingProps) => {
    if (props.status === "frame-loading") {
      return <></>;
    }

    // Here you can add your own logic to sanitize and validate the image URL
    let sanitizedSrc = props.src;

    // Don't allow data URLs that are not images
    if (props.src.startsWith("data:") && !props.src.startsWith("data:image")) {
      sanitizedSrc = "";
    }

    // Don't allow SVG data URLs
    if (props.src.startsWith("data:image/svg")) {
      sanitizedSrc = "";
    }

    return (
      <Image
        {...stylingProps}
        src={sanitizedSrc}
        onLoad={props.onImageLoadEnd}
        onError={props.onImageLoadEnd}
        alt="Frame image"
        sizes="100vw"
        height={0}
        width={0}
      />
    );
  },
};
