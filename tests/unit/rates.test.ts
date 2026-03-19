import { describe, it, expect } from "vitest";
import { FLAT_FEES, DEFAULT_FEES } from "../../src/pricing/rates";

describe("FLAT_FEES", () => {
  it("every fee has a positive parseable amount", () => {
    for (const [key, fee] of Object.entries(FLAT_FEES)) {
      const amount = parseFloat(fee.amount);
      expect(amount, `${key} amount should be positive`).toBeGreaterThan(0);
    }
  });

  it("every fee has a non-empty description", () => {
    for (const [key, fee] of Object.entries(FLAT_FEES)) {
      expect(fee.description.length, `${key} description should not be empty`).toBeGreaterThan(0);
    }
  });

  it("has no duplicate route keys", () => {
    const keys = Object.keys(FLAT_FEES);
    const unique = new Set(keys);
    expect(unique.size).toBe(keys.length);
  });

  it("includes POST /sandbox for sandbox creation", () => {
    expect(FLAT_FEES["POST /sandbox"]).toBeDefined();
    expect(parseFloat(FLAT_FEES["POST /sandbox"].amount)).toBe(0.01);
  });

  it("git/clone costs more than base toolbox operations", () => {
    const clone = FLAT_FEES["POST /sandbox/:id/toolbox/git/clone"];
    const baseToolbox = FLAT_FEES["POST /sandbox/:id/toolbox/*"];
    expect(clone).toBeDefined();
    expect(baseToolbox).toBeDefined();
    expect(parseFloat(clone.amount)).toBeGreaterThan(
      parseFloat(baseToolbox.amount),
    );
  });

  it("includes toolbox wildcard entries for GET, POST, PUT, and DELETE", () => {
    expect(FLAT_FEES["GET /sandbox/:id/toolbox/*"]).toBeDefined();
    expect(FLAT_FEES["POST /sandbox/:id/toolbox/*"]).toBeDefined();
    expect(FLAT_FEES["PUT /sandbox/:id/toolbox/*"]).toBeDefined();
    expect(FLAT_FEES["DELETE /sandbox/:id/toolbox/*"]).toBeDefined();
  });
});

describe("DEFAULT_FEES", () => {
  it("has entries for standard HTTP methods", () => {
    expect(DEFAULT_FEES["GET"]).toBeDefined();
    expect(DEFAULT_FEES["POST"]).toBeDefined();
    expect(DEFAULT_FEES["PUT"]).toBeDefined();
    expect(DEFAULT_FEES["PATCH"]).toBeDefined();
    expect(DEFAULT_FEES["DELETE"]).toBeDefined();
  });

  it("every default fee has a positive amount", () => {
    for (const [method, fee] of Object.entries(DEFAULT_FEES)) {
      const amount = parseFloat(fee.amount);
      expect(amount, `${method} default should be positive`).toBeGreaterThan(0);
    }
  });
});
