import { type FrameFlattened, getFrameFlattened } from "frames.js";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { framePostUrl } from "./constants";

const inter = Inter({ subsets: ["latin"] });

const imageUrl = "https://picsum.photos/seed/frames.js/1146/600";

/**
 * Stripes undefined values from a `FrameFlattened` object and returns a new object with only the defined values
 */
function convertFlattenedFrameToMetadata(
  frame: FrameFlattened
): Metadata["other"] {
  const metadata: Metadata["other"] = {};

  for (const [key, value] of Object.entries(frame)) {
    if (value != null) {
      metadata[key] = value;
    }
  }

  return metadata;
}

export const metadata: Metadata = {
  title: "Random Image Frame",
  description: "This is an example of a simple frame using frames.js",
  openGraph: {
    images: [
      {
        url: imageUrl,
      },
    ],
  },
  other: convertFlattenedFrameToMetadata(
    getFrameFlattened({
      image: imageUrl,
      version: "vNext",
      buttons: [
        {
          label: "Next",
          action: "post",
        },
        {
          label: "Visit frames.js",
          action: "post_redirect",
        },
      ],
      inputText: "Type something",
      postUrl: framePostUrl,
    })
  ),
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}): JSX.Element {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
