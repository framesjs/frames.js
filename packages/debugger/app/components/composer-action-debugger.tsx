import type {
  ComposerActionResponse,
  ComposerActionState,
} from "frames.js/types";
import { CastComposer, type CastComposerRef } from "./cast-composer";
import { useRef, useState } from "react";
import { ComposerFormActionDialog } from "./composer-form-action-dialog";
import { useFarcasterIdentity } from "../hooks/useFarcasterIdentity";
import { ActionInfo } from "./action-info";
import type { CastActionDefinitionResponse } from "../frames/route";

type ComposerActionDebuggerProps = {
  url: string;
  actionMetadataItem: CastActionDefinitionResponse;
  actionMetadata: Partial<ComposerActionResponse>;
  onToggleToCastActionDebugger: () => void;
  onRefreshUrl: () => void;
};

export function ComposerActionDebugger({
  actionMetadata,
  actionMetadataItem,
  url,
  onRefreshUrl,
  onToggleToCastActionDebugger,
}: ComposerActionDebuggerProps) {
  const castComposerRef = useRef<CastComposerRef>(null);
  const signer = useFarcasterIdentity();
  const [actionState, setActionState] = useState<ComposerActionState | null>(
    null
  );

  return (
    <ActionInfo
      actionMetadataItem={actionMetadataItem}
      onRefreshUrl={onRefreshUrl}
    >
      <CastComposer
        composerAction={actionMetadata}
        onComposerActionClick={setActionState}
        ref={castComposerRef}
      />
      {!!actionState && (
        <ComposerFormActionDialog
          actionState={actionState}
          signer={signer}
          url={url}
          onClose={() => {
            setActionState(null);
          }}
          onSubmit={(newActionState) => {
            castComposerRef.current?.updateState(newActionState);
            setActionState(null);
          }}
          onToggleToCastActionDebugger={onToggleToCastActionDebugger}
        />
      )}
    </ActionInfo>
  );
}
