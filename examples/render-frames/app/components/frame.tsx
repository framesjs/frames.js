import { Frame } from "frames.js";
import Image from "next/image";
import { useState } from "react";

export function FrameRender({
  frame,
  url,
  submitOption,
}: {
  frame: Frame;
  url: string | null;
  submitOption: ({
    buttonIndex,
    inputText,
  }: {
    buttonIndex: number;
    inputText: string;
  }) => void;
}) {
  const [inputText, setInputText] = useState("");

  return (
    <div>
      <h1>{url}</h1>
      <div>
        <Image
          src={frame.image}
          alt="Description of the image"
          width={382}
          height={200}
        />
      </div>
      <div>
        {frame.inputText && (
          <input
            type="text"
            placeholder={frame.inputText}
            onChange={(e) => setInputText(e.target.value)}
          />
        )}
        <div>
          {frame.buttons?.map(({ label, action }, index: number) => (
            <button
              onClick={() =>
                submitOption({ buttonIndex: index, inputText: "" })
              }
              key={index}
            >
              {label}
              {action === "post_redirect" ? ` ↗` : ""}
            </button>
          ))}
        </div>
      </div>
      <pre id="json">{JSON.stringify(frame, null, 2)}</pre>
    </div>
  );
}
