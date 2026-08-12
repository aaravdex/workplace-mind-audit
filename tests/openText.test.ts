import { describe, expect, it } from "vitest";
import { redactOpenText } from "@/lib/openText";

describe("redaction", () => {
  it("strips emails, phones, URLs, and @handles", () => {
    const r = redactOpenText("reach me at jo@acme.com, 020 7946 0000, https://x.io @jbloggs");
    expect(r).not.toMatch(/jo@acme\.com/);
    expect(r).not.toMatch(/7946/);
    expect(r).not.toMatch(/x\.io/);
    expect(r).not.toMatch(/@jbloggs/);
    expect(r).toMatch(/\[redacted\]/);
  });
});
