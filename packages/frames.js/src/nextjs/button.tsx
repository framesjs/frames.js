"use client";

import React, { useEffect } from "react";
import {
  FrameButtonAutomatedProps,
  FrameButtonPostProvidedProps,
  FrameButtonPostRedirectProvidedProps,
} from "../nextjs";

// TODO
async function simulateAppNavigation() {
  // needs post url
  //   const await fetch(`/`);
  //   window.location.href = ``;
}

export function FrameButtonUI(
  props: Omit<
    FrameButtonPostProvidedProps & FrameButtonAutomatedProps,
    "onClick"
  >
) {
  if (typeof window === "undefined") return null;

  return (
    <button
      type="button"
      onClick={() => simulateAppNavigation()}
      suppressHydrationWarning
    >
      {props.children}
    </button>
  );
}

export function FrameButtonRedirectUI(
  props: FrameButtonPostRedirectProvidedProps & FrameButtonAutomatedProps
) {
  if (typeof window === "undefined") return null;

  return (
    <button
      suppressHydrationWarning
      type="button"
      onClick={() => {
        location.href = props.href;
      }}
    >
      {props.children}
    </button>
  );
}
