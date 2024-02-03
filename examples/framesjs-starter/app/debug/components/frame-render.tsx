import { Frame } from "frames.js";
import { useState } from "react";

export function FrameRender({
  frame,
  url,
  submitOption,
  isLoggedIn,
}: {
  isLoggedIn: boolean;
  frame: Frame;
  url: string | null;
  submitOption: (args: { buttonIndex: number; inputText: string }) => void;
}) {
  const [inputText, setInputText] = useState("");

  return (
    <div>
      <h1>Debugging Frame on url: {url}</h1>
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
          {frame.buttons?.map(({ label, action }, index: number) => (
            <button
              style={{ flex: "1 1 0px", padding: "6px", cursor: "pointer" }}
              onClick={() => {
                if (!isLoggedIn) {
                  alert("Log in to use the frame buttons");
                  return;
                }
                return submitOption({ buttonIndex: index + 1, inputText });
              }}
              key={index}
            >
              {label}
              {action === "post_redirect" ? ` ↗` : ""}
            </button>
          ))}
        </div>
      </div>
      <hr />
      <pre id="json">{JSON.stringify(frame, null, 2)}</pre>
    </div>
  );
}
