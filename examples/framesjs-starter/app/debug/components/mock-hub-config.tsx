import { FrameActionHubContext } from "frames.js";
import React, { useState } from "react";

export function MockHubConfig({
  hubContext,
  setHubContext,
}: {
  hubContext: FrameActionHubContext;
  setHubContext: React.Dispatch<React.SetStateAction<FrameActionHubContext>>;
}) {
  const isDev = process.env.NODE_ENV === "development";

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const target = e.target as HTMLInputElement; // Adjusting the type here for broad compatibility
    const value = target.type === "checkbox" ? target.checked : target.value;
    const name = target.name;

    if (target.type === "checkbox") {
      setHubContext((prev) => ({ ...prev, [name]: value }));
    }
  };

  return (
    <div className={!isDev ? "text-gray-500" : ""}>
      {!isDev && (
        <div className="text-gray-500">
          Use the debugger locally by cloning{" "}
          <a
            href="https://framesjs.org/#1-clone-the-framesjs-starter-template-with-local-debugger"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            frames.js starter
          </a>{" "}
          to use this feature.
        </div>
      )}
      <div className="flex flex-col">
        <label className="gap-2">
          <input
            name="requesterFollowsCaster"
            type="checkbox"
            disabled={!isDev}
            checked={hubContext.requesterFollowsCaster}
            onChange={handleInputChange}
          />{" "}
          Requester follows caster
        </label>
        <label>
          <input
            name="casterFollowsRequester"
            type="checkbox"
            disabled={!isDev}
            checked={hubContext.casterFollowsRequester}
            onChange={handleInputChange}
          />{" "}
          Caster follows requester
        </label>
        <label>
          <input
            name="likedCast"
            type="checkbox"
            disabled={!isDev}
            checked={hubContext.likedCast}
            onChange={handleInputChange}
          />{" "}
          Requester liked cast
        </label>
        <label>
          <input
            name="recastedCast"
            type="checkbox"
            disabled={!isDev}
            checked={hubContext.recastedCast}
            onChange={handleInputChange}
          />{" "}
          Requester recasted cast
        </label>
      </div>
    </div>
  );
}
