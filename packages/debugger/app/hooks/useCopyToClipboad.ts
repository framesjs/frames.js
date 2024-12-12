import { useEffect, useState } from "react";

/**
 * Hook that returns copy state as idle | copied | failed and copy function
 */
export function useCopyToClipboard() {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">(
    "idle"
  );

  useEffect(() => {
    if (copyState === "copied" || copyState === "failed") {
      const timeout = setTimeout(() => {
        setCopyState("idle");
      }, 1000);

      return () => {
        clearTimeout(timeout);
      };
    }
  }, [copyState]);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopyState("copied");
    } catch (error) {
      console.error("Failed to copy to clipboard", error);
      setCopyState("failed");
    }
  };

  return {
    copyState,
    copyToClipboard,
  };
}
