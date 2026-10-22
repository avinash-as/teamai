import { describe, it, expect } from "vitest";
import { computeWaves, detectConflicts } from "./scheduler.js";

describe("computeWaves", () => {
  it("runs independent agents in one wave", () => {
    const agents = [{ id: "a" }, { id: "b" }];
    const waves = computeWaves(agents);
    expect(waves).toHaveLength(1);
    expect(waves[0]).toHaveLength(2);
  });

  it("orders dependent agents into waves", () => {
    const agents = [
      { id: "a" },
      { id: "b", dependsOn: ["a"] },
      { id: "c", dependsOn: ["a", "b"] },
    ];
    const waves = computeWaves(agents);
    expect(waves).toHaveLength(3);
    expect(waves[0].map(a => a.id)).toEqual(["a"]);
    expect(waves[1].map(a => a.id)).toEqual(["b"]);
    expect(waves[2].map(a => a.id)).toEqual(["c"]);
  });

  it("handles circular dependencies by running rest in parallel", () => {
    const agents = [{ id: "a", dependsOn: ["b"] }, { id: "b", dependsOn: ["a"] }];
    const waves = computeWaves(agents);
    expect(waves).toHaveLength(1);
    expect(waves[0]).toHaveLength(2);
  });

  it("handles empty input", () => {
    expect(computeWaves([])).toEqual([]);
  });
});

describe("detectConflicts", () => {
  it("detects overlapping file changes", () => {
    const changes = [
      { agentId: "frontend", files: ["App.jsx", "styles.css"] },
      { agentId: "backend", files: ["App.jsx", "api.js"] },
    ];
    const conflicts = detectConflicts(changes);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].file).toBe("App.jsx");
  });

  it("returns no conflicts for disjoint files", () => {
    const changes = [
      { agentId: "frontend", files: ["App.jsx"] },
      { agentId: "backend", files: ["api.js"] },
    ];
    expect(detectConflicts(changes)).toHaveLength(0);
  });
});