type ExampleProps = {
  /**
   * Full URL to example
   */
  url: string;
};

export default function Example({ url }: ExampleProps): JSX.Element {
  const previewRenderedURL = new URL("http://localhost:3011");
  previewRenderedURL.searchParams.set('url', url);

  return <iframe src={previewRenderedURL.toString()} title="Example preview" width={500} height={336} />;
}
