import { base64urlDecode, base64urlEncode } from "./base64url";

describe("base64urlEncode", () => {
  it('works the same as native buffer toString("base64url")', () => {
    const data = Buffer.from("hello world");

    expect(base64urlEncode(data)).toEqual(data.toString("base64url"));
  });
});

describe("base64urlDecode", () => {
  it('decodes the same as native buffer from("base64url")', () => {
    const data = base64urlEncode(Buffer.from("hello world"));

    expect(base64urlDecode(data)).toEqual(Buffer.from("hello world"));
  });
});
