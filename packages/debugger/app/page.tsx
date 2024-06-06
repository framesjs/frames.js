import {
  type ExampleItem,
  FrameDebuggerExamplesSection,
} from "./components/frame-debugger-examples-section";
import DebuggerPage from "./debugger-page";

export default async function Homepage({
  searchParams,
}: {
  searchParams: Record<string, string>;
}) {
  const examples = process.env.DEBUGGER_EXAMPLES_JSON
    ? (JSON.parse(process.env.DEBUGGER_EXAMPLES_JSON) as ExampleItem[])
    : null;

  return (
    <DebuggerPage
      examples={
        <FrameDebuggerExamplesSection
          examples={examples}
        ></FrameDebuggerExamplesSection>
      }
      searchParams={searchParams}
    ></DebuggerPage>
  );
}
