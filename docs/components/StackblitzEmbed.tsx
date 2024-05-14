import { GithubIcon } from "lucide-react";

const repository = "framesjs/frames.js";
const branchName = import.meta.env.VITE_GIT_REF;

function removeMultiSlashes(str: string): string {
  return str.replace(/\/{2,}/g, "/");
}

type StackblitzEmbedProps = {
  directory: string;
  file: string;
};

// eslint-disable-next-line import/no-default-export -- this is expected
export default function StackblitzEmbed({
  directory,
  file,
}: StackblitzEmbedProps): JSX.Element {
  const fileInDirectory = removeMultiSlashes(`${directory}/${file}`);
  const src = new URL(
    removeMultiSlashes(
      `/github/${repository}/tree/${branchName}/templates/next-starter-with-examples`
    ),
    `https://stackblitz.com`
  );

  src.searchParams.set("file", fileInDirectory);
  src.searchParams.set("initialpath", directory);
  src.searchParams.set("view", "preview");
  src.searchParams.set("embed", "1");

  const githubURL = new URL(
    removeMultiSlashes(
      `/tree/${branchName}/templates/next-starter-with-examples/${fileInDirectory}`
    ),
    `https://github.com/`
  );

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--vocs-space_6)",
        width: "100%",
      }}
    >
      <iframe
        allow="cross-origin-isolated"
        src={src.toString()}
        style={{ height: 400, width: "100%" }}
        title="Stackblitz embed"
      />
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          marginRight: "var(--vocs-space_6)",
          color: "var(--vocs-color_text3)",
          fontSize: "var(--vocs-fontSize_14)",
        }}
      >
        <a
          href={githubURL.toString()}
          rel="noreferrer noopener"
          style={{
            display: "inline-flex",
            gap: "var(--vocs-space_6)",
            alignItems: "center",
          }}
          target="_blank"
        >
          <GithubIcon size={14} /> Open example on Github
        </a>
      </div>
    </div>
  );
}
