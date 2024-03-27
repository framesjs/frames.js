import { fetchMetadata } from 'frames.js/remix';
import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";

export async function loader({ request}: LoaderFunctionArgs) {
  return {
    metadata: await fetchMetadata(new URL('/frames', request.url)),
  }
}

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  return [
    { title: "New Remix App" },
    { name: "description", content: "Welcome to Remix!" },
    ...(data?.metadata ?? [])
  ];
};

export default function Index() {
  return (
    <div style={{ fontFamily: "system-ui, sans-serif", lineHeight: "1.8" }}>
      <h1>Welcome to Remix + Frames.js</h1>
      <ul>
        <li>
          <a
            target="_blank"
            href="https://framesjs.org"
            rel="noreferrer"
          >
            Frames.js Docs
          </a>
        </li>
        <li>
          <a target="_blank" href="https://remix.run/docs" rel="noreferrer">
            Remix Docs
          </a>
        </li>
      </ul>
    </div>
  );
}