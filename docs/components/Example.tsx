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

const DEFAULT_RENDERER_URL = process.env.VITE_RENDERER_URL || "http://localhost:3011";

const DEFAULT_EXAMPLES_DOMAIN_URL =
  process.env.VITE_EXAMPLES_URL || "http://localhost:3000";

export default function Example({
  rendererURL = DEFAULT_RENDERER_URL,
  examplesDomainURL = DEFAULT_EXAMPLES_DOMAIN_URL,
  path,
}: ExampleProps): JSX.Element {
  const previewRenderedURL = new URL(rendererURL);
  previewRenderedURL.searchParams.set(
    "url",
    new URL(path, examplesDomainURL).toString()
  );

  return (
    <iframe
      src={previewRenderedURL.toString()}
      title="Example preview"
      width={500}
      height={336}
    />
  );
}
