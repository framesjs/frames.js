import type { FramesStackItem } from "@frames.js/render";
import { JSONTree } from "react-json-tree";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from "@/components/table";
import { urlSearchParamsToObject } from "../utils/url-search-params-to-object";

type FrameDebuggerRequestDetailsProps = {
  frameStackItem: FramesStackItem;
};

export function FrameDebuggerRequestDetails({
  frameStackItem,
}: FrameDebuggerRequestDetailsProps) {
  return (
    <>
      <h2 className="my-4 text-muted-foreground font-semibold text-sm">
        Request
      </h2>
      <Table>
        <TableBody>
          <TableRow>
            <TableHead>URL</TableHead>
            <TableCell className="w-full">{frameStackItem.url}</TableCell>
          </TableRow>
          <TableRow>
            <TableHead>Method</TableHead>
            <TableCell>{frameStackItem.request.method}</TableCell>
          </TableRow>
          <TableRow>
            <TableHead>Query Params</TableHead>
            <TableCell>
              <JSONTree
                data={urlSearchParamsToObject(
                  new URL(frameStackItem.url).searchParams
                )}
                invertTheme
                theme="default"
              ></JSONTree>
            </TableCell>
          </TableRow>
          {frameStackItem.request.method === "POST" ? (
            <TableRow>
              <TableHead>Payload</TableHead>
              <TableCell>
                <JSONTree
                  data={frameStackItem.requestDetails.body}
                  invertTheme
                  theme="default"
                ></JSONTree>
              </TableCell>
            </TableRow>
          ) : null}
        </TableBody>
      </Table>
      {frameStackItem.status !== "pending" ? (
        <>
          <h2 className="my-4 text-muted-foreground font-semibold text-sm">
            Response
          </h2>
          <Table>
            <TableBody>
              <TableRow>
                <TableHead>Response status</TableHead>
                <TableCell className="w-full">
                  {frameStackItem.responseStatus}
                </TableCell>
              </TableRow>
              {frameStackItem.response && (
                <TableRow>
                  <TableHead>Response headers</TableHead>
                  <TableCell className="w-full">
                    <JSONTree
                      data={Object.fromEntries(
                        frameStackItem.response.headers.entries()
                      )}
                      theme="default"
                      invertTheme
                    ></JSONTree>
                  </TableCell>
                </TableRow>
              )}
              {"frame" in frameStackItem ? (
                <TableRow>
                  <TableHead>Frame Response</TableHead>
                  <TableCell>
                    <JSONTree
                      data={frameStackItem.frame}
                      invertTheme
                      theme="default"
                    ></JSONTree>
                  </TableCell>
                </TableRow>
              ) : (
                <TableRow>
                  <TableHead>Response</TableHead>
                  <TableCell>
                    <JSONTree
                      data={
                        frameStackItem.status === "message"
                          ? {
                              message: frameStackItem.message,
                            }
                          : frameStackItem.responseBody
                      }
                      theme="default"
                      invertTheme
                    ></JSONTree>
                  </TableCell>
                </TableRow>
              )}
              {frameStackItem.status === "requestError" &&
                !!frameStackItem.requestError && (
                  <TableRow>
                    <TableHead>Error</TableHead>
                    <TableCell>
                      <JSONTree
                        data={frameStackItem.requestError}
                        theme="default"
                        invertTheme
                      ></JSONTree>
                    </TableCell>
                  </TableRow>
                )}
            </TableBody>
          </Table>
        </>
      ) : null}
    </>
  );
}
