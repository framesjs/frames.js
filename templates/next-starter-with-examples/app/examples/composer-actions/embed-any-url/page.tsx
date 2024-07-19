"use client";

import type { ComposerActionState } from "frames.js/types";

// pass state from frame message
export default function EmbedAnyURLForm({
  searchParams,
}: {
  // provided by URL returned from composer action server
  searchParams: {
    uid: string;
    state: string;
  };
}) {
  const composerActionState = JSON.parse(
    searchParams.state
  ) as ComposerActionState;

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);

        window.parent.postMessage(
          {
            type: "createCast",
            data: {
              cast: {
                ...composerActionState,
                text: formData.get("cast-text")!.toString(),
                // always append to the end of the embeds array
                embeds: [
                  ...composerActionState.embeds,
                  new URL(formData.get("embed-url")!.toString()).toString(),
                ],
              },
            },
          },
          "*"
        );
      }}
    >
      <label htmlFor="dialog-cast-text-editor" className="font-semibold">
        Cast text
      </label>
      <span className="text-slate-400 text-sm">
        Optionally you can modify the cast text from composer action
      </span>
      <textarea
        defaultValue={composerActionState.text}
        className="resize-none w-full p-2 rounded border border-slate-800"
        name="cast-text"
        id="dialog-cast-text-editor"
        placeholder="Type a cast here and submit the form..."
        rows={3}
      />
      <label className="font-semibold" htmlFor="embed-url">
        Enter URL
      </label>
      <input
        className="rounded border border-slate-800 p-2"
        id="embed-url"
        name="embed-url"
        placeholder="https://framesjs.org"
        required
        type="url"
      />
      <button className="rounded bg-slate-800 text-white p-2" type="submit">
        Embed URL
      </button>
    </form>
  );
}
