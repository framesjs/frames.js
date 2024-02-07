import { Frame } from "frames.js";
import { useState } from "react";

export type FrameRenderProps = {
  isLoggedIn: boolean;
  frame: Frame;
  url: string | null;
  submitOption: (args: { buttonIndex: number; inputText?: string }) => void;
};

export function FrameRender({
  frame,
  url,
  submitOption,
  isLoggedIn,
}: FrameRenderProps) {
  const [inputText, setInputText] = useState("");

  return (
    <div style={{ width: "382px" }}>
      <img
        src={frame.image}
        alt="Description of the image"
        width={382}
        style={{ borderRadius: "4px", border: "1px solid #ccc" }}
        height={200}
      />
      {frame.inputText && (
        <input
          style={{ width: "382px", boxSizing: "border-box", padding: "8px" }}
          type="text"
          placeholder={frame.inputText}
          onChange={(e) => setInputText(e.target.value)}
        />
      )}
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          marginTop: "4px",
          gap: "4px",
        }}
      >
        {frame.buttons?.map(({ label, action, target }, index: number) => (
          <button
            type="button"
            style={{ flex: "1 1 0px", padding: "6px", cursor: "pointer" }}
            onClick={() => {
              if (!isLoggedIn) {
                alert(
                  "Choose an fid to impersonate or Sign in (costs warps) to use the frame buttons"
                );
                return;
              }
              if (action === "link") {
                if (
                  window.confirm("You are about to be redirected to " + target!)
                ) {
                  window.location.href = target!;
                }
              } else {
                return submitOption({
                  buttonIndex: index + 1,
                  inputText:
                    frame.inputText !== undefined ? inputText : undefined,
                });
              }
            }}
            key={index}
          >
            {label}
            {action === "post_redirect" || action === "link" ? ` ↗` : ""}
          </button>
        ))}
      </div>
    </div>
  );
}
