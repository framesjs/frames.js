import type { Metadata } from "next";
import "./globals.css";
import type { FrameV2 } from "frames.js";

export const metadata: Metadata = {
  // without a title, warpcast won't validate your frame
  title: "frames.js starter",
  description: "...",
  other: {
    "fc:frame": JSON.stringify({
      version: "next",
      imageUrl: new URL("/frame.png", process.env.APP_URL!).toString(),
      button: {
        title: "Open App",
        action: {
          type: "launch_frame",
          name: "Frames v2 Demo",
          url: process.env.APP_URL!,
          splashImageUrl: new URL(
            "/splash.png",
            process.env.APP_URL
          ).toString(),
          splashBackgroundColor: "#f7f7f7",
        },
      },
    } satisfies FrameV2),
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
