import { afterEach, describe, expect, it, vi } from "vitest";
import { getClientErrorMessage, requestJson } from "@/lib/client-http";

describe("client-http utilities", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns parsed JSON for successful requests", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ ok: true }),
      }),
    );

    const result = await requestJson<{ ok: boolean }>("/api/health");
    expect(result.ok).toBe(true);
  });

  it("prefers explicit API error message for failed requests", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({ error: "Bad payload" }),
      }),
    );

    await expect(requestJson("/api/register")).rejects.toThrow("Bad payload");
  });

  it("falls back to first validation field error message", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({
          details: {
            fieldErrors: {
              email: ["Invalid email address"],
            },
          },
        }),
      }),
    );

    await expect(requestJson("/api/register")).rejects.toThrow("Invalid email address");
  });

  it("returns default request failed message when payload has no details", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({}),
      }),
    );

    await expect(requestJson("/api/register")).rejects.toThrow("Request failed (500)");
  });

  it("extracts message from Error or uses fallback", () => {
    expect(getClientErrorMessage(new Error("Network down"), "Fallback")).toBe("Network down");
    expect(getClientErrorMessage("unknown", "Fallback")).toBe("Fallback");
  });
});
