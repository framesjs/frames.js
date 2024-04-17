import { ExternalLinkIcon, GithubIcon } from "lucide-react";

// @see https://vitejs.dev/guide/env-and-mode
declare global {
  interface ImportMeta {
    env: {
      VITE_RENDERER_URL?: string;
      VITE_EXAMPLES_URL?: string;
    };
  }
}

type ExampleProps = {
  /**
   * Allows to override renderer URL. By default it takes value from process.env.VITE_RENDERER_URL or uses 'http://localhost:3011'
   *
   * @defaultValue 'http://localhost:3011'
   */
  rendererURL?: string;
  /**
   * Allows to override examples domain URL, by default it takes value from process.env.VITE_EXAMPLES_DOMAIN_URL or uses 'http://localhost:3000'
   *
   * @defaultValue 'http://localhost:3000'
   */
  examplesDomainURL?: string;
  path: string;
};

const GITHUB_EXAMPLES_PATH =
  "framesjs/frames.js/tree/main/templates/next-starter-with-examples";
const GITHUB_EXAMPLES_URL = "https://github.com/";

const DEFAULT_RENDERER_URL =
  import.meta.env.VITE_RENDERER_URL || "http://localhost:3011";

const DEFAULT_EXAMPLES_DOMAIN_URL =
  import.meta.env.VITE_EXAMPLES_URL || "http://localhost:3000";

// eslint-disable-next-line import/no-default-export -- this is expected
export default function Example({
  rendererURL = DEFAULT_RENDERER_URL,
  examplesDomainURL = DEFAULT_EXAMPLES_DOMAIN_URL,
  path,
}: ExampleProps): JSX.Element {
  const exampleGithubURL = new URL(
    GITHUB_EXAMPLES_PATH + path,
    GITHUB_EXAMPLES_URL
  );
  const exampleURL = new URL(path, examplesDomainURL);
  const previewRenderedURL = new URL(rendererURL);
  previewRenderedURL.searchParams.set("url", exampleURL.toString());

  return (
    <div
      className="vocs_CodeBlock"
      style={{
        backgroundColor: "var(--vocs-color_codeBlockBackground)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div style={{ padding: "var(--vocs-space_8) var(--vocs-space_24)" }}>
        <iframe
          style={{ margin: "0 auto" }}
          src={previewRenderedURL.toString()}
          title="Example preview"
          width={500}
          height={336}
          seamless
          referrerPolicy="no-referrer"
        />
      </div>
      <div
        style={{
          backgroundColor: "var(--vocs-color_codeTitleBackground)",
          borderTop: "1px solid var(--vocs-color_border)",
          color: "var(--vocs-color_text3)",
          display: "flex",
          gap: "var(--vocs-space_12)",
          justifyContent: "flex-end",
          fontSize: "var(--vocs-fontSize_14)",
          padding: "var(--vocs-space_8) var(--vocs-space_24)",
        }}
      >
        <a
          href={previewRenderedURL.toString()}
          style={{
            display: "inline-flex",
            gap: "var(--vocs-space_6)",
            alignItems: "center",
          }}
          target="_blank"
          rel="noreferrer noopener"
        >
          <ExternalLinkIcon size={14} /> Open example in new tab
        </a>
        <a
          href={exampleGithubURL.toString()}
          rel="noreferrer noopener"
          style={{
            display: "inline-flex",
            gap: "var(--vocs-space_6)",
            alignItems: "center",
          }}
        >
          <GithubIcon size={14} /> Open example on Github
        </a>
      </div>
    </div>
  );
}
