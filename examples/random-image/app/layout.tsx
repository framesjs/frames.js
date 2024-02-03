import { getFrameFlattened } from "frames.js";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { framePostUrl } from "./constants";

const inter = Inter({ subsets: ["latin"] });

const imageUrl = "https://picsum.photos/seed/frames.js/1146/600";

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
  other: getFrameFlattened({
    image: imageUrl,
    version: "vNext",
    buttons: [
      {
        label: "Next",
      },
      {
        label: "Visit frames.js",
        action: "post_redirect",
      },
    ],
    inputText: "Type something",
    postUrl: framePostUrl,
  }),
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
