import { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Frame Debugger",
  description: "Help identify and fix issues with your frames",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
