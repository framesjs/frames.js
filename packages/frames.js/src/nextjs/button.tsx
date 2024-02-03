"use client";

import {
  FrameButtonAutomatedProps,
  FrameButtonPostProvidedProps,
} from "../nextjs";

// fixme
async function simulateAppNavigation() {
  // needs post url
  //   const await fetch(`/`);
  //   window.location.href = ``;
}

export function FrameButtonUI(
  props: FrameButtonPostProvidedProps & FrameButtonAutomatedProps
) {
  return (
    <button type="button" onClick={() => simulateAppNavigation()}>
      {props.children}
    </button>
  );
}
