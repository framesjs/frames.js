import React, { FormEvent, FormEventHandler } from "react";
import { type MockHubActionContext } from "../utils/mock-hub-utils";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";

export function MockHubConfig({
  hubContext,
  setHubContext,
}: {
  hubContext: Partial<MockHubActionContext>;
  setHubContext: React.Dispatch<
    React.SetStateAction<Partial<MockHubActionContext>>
  >;
}) {
  const handleInputChange = (name: string) => (checked: boolean) => {
    setHubContext((prev) => ({ ...prev, [name]: checked }));
  };

  return (
    <div>
      <div className="flex flex-col gap-2">
        <label className="flex items-center gap-2 pt-4">
          Mock Hub
          <Switch
            id="enabled"
            className="ml-auto"
            checked={hubContext.enabled}
            onCheckedChange={handleInputChange("enabled")}
          />
        </label>
        {hubContext.enabled && (
          <>
            <label className="flex items-center gap-2">
              <Checkbox
                checked={hubContext.requesterFollowsCaster}
                onCheckedChange={handleInputChange("requesterFollowsCaster")}
              />{" "}
              Requester follows caster
            </label>
            <label className="flex items-center gap-2">
              <Checkbox
                checked={hubContext.casterFollowsRequester}
                onCheckedChange={handleInputChange("casterFollowsRequester")}
              />{" "}
              Caster follows requester
            </label>
            <label className="flex items-center gap-2">
              <Checkbox
                checked={hubContext.likedCast}
                onCheckedChange={handleInputChange("likedCast")}
              />{" "}
              Requester liked cast
            </label>
            <label className="flex items-center gap-2">
              <Checkbox
                checked={hubContext.recastedCast}
                onCheckedChange={handleInputChange("recastedCast")}
              />{" "}
              Requester recasted cast
            </label>
          </>
        )}
      </div>
    </div>
  );
}
