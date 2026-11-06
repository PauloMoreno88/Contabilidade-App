import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { platformMedia, platformTour, type PlatformView } from "./site";

describe("platformTour", () => {
  it("has five flows, each with text and its files for both views in public/", () => {
    expect(platformTour.flows).toHaveLength(5);
    for (const flow of platformTour.flows) {
      expect(flow.title).not.toBe("");
      expect(flow.text).not.toBe("");
      for (const view of Object.keys(platformTour.views) as PlatformView[]) {
        const { video, poster } = platformMedia(view, flow.id);
        expect(existsSync(join("public", video)), video).toBe(true);
        expect(existsSync(join("public", poster)), poster).toBe(true);
      }
    }
  });
});
