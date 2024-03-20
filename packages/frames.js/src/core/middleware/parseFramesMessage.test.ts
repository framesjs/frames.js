import nock from "nock";
import { redirect } from "../redirect";
import { FramesContext } from "../types";
import { parseFramesMessage } from "./parseFramesMessage";

describe("parseFramesMessage middleware", () => {
  beforeEach(() => {
    // make sure we don't introduce unexpected network requests
    nock.disableNetConnect();
  });

  afterEach(() => {
    nock.enableNetConnect();
  });

  it("moves to next middleware without parsing if request is not POST request", async () => {
    const context: FramesContext = {
      request: new Request("https://example.com"),
    } as any;

    const mw = parseFramesMessage();
    const response = redirect("http://test.com");
    const next = jest.fn(() => Promise.resolve(response));

    await expect(mw(context, next)).resolves.toMatchObject(response);
    expect(next).toHaveBeenCalledWith();
  });

  it("moves to next middleware if request is POST but does not have a valid JSON body", async () => {
    const context: FramesContext = {
      request: new Request("https://example.com", {
        method: "POST",
        body: "invalid json",
      }),
    } as any;

    const mw = parseFramesMessage();
    const response = redirect("http://test.com");
    const next = jest.fn(() => Promise.resolve(response));

    await expect(mw(context, next)).resolves.toMatchObject(response);
    expect(next).toHaveBeenCalledWith();
  });

  it("moves to next middleware if request is POST with valid JSON but invalid body shape", async () => {
    const context: FramesContext = {
      request: new Request("https://example.com", {
        method: "POST",
        body: JSON.stringify({}),
      }),
    } as any;

    const mw = parseFramesMessage();
    const response = redirect("http://test.com");
    const next = jest.fn(() => Promise.resolve(response));

    await expect(mw(context, next)).resolves.toMatchObject(response);
    expect(next).toHaveBeenCalledWith();
  });
});
