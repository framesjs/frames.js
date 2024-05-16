const repository = "framesjs/frames.js";
const branchName = import.meta.env.VITE_GIT_REF;

function removeSlashPrefix(str: string): string {
  return str.replace(/^\//, "");
}

type StackblitzLinkProps = {
  browserPath: string;
  entrypointFile: string;
};

// eslint-disable-next-line import/no-default-export -- vocs expects default export
export default function StackblitzLink({
  browserPath,
  entrypointFile,
}: StackblitzLinkProps) {
  const url = new URL(
    `/github/${repository}/tree/${branchName}/templates/next-starter-with-examples`,
    "https://stackblitz.com"
  );

  url.searchParams.set("file", removeSlashPrefix(entrypointFile));
  url.searchParams.set("initialpath", browserPath);

  return (
    <a
      href={url.toString()}
      rel="noopener noreferrer"
      title="Open in StackBlitz"
      style={{ display: "block", marginBottom: "1rem" }}
      target="_blank"
    >
      <img
        src="https://developer.stackblitz.com/img/open_in_stackblitz.svg"
        alt="Open in StackBlitz"
        height={32}
        width={162}
      />
    </a>
  );
}
