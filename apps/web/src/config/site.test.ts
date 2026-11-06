import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { platformTour } from "./site";

describe("platformTour", () => {
  it("has five flows, each with text and its files in public/", () => {
    expect(platformTour.flows).toHaveLength(5);
    for (const flow of platformTour.flows) {
      expect(flow.title).not.toBe("");
      expect(flow.text).not.toBe("");
      expect(existsSync(join("public", flow.video)), flow.video).toBe(true);
      expect(existsSync(join("public", flow.poster)), flow.poster).toBe(true);
    }
  });
});
