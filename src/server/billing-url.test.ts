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
});
