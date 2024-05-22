"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export function DebugLink() {
  const [href, setHref] = useState("/");

  useEffect(() => {
    let debuggerUrl =
      process.env.NEXT_PUBLIC_DEBUGGER_URL ?? "http://localhost:3010/";

    if (process.env.NEXT_PUBLIC_STACKBLITZ) {
      // solves issue when on stackblitz the URL is in format *.webcontainer.io so we can't use localhost
      debuggerUrl = window.location.href.replace(/\-\-\d+\-\-/, "--3010--");
    }

    const url = new URL("/", debuggerUrl);

    url.searchParams.set("url", window.location.href);

    setHref(url.toString());
  }, []);

  return (
    <Link className="underline" href={href}>
      Debug
    </Link>
  );
}
