import { JSONTree } from "react-json-tree";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from "@/components/table";
import { urlSearchParamsToObject } from "../utils/url-search-params-to-object";
import type { DebuggerFrameStackItem } from "../hooks/useDebuggerFrameState";

type FrameDebuggerRequestDetailsProps = {
  frameStackItem: DebuggerFrameStackItem;
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
                  data={frameStackItem.extra.requestDetails.body}
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
                  {frameStackItem.extra.responseStatus}
                </TableCell>
              </TableRow>
              {frameStackItem.extra.response && (
                <TableRow>
                  <TableHead>Response headers</TableHead>
                  <TableCell className="w-full">
                    <JSONTree
                      data={Object.fromEntries(
                        frameStackItem.extra.response.headers.entries()
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
                          : frameStackItem.extra.responseBody
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
