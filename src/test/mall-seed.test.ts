import { describe, expect, it } from "vitest";

import { duplicateBox, type Box } from "@/lib/mall-seed";

describe("mall box duplication", () => {
  it("copies every editable property and preserves exact absolute coordinates", () => {
    const source: Box = {
      id: "source",
      floor: 2,
      position: { x: 1245.25, y: 583.75 },
      width: 91,
      height: 34,
      fontSize: 19,
      rotation: 315,
      text: "Exact clone",
      highlightColor: "#ef4444",
    };

    expect(duplicateBox(source, "clone")).toEqual({ ...source, id: "clone" });
  });
});