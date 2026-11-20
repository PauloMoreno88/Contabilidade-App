import { describe, expect, it } from "vitest";
import { destinationFor, homeFor, safeNext } from "./redirect";

describe("safeNext", () => {
  it("keeps paths inside the site", () => {
    expect(safeNext("/app/documentos")).toBe("/app/documentos");
  });
  it("drops other sites and empty values", () => {
    expect(safeNext("https://evil.example/app")).toBeNull();
    expect(safeNext("//evil.example/app")).toBeNull();
    expect(safeNext("")).toBeNull();
    expect(safeNext(null)).toBeNull();
  });
});

describe("destinationFor", () => {
  it("each role has its home", () => {
    expect(homeFor("admin")).toBe("/admin/mes");
    expect(homeFor("customer")).toBe("/app");
    expect(destinationFor("admin", null)).toBe("/admin/mes");
    expect(destinationFor("customer", null)).toBe("/app");
  });

  it("follows ?next= inside the role's own area", () => {
    expect(destinationFor("admin", "/admin/clientes")).toBe("/admin/clientes");
    expect(destinationFor("customer", "/app/guias")).toBe("/app/guias");
  });

  // A customer sent to /entrar?next=/admin/... used to be sent back to /admin, which sent them to /entrar again (loop).
  it("never sends a customer to /admin nor the team to /app", () => {
    expect(destinationFor("customer", "/admin/clientes")).toBe("/app");
    expect(destinationFor("admin", "/app/documentos")).toBe("/admin/mes");
    expect(destinationFor(undefined, "/admin")).toBe("/app");
  });
});
