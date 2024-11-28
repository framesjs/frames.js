import { Button } from "@/components/ui/button";
import type { CastActionDefinitionResponse } from "../frames/route";
import { WithTooltip } from "./with-tooltip";
import { RefreshCwIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { ActionDebuggerPropertiesTable } from "./action-debugger-properties-table";

type ActionInfoProps = {
  actionMetadataItem: CastActionDefinitionResponse;
  children: React.ReactNode;
  onRefreshUrl: () => void;
};

export function ActionInfo({
  actionMetadataItem,
  children,
  onRefreshUrl,
}: ActionInfoProps) {
  return (
    <div className="flex flex-row items-start p-4 gap-4 bg-slate-50 max-w-full w-full">
      <div className="flex flex-col gap-4 w-[300px] min-w-[300px]">
        <div className="flex flex-row gap-2">
          <WithTooltip tooltip={<p>Reload URL</p>}>
            <Button
              className="flex flex-row gap-3 items-center shadow-sm border"
              variant={"outline"}
              onClick={() => {
                onRefreshUrl();
              }}
            >
              <RefreshCwIcon size={20} />
            </Button>
          </WithTooltip>
        </div>
      </div>
      <div className="flex flex-col gap-4 w-[500px] min-w-[500px]">
        <Card>
          <CardContent className="p-2">{children}</CardContent>
        </Card>
      </div>
      <div className="flex flex-row gap-4 w-full">
        <div className="h-full min-w-0 w-full">
          <Card>
            <CardContent className="p-0 px-2">
              <ActionDebuggerPropertiesTable
                actionMetadataItem={actionMetadataItem}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
