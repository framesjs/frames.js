import { Frame } from "frames.js";
import Image from "next/image";
import { useState } from "react";

export function FrameRender({
  frame,
  url,
  viewOnly = true,
  submitOption,
}: {
  frame: Frame;
  url: string | null;
  viewOnly?: boolean;
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
    <div className="mx-auto">
      <h1>{url}</h1>
      <div className="mx-auto">
        <Image
          src={frame.image}
          alt="Description of the image"
          width={382}
          height={200}
        />
      </div>
      {!viewOnly && (
        <div className="flex">
          {frame.buttons?.map(({ label, action }, index: number) => (
            <button
              className="flex-grow"
              onClick={() =>
                submitOption({ buttonIndex: index, inputText: "" })
              }
              key={index}
            >
              {index}. {label} {action ? `(${action})` : ""}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
