"use client";

import { fileTypeFromBuffer, type FileTypeResult } from "file-type";

const allowedImageTypes = ["image/gif", "image/jpeg", "image/png"];

export class InvalidImageError extends Error {
  constructor() {
    super(
      "Failed to load image, possibly corrupted image or invalid file type."
    );
  }
}

export class InvalidImageTypeError extends Error {
  constructor(detectedType: FileTypeResult | undefined) {
    super(
      detectedType
        ? `Invalid image, only ${allowedImageTypes.join(", ")} are allowed, ${detectedType.mime} was detected`
        : "Failed to load image, unrecognized content type."
    );
  }
}

export class InvalidImageAspectRatioError extends Error {
  constructor({ width, height }: { width: number; height: number }) {
    super(
      `Image aspect ratio does not match defined aspect ratio, detect aspect ratio is ${width / height}:1`
    );
  }
}

type ValidateFrameImageOptions = {
  src: string;
  aspectRatio: string;
};

export async function validateFrameImage({
  src,
  aspectRatio,
}: ValidateFrameImageOptions) {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      resolve(img);
      img.onload = null;
      img.onerror = null;
    };

    img.onerror = (e) => {
      reject(e);
      img.onerror = null;
      img.onload = null;
    };

    img.src = src;
  }).catch(() => {
    throw new InvalidImageError();
  });

  const url = new URL(image.src);
  let buffer: ArrayBuffer;

  if (url.protocol === "data:") {
    // this is data url, convert the value to Buffer
    const data = url.pathname.split(",")[1];
    buffer = Buffer.from(data!, "base64");
  } else {
    buffer = await (
      await fetch(
        `/image-proxy?${new URLSearchParams({ url: url.toString() })}`
      )
    ).arrayBuffer();
  }

  const fileType = await fileTypeFromBuffer(buffer);

  if (
    !fileType ||
    !["image/gif", "image/jpeg", "image/png"].includes(fileType.mime)
  ) {
    throw new InvalidImageTypeError(fileType);
  }

  const detectedAspectRatio = image.width / image.height;
  const [width, height] = aspectRatio.split(":").map(Number);

  if (!width || !height) {
    throw new Error("Invalid aspect ratio provided");
  }

  if (detectedAspectRatio !== width / height) {
    throw new InvalidImageAspectRatioError({
      width: image.width,
      height: image.height,
    });
  }
}
