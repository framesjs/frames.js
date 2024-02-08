import Image from "next/image";
import React, { ImgHTMLAttributes } from "react";

export function FrameImageNext(
  props: ImgHTMLAttributes<HTMLImageElement> & { src: string }
) {
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
