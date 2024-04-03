import Image from "next/image";
import type { ImgHTMLAttributes } from "react";
import React from "react";

export function FrameImageNext(
  props: ImgHTMLAttributes<HTMLImageElement> & { src: string }
): React.JSX.Element {
  return (
    <Image
      {...props}
      alt={props.alt ?? ""}
      sizes="100vw"
      height={0}
      width={0}
    />
  );
}
