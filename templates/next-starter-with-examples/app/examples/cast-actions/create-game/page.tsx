"use client";

import { ComposerActionState } from "frames.js/types";

// pass state from frame message
export default function CreateGameForm({
  searchParams,
}: {
  searchParams: {
    uid: string;
    state: string;
  };
}) {
  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);

        // normally you would send the request to server, do something there, etc
        // this is only for demonstration purposes

        const newFrameUrl = new URL(
          "/examples/cast-actions/frames/game",
          window.location.href
        );

        newFrameUrl.searchParams.set(
          "number",
          formData.get("number")!.toString()
        );

        const composerActionState = JSON.parse(
          searchParams.state
        ) as unknown as ComposerActionState;

        window.parent.postMessage(
          {
            type: "createCast",
            data: {
              cast: {
                ...composerActionState,
                // always append to the end of the embeds array
                embeds: [...composerActionState.embeds, newFrameUrl.toString()],
              },
            },
          },
          "*"
        );
      }}
    >
      <label className="font-semibold" htmlFor="game-number">
        Enter a random number
      </label>
      <input
        className="rounded border border-slate-800 p-2"
        id="game-number"
        name="number"
        placeholder="0-9"
        min={0}
        max={9}
        required
        type="number"
      />
      <button className="rounded bg-slate-800 text-white p-2" type="submit">
        Create Game
      </button>
    </form>
  );
}
