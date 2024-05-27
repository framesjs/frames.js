// @todo add link back to debugger
// @todo add a way to debuger frame rendered in debugger in the playground (possibly an URL parameter?)
// show frame as it would be rendered in the app, use FrameUI as preview and use real satori if the image is jsx/object
// @todo if no frame is provided to url, use default simple frame definition
// @todo frame definition from debugger should be converted to frame definition, but we won't get a JSX from image, since that would be already turned into an image
// @todo maybe provide some sort of debug header that would allow frames.js to return also image definition if jsx has been used?
"use client";

import { Editor, OnChange, OnMount } from "@monaco-editor/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { Frame } from "frames.js";
import { useDebouncedCallback } from "use-debounce";
import { FramePreview } from "./preview";
import { compileCode } from "./compile-code";
import { convertFrameDefinitionToFrame } from "./convert-frame-definition-to-frame";

const defaultFrameDefinition = `
const frame: FrameDefinition<any> = {
  accepts: [{ id: 'farcaster', version: 'vNext' }, { id: 'xmtp', version: '02-09-2024' }],
  image: <span>Test</span>,  // image: 'https://framesjs.org/og.png',
  buttons: [
    <Button action="post" target="/">
      Button
    </Button>,
  ],
  textInput: "Type something",
};
`.trim();

type FramePlaygroundProps = {
  searchParams: {
    frame?: string;
  };
};

export default function FramePlayground({
  searchParams,
}: FramePlaygroundProps) {
  const frameObjectCode = useMemo((): string => {
    if (searchParams.frame) {
      try {
        // @todo the frame passed in URL is JSON object, just validate that it is a valid JSON
        // and then return the string version as is
        const parsedFrame = JSON.parse(searchParams.frame);

        // validate frame using zod

        // @TODO validate parsedFrame is valid frame, then parse it and create a frame definition from it and then print the frame definition
        // return searchParams.frame;
      } catch (e) {
        console.error(e);
      }
    }

    return defaultFrameDefinition;
  }, [searchParams]);

  const [value, setValue] = useState(() => frameObjectCode);
  const [resolvedFrame, setResolvedFrame] = useState<Partial<Frame> | null>(
    null
  );
  const debouncedCompilation = useDebouncedCallback(async (code: string) => {
    try {
      const compiledCode = await compileCode(code);
      const frameDefinition = eval(compiledCode);

      if (!frameDefinition || typeof frameDefinition !== "object") {
        throw new Error("Frame definition is not an object");
      }

      const resolvedFrame =
        await convertFrameDefinitionToFrame(frameDefinition);

      setResolvedFrame(resolvedFrame);
    } catch (e) {
      // @todo show errors in editor
      console.error(e);
    }
  }, 1000);

  const onChange: OnChange = useCallback((newValue) => {
    setValue(newValue ?? "");
  }, []);

  useEffect(() => {
    if (!value) {
      return;
    }

    debouncedCompilation(value);
  }, [value, debouncedCompilation]);

  return (
    <div className="flex justify-center items-start pt-10 h-screen">
      <div className="w-1/2 h-full">
        <Editor
          height="100%"
          defaultLanguage="typescript"
          onChange={onChange}
          onMount={setUpTypescript}
          value={value}
          path="index.tsx"
          options={{
            minimap: { enabled: false },
          }}
        />
      </div>
      <div className="w-1/2 h-full">
        {resolvedFrame && <FramePreview frame={resolvedFrame} />}
      </div>
    </div>
  );
}

// This function is used to active the JSX syntax highlighting
const setUpTypescript: OnMount = async (monacoEditor, monaco) => {
  const [reactDefinitions, framesJsBasicDefinitions] = await Promise.all([
    fetch("/react/index.d.ts").then((res) => res.text()),
    fetch("/frames.js/index.d.ts").then((res) => res.text()),
  ]);

  monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
    jsx: monaco.languages.typescript.JsxEmit.React,
  });

  monaco.languages.typescript.typescriptDefaults.addExtraLib(
    reactDefinitions,
    `file:///node_modules/@react/types/index.d.ts`
  );

  monaco.languages.typescript.typescriptDefaults.addExtraLib(
    framesJsBasicDefinitions,
    `file:///node_modules/frames.js/types/index.d.ts`
  );
};
