import type {
  ComposerActionResponse,
  ComposerActionState,
} from "frames.js/types";
import { CastComposer, CastComposerRef } from "./cast-composer";
import { useRef, useState } from "react";
import { ComposerFormActionDialog } from "./composer-form-action-dialog";
import { useFarcasterIdentity } from "../hooks/useFarcasterIdentity";

type ComposerActionDebuggerProps = {
  url: string;
  actionMetadata: Partial<ComposerActionResponse>;
  onToggleToCastActionDebugger: () => void;
};

export function ComposerActionDebugger({
  actionMetadata,
  url,
  onToggleToCastActionDebugger,
}: ComposerActionDebuggerProps) {
  const castComposerRef = useRef<CastComposerRef>(null);
  const signer = useFarcasterIdentity();
  const [actionState, setActionState] = useState<ComposerActionState | null>(
    null
  );

  return (
    <>
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
    </>
  );
}
