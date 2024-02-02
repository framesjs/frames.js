import { frameMetadataToNextMetadata } from "@framejs/core";
import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { frameImage, framePostUrl, ogImage } from "./constants";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Sample Frame",
  description: "This is an example of a simple frame using frames.js",
  openGraph: {
    images: [
      {
        url: ogImage,
      },
    ],
  },
  other: frameMetadataToNextMetadata({
    image: frameImage,
    version: "vNext",
    buttons: [
      {
        label: "Flip",
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
