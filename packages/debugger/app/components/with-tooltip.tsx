import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import React, { cloneElement, forwardRef } from "react";

type WithTooltipProps = {
  children: React.ReactElement;
  tooltip: React.ReactNode;
  disabled?: boolean;
};

export const WithTooltip = forwardRef(
  (
    { tooltip, children, disabled, ...rest }: WithTooltipProps,
    ref: React.Ref<any>
  ) => {
    return (
      <Tooltip open={disabled ? false : undefined}>
        <TooltipTrigger asChild>
          {cloneElement(children, { ...rest, ref })}
        </TooltipTrigger>
        <TooltipContent>{tooltip}</TooltipContent>
      </Tooltip>
    );
  }
);

WithTooltip.displayName = "WithTooltip";
