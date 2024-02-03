import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Frame Debugger",
  description: "Help identify and fix issues with your frames",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}): JSX.Element {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
