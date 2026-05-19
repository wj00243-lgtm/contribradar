import { describe, expect, it } from "vitest";
import { billingAppUrl } from "./billing-url";

describe("billingAppUrl", () => {
  it("uses the first non-empty URL candidate", () => {
    expect(billingAppUrl("", undefined, "https://contribradar.vercel.app")).toBe("https://contribradar.vercel.app");
  });

  it("removes trailing slashes from URL origins", () => {
    expect(billingAppUrl("https://contribradar.vercel.app///")).toBe("https://contribradar.vercel.app");
  });

  it("trims whitespace from configured origins", () => {
    expect(billingAppUrl("  https://contribradar.vercel.app/  ")).toBe("https://contribradar.vercel.app");
  });

  it("rejects non-http URL origins", () => {
    expect(billingAppUrl("javascript:alert(1)")).toBeUndefined();
    expect(billingAppUrl("ftp://contribradar.vercel.app")).toBeUndefined();
  });

  it("rejects URL values that include a path, query, or hash", () => {
    expect(billingAppUrl("https://contribradar.vercel.app/pricing")).toBeUndefined();
    expect(billingAppUrl("https://contribradar.vercel.app?ref=github")).toBeUndefined();
    expect(billingAppUrl("https://contribradar.vercel.app#billing")).toBeUndefined();
  });
});
