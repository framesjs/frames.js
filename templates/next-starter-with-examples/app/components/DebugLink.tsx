"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type DebugLinkProps = {
  url: string;
};

export function DebugLink({ url }: DebugLinkProps) {
  const [href, setHref] = useState("/");

  useEffect(() => {
    let debuggerUrl =
      process.env.NEXT_PUBLIC_DEBUGGER_URL ?? "http://localhost:3010/";

    if (process.env.NEXT_PUBLIC_STACKBLITZ) {
      // solves issue when on stackblitz the URL is in format *.webcontainer.io so we can't use localhost
      debuggerUrl = window.location.href.replace(/\-\-\d+\-\-/, "--3010--");
    }

    const debugUrl = new URL("/", debuggerUrl);

    debugUrl.searchParams.set("url", url);

    setHref(debugUrl.toString());
  }, [url]);

  return (
    <Link className="underline" href={href}>
      Debug
    </Link>
  );
}
