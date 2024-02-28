import { FrameActionHubContext } from "frames.js";
import React from "react";

export function MockHubConfig({
  hubContext,
  setHubContext,
}: {
  hubContext: Partial<FrameActionHubContext>;
  setHubContext: React.Dispatch<
    React.SetStateAction<Partial<FrameActionHubContext>>
  >;
}) {
  // TODO: find a better way of determining if mock hub should be enabled (depends on fs)
  const isEnabled = true;

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
    <div className={!isEnabled ? "text-gray-500" : ""}>
      {!isEnabled && (
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
            disabled={!isEnabled}
            checked={hubContext.requesterFollowsCaster}
            onChange={handleInputChange}
          />{" "}
          Requester follows caster
        </label>
        <label>
          <input
            name="casterFollowsRequester"
            type="checkbox"
            disabled={!isEnabled}
            checked={hubContext.casterFollowsRequester}
            onChange={handleInputChange}
          />{" "}
          Caster follows requester
        </label>
        <label>
          <input
            name="likedCast"
            type="checkbox"
            disabled={!isEnabled}
            checked={hubContext.likedCast}
            onChange={handleInputChange}
          />{" "}
          Requester liked cast
        </label>
        <label>
          <input
            name="recastedCast"
            type="checkbox"
            disabled={!isEnabled}
            checked={hubContext.recastedCast}
            onChange={handleInputChange}
          />{" "}
          Requester recasted cast
        </label>
      </div>
    </div>
  );
}
