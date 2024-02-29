import React from "react";
import { type MockHubActionContext } from "../utils/mock-hub-utils";

export function MockHubConfig({
  hubContext,
  setHubContext,
}: {
  hubContext: Partial<MockHubActionContext>;
  setHubContext: React.Dispatch<
    React.SetStateAction<Partial<MockHubActionContext>>
  >;
}) {
  console.log(hubContext);
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
    <div className={"text-gray-500"}>
      <div className="flex flex-col gap-2">
        <label className="flex items-center gap-2">
          <input
            name="enabled"
            type="checkbox"
            checked={hubContext.enabled}
            onChange={handleInputChange}
          />{" "}
          Mock Hub
        </label>
        {hubContext.enabled && (
          <>
            <label className="flex items-center gap-2">
              <input
                name="requesterFollowsCaster"
                type="checkbox"
                checked={hubContext.requesterFollowsCaster}
                onChange={handleInputChange}
              />{" "}
              Requester follows caster
            </label>
            <label className="flex items-center gap-2">
              <input
                name="casterFollowsRequester"
                type="checkbox"
                checked={hubContext.casterFollowsRequester}
                onChange={handleInputChange}
              />{" "}
              Caster follows requester
            </label>
            <label className="flex items-center gap-2">
              <input
                name="likedCast"
                type="checkbox"
                checked={hubContext.likedCast}
                onChange={handleInputChange}
              />{" "}
              Requester liked cast
            </label>
            <label className="flex items-center gap-2">
              <input
                name="recastedCast"
                type="checkbox"
                checked={hubContext.recastedCast}
                onChange={handleInputChange}
              />{" "}
              Requester recasted cast
            </label>
          </>
        )}
      </div>
    </div>
  );
}
