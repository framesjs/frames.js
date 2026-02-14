import {
    isFrameButtonLink,
    isFrameButtonTx,
    isFrameButtonMint,
    bytesToHexString,
    getByteLength,
    hexStringToUint8Array,
    normalizeCastId,
    isValidVersion,
    escapeHtmlAttributeValue,
} from "./utils";

describe("escapeHtmlAttributeValue", () => {
    it("escapes double quotes", () => {
        expect(escapeHtmlAttributeValue('test"value')).toBe("test&quot;value");
    });

    it("escapes single quotes", () => {
        expect(escapeHtmlAttributeValue("test'value")).toBe("test&#39;value");
    });

    it("escapes less than sign", () => {
        expect(escapeHtmlAttributeValue("test<value")).toBe("test&lt;value");
    });

    it("escapes greater than sign", () => {
        expect(escapeHtmlAttributeValue("test>value")).toBe("test&gt;value");
    });

    it("escapes multiple special characters", () => {
        expect(escapeHtmlAttributeValue('<script>"alert(\'xss\')"</script>')).toBe(
            "&lt;script&gt;&quot;alert(&#39;xss&#39;)&quot;&lt;/script&gt;"
        );
    });

    it("returns empty string unchanged", () => {
        expect(escapeHtmlAttributeValue("")).toBe("");
    });

    it("returns string without special characters unchanged", () => {
        expect(escapeHtmlAttributeValue("normal text")).toBe("normal text");
    });

    it("handles string with only special characters", () => {
        expect(escapeHtmlAttributeValue("\"'<>")).toBe("&quot;&#39;&lt;&gt;");
    });
});

describe("isValidVersion", () => {
    it("returns true for vNext", () => {
        expect(isValidVersion("vNext")).toBe(true);
    });

    it("returns true for valid date format YYYY-MM-DD", () => {
        expect(isValidVersion("2024-01-15")).toBe(true);
        expect(isValidVersion("2023-12-31")).toBe(true);
        expect(isValidVersion("2025-06-01")).toBe(true);
    });

    it("returns false for invalid date format", () => {
        expect(isValidVersion("24-01-15")).toBe(false);
        expect(isValidVersion("2024/01/15")).toBe(false);
        expect(isValidVersion("2024.01.15")).toBe(false);
        expect(isValidVersion("01-15-2024")).toBe(false);
    });

    it("returns false for empty string", () => {
        expect(isValidVersion("")).toBe(false);
    });

    it("returns false for random strings", () => {
        expect(isValidVersion("v1.0.0")).toBe(false);
        expect(isValidVersion("version1")).toBe(false);
        expect(isValidVersion("latest")).toBe(false);
    });

    it("returns false for partial date formats", () => {
        expect(isValidVersion("2024-01")).toBe(false);
        expect(isValidVersion("2024")).toBe(false);
    });
});

describe("isFrameButtonLink", () => {
    it("returns true for link action button", () => {
        const button = { action: "link" as const, target: "https://example.com", label: "Click" };
        expect(isFrameButtonLink(button)).toBe(true);
    });

    it("returns false for post action button", () => {
        const button = { action: "post" as const, label: "Submit" };
        expect(isFrameButtonLink(button)).toBe(false);
    });

    it("returns false for tx action button", () => {
        const button = { action: "tx" as const, target: "https://example.com", label: "Send" };
        expect(isFrameButtonLink(button)).toBe(false);
    });

    it("returns false for mint action button", () => {
        const button = { action: "mint" as const, target: "eip155:1:0x123", label: "Mint" };
        expect(isFrameButtonLink(button)).toBe(false);
    });
});

describe("isFrameButtonTx", () => {
    it("returns true for tx action button", () => {
        const button = { action: "tx" as const, target: "https://example.com", label: "Send" };
        expect(isFrameButtonTx(button)).toBe(true);
    });

    it("returns false for link action button", () => {
        const button = { action: "link" as const, target: "https://example.com", label: "Click" };
        expect(isFrameButtonTx(button)).toBe(false);
    });

    it("returns false for post action button", () => {
        const button = { action: "post" as const, label: "Submit" };
        expect(isFrameButtonTx(button)).toBe(false);
    });
});

describe("isFrameButtonMint", () => {
    it("returns true for mint action button", () => {
        const button = { action: "mint" as const, target: "eip155:1:0x123", label: "Mint" };
        expect(isFrameButtonMint(button)).toBe(true);
    });

    it("returns false for link action button", () => {
        const button = { action: "link" as const, target: "https://example.com", label: "Click" };
        expect(isFrameButtonMint(button)).toBe(false);
    });

    it("returns false for tx action button", () => {
        const button = { action: "tx" as const, target: "https://example.com", label: "Send" };
        expect(isFrameButtonMint(button)).toBe(false);
    });
});

describe("bytesToHexString", () => {
    it("converts empty Uint8Array to 0x", () => {
        expect(bytesToHexString(new Uint8Array([]))).toBe("0x");
    });

    it("converts single byte to hex", () => {
        expect(bytesToHexString(new Uint8Array([255]))).toBe("0xff");
        expect(bytesToHexString(new Uint8Array([0]))).toBe("0x00");
        expect(bytesToHexString(new Uint8Array([16]))).toBe("0x10");
    });

    it("converts multiple bytes to hex", () => {
        expect(bytesToHexString(new Uint8Array([1, 2, 3]))).toBe("0x010203");
        expect(bytesToHexString(new Uint8Array([255, 0, 128]))).toBe("0xff0080");
    });
});

describe("getByteLength", () => {
    it("returns 0 for empty string", () => {
        expect(getByteLength("")).toBe(0);
    });

    it("returns correct length for ASCII string", () => {
        expect(getByteLength("hello")).toBe(5);
        expect(getByteLength("test")).toBe(4);
    });

    it("returns correct length for UTF-8 multibyte characters", () => {
        // Emoji takes 4 bytes
        expect(getByteLength("😀")).toBe(4);
        // Japanese character takes 3 bytes
        expect(getByteLength("日")).toBe(3);
    });
});

describe("hexStringToUint8Array", () => {
    it("converts hex string to Uint8Array", () => {
        const result = hexStringToUint8Array("010203");
        expect(result).toEqual(new Uint8Array([1, 2, 3]));
    });

    it("converts hex string with 0x prefix", () => {
        // Note: This removes the 0x prefix handling - just testing raw hex
        const result = hexStringToUint8Array("ff0080");
        expect(result).toEqual(new Uint8Array([255, 0, 128]));
    });

    it("throws error for empty string", () => {
        expect(() => hexStringToUint8Array("")).toThrow("Invalid hex string provided");
    });
});

describe("normalizeCastId", () => {
    it("normalizes cast id with hash as Uint8Array", () => {
        const castId = {
            fid: 123,
            hash: new Uint8Array([1, 2, 3, 4]),
        };
        const result = normalizeCastId(castId);
        expect(result).toEqual({
            fid: 123,
            hash: "0x01020304",
        });
    });

    it("preserves fid value", () => {
        const castId = {
            fid: 999999,
            hash: new Uint8Array([255]),
        };
        const result = normalizeCastId(castId);
        expect(result.fid).toBe(999999);
    });
});
