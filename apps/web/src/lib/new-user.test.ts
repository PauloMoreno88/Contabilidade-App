import { describe, expect, it } from "vitest";
import { createAdminError, parseAmountCents } from "./new-user";

describe("parseAmountCents", () => {
  it("reads Brazilian money", () => {
    expect(parseAmountCents("3.588,00")).toBe(358800);
    expect(parseAmountCents("299,9")).toBe(29990);
    expect(parseAmountCents("1500")).toBe(150000);
  });
  it("returns 0 for empty or invalid input", () => {
    expect(parseAmountCents("")).toBe(0);
    expect(parseAmountCents("abc")).toBe(0);
  });
});

describe("createAdminError", () => {
  it("maps Better Auth codes", () => {
    expect(createAdminError("USER_ALREADY_EXISTS")).toBe("exists");
    expect(createAdminError("USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL")).toBe("exists");
    expect(createAdminError("PASSWORD_TOO_SHORT")).toBe("password");
    expect(createAdminError("PASSWORD_TOO_LONG")).toBe("password");
    expect(createAdminError(undefined)).toBe("generic");
    expect(createAdminError("FORBIDDEN")).toBe("generic");
  });
});
