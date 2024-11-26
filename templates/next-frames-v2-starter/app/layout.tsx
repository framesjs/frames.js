import type { Metadata } from "next";
import "./globals.css";

// @todo refactor to frames.js or @frames.js/render?
type FrameEmbed = {
  imageUrl: string;
  button: {
    title: string;
    action: {
      type: "launch";
      icon: string;
      name: string;
      url: string;
      splashImageUrl: string;
      splashBackgroundColor: string;
    };
  };
};

export const metadata: Metadata = {
  // without a title, warpcast won't validate your frame
  title: "frames.js starter",
  description: "...",
  other: {
    "fc:frame": JSON.stringify({
      imageUrl: "https://example.com/image.png",
      button: {
        title: "Open App",
        action: {
          type: "launch",
          icon: new URL("/icon.png", process.env.APP_URL).toString(),
          name: "Fremes v2 Demo",
          url: process.env.APP_URL!,
          splashImageUrl: new URL(
            "/splash.png",
            process.env.APP_URL
          ).toString(),
          splashBackgroundColor: "#f7f7f7",
        },
      },
    } satisfies FrameEmbed),
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
