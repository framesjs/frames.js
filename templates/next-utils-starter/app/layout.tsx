import { fetchMetadata } from "frames.js/next";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { framePostUrl, ogImage } from "./constants";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Random Image Frame",
  description: "This is an example of a simple frame using frames.js",
  openGraph: {
    images: [
      {
        url: ogImage,
      },
    ],
  },
  other: {
    ...(await fetchMetadata(new URL("/frames", framePostUrl))),
  },
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
