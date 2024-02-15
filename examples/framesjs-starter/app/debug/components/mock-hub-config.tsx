import { FrameActionHubContext } from "frames.js";
import React, { useState } from "react";

export function MockHubConfig({
  hubContext,
  setHubContext,
}: {
  hubContext: FrameActionHubContext;
  setHubContext: React.Dispatch<React.SetStateAction<FrameActionHubContext>>;
}) {
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
    <div className="flex flex-col">
      <label className="gap-2">
        <input
          name="requesterFollowsCaster"
          type="checkbox"
          checked={hubContext.requesterFollowsCaster}
          onChange={handleInputChange}
        />{" "}
        Requester follows caster
      </label>
      <label>
        <input
          name="casterFollowsRequester"
          type="checkbox"
          checked={hubContext.casterFollowsRequester}
          onChange={handleInputChange}
        />{" "}
        Caster follows requester
      </label>
      <label>
        <input
          name="likedCast"
          type="checkbox"
          checked={hubContext.likedCast}
          onChange={handleInputChange}
        />{" "}
        Requester liked cast
      </label>
      <label>
        <input
          name="recastedCast"
          type="checkbox"
          checked={hubContext.recastedCast}
          onChange={handleInputChange}
        />{" "}
        Requester recasted cast
      </label>
    </div>
  );
}
