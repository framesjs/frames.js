import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogContent,
} from "@/components/ui/dialog";
import type {
  ComposerActionFormResponse,
  ComposerActionState,
} from "frames.js/types";
import { useEffect, useRef } from "react";
import { z } from "zod";

const composerFormCreateCastMessageSchema = z.object({
  type: z.literal("createCast"),
  data: z.object({
    cast: z.object({
      parent: z.string().optional(),
      text: z.string(),
      embeds: z.array(z.string().min(1).url()).min(1),
    }),
  }),
});

type ComposerFormActionDialogProps = {
  composerActionForm: ComposerActionFormResponse;
  onClose: () => void;
  onSave: (arg: { composerState: ComposerActionState }) => void;
};

export function ComposerFormActionDialog({
  composerActionForm,
  onClose,
  onSave,
}: ComposerFormActionDialogProps) {
  const onSaveRef = useRef(onSave);
  onSaveRef.current = onSave;

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const result = composerFormCreateCastMessageSchema.safeParse(event.data);

      // on error is not called here because there can be different messages that don't have anything to do with composer form actions
      // instead we are just waiting for the correct message
      if (!result.success) {
        console.warn("Invalid message received", event.data);
        return;
      }

      if (result.data.data.cast.embeds.length > 2) {
        console.warn("Only first 2 embeds are shown in the cast");
      }

      onSaveRef.current({
        composerState: result.data.data.cast,
      });
    };

    window.addEventListener("message", handleMessage);

    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, []);

  return (
    <Dialog
      open
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          onClose();
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{composerActionForm.title}</DialogTitle>
        </DialogHeader>
        <div>
          <iframe
            className="h-[600px] w-full opacity-100 transition-opacity duration-300"
            src={composerActionForm.url}
            sandbox="allow-forms allow-scripts allow-same-origin"
          ></iframe>
        </div>
        <DialogFooter>
          <span className="text-gray-400 text-sm">
            {new URL(composerActionForm.url).hostname}
          </span>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
