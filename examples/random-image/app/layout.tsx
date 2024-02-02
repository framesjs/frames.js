import { frameMetadataToNextMetadata } from "frames.js";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { framePostUrl } from "./constants";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Random Image Frame",
  description: "This is an example of a simple frame using frames.js",
  openGraph: {
    images: [
      {
        url: "https://picsum.photos/seed/frames.js/1146/600",
      },
    ],
  },
  other: frameMetadataToNextMetadata({
    image: "https://picsum.photos/seed/frames.js/1146/600",
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
