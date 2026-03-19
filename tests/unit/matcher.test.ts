import { describe, it, expect } from "vitest";
import { pathMatchesPattern, findFee, applySurcharge } from "../../src/pricing/matcher";

describe("pathMatchesPattern", () => {
  it("matches exact paths", () => {
    expect(pathMatchesPattern("/sandbox", "/sandbox")).toBe(true);
  });

  it("matches param segments", () => {
    expect(pathMatchesPattern("/sandbox/abc-123", "/sandbox/:id")).toBe(true);
  });

  it("matches multi-segment params", () => {
    expect(
      pathMatchesPattern("/sandbox/abc-123/start", "/sandbox/:id/start"),
    ).toBe(true);
  });

  it("rejects length mismatch", () => {
    expect(pathMatchesPattern("/sandbox/abc", "/sandbox")).toBe(false);
  });

  it("rejects non-matching literal segments", () => {
    expect(pathMatchesPattern("/sandbox/abc/stop", "/sandbox/:id/start")).toBe(
      false,
    );
  });

  it("matches wildcard suffix", () => {
    expect(pathMatchesPattern("/sandbox/abc/start", "/sandbox/*")).toBe(true);
  });

  it("matches wildcard with nested paths", () => {
    expect(pathMatchesPattern("/sandbox/a/b/c/d", "/sandbox/*")).toBe(true);
  });

  it("wildcard does not match prefix-only", () => {
    expect(pathMatchesPattern("/other/abc", "/sandbox/*")).toBe(false);
  });

  it("param-prefixed wildcard matches toolbox sub-path", () => {
    expect(
      pathMatchesPattern(
        "/sandbox/abc-123/toolbox/process/execute",
        "/sandbox/:id/toolbox/*",
      ),
    ).toBe(true);
  });

  it("param-prefixed wildcard matches deeply nested path", () => {
    expect(
      pathMatchesPattern(
        "/sandbox/abc-123/toolbox/git/branches",
        "/sandbox/:id/toolbox/*",
      ),
    ).toBe(true);
  });

  it("param-prefixed wildcard rejects wrong base", () => {
    expect(
      pathMatchesPattern(
        "/sandbox/abc-123/files/something",
        "/sandbox/:id/toolbox/*",
      ),
    ).toBe(false);
  });

  it("param-prefixed wildcard rejects too-short path", () => {
    expect(
      pathMatchesPattern("/sandbox/abc-123", "/sandbox/:id/toolbox/*"),
    ).toBe(false);
  });
});

describe("findFee", () => {
  it("finds POST /sandbox at $0.01", () => {
    const fee = findFee("POST", "/sandbox");
    expect(fee).not.toBeNull();
    expect(fee!.amount).toBe("0.01");
  });

  it("finds POST /sandbox/:id/start", () => {
    const fee = findFee("POST", "/sandbox/abc-123/start");
    expect(fee).not.toBeNull();
    expect(fee!.amount).toBe("0.001");
  });

  it("finds GET /sandbox", () => {
    const fee = findFee("GET", "/sandbox");
    expect(fee).not.toBeNull();
    expect(fee!.amount).toBe("0.0001");
  });

  it("finds GET /sandbox/:id", () => {
    const fee = findFee("GET", "/sandbox/some-id");
    expect(fee).not.toBeNull();
    expect(fee!.amount).toBe("0.0001");
  });

  it("finds DELETE /sandbox/:id", () => {
    const fee = findFee("DELETE", "/sandbox/some-id");
    expect(fee).not.toBeNull();
    expect(fee!.amount).toBe("0.001");
  });

  it("falls back to method default for unknown routes", () => {
    const fee = findFee("GET", "/unknown/path");
    expect(fee).not.toBeNull();
    expect(fee!.amount).toBe("0.0001");
    expect(fee!.description).toContain("read");
  });

  it("falls back to POST default for unknown POST routes", () => {
    const fee = findFee("POST", "/some/new/endpoint");
    expect(fee).not.toBeNull();
    expect(fee!.amount).toBe("0.001");
  });

  it("falls back to PUT default for unmatched PUT routes", () => {
    const fee = findFee("PUT", "/sandbox/abc/something-new");
    expect(fee).not.toBeNull();
    expect(fee!.amount).toBe("0.001");
  });

  it("returns null for unsupported methods like OPTIONS", () => {
    const fee = findFee("OPTIONS", "/sandbox");
    expect(fee).toBeNull();
  });

  it("routes toolbox process/execute to POST wildcard", () => {
    const fee = findFee("POST", "/sandbox/abc/toolbox/process/execute");
    expect(fee).not.toBeNull();
    expect(fee!.amount).toBe("0.0001");
  });

  it("routes git/clone to specific $0.001 override, not wildcard", () => {
    const fee = findFee("POST", "/sandbox/abc/toolbox/git/clone");
    expect(fee).not.toBeNull();
    expect(fee!.amount).toBe("0.001");
  });

  it("routes toolbox GET to wildcard", () => {
    const fee = findFee("GET", "/sandbox/abc/toolbox/files");
    expect(fee).not.toBeNull();
    expect(fee!.amount).toBe("0.0001");
  });

  it("routes toolbox DELETE to wildcard", () => {
    const fee = findFee("DELETE", "/sandbox/abc/toolbox/files");
    expect(fee).not.toBeNull();
    expect(fee!.amount).toBe("0.0001");
  });

  it("routes GET /sandbox/paginated before :id param match", () => {
    const fee = findFee("GET", "/sandbox/paginated");
    expect(fee).not.toBeNull();
    expect(fee!.description).toContain("paginated");
  });

  it("routes POST /sandbox/:id/backup to $0.001", () => {
    const fee = findFee("POST", "/sandbox/abc/backup");
    expect(fee).not.toBeNull();
    expect(fee!.amount).toBe("0.001");
  });

  it("routes GET /sandbox/:id/ports/:port/preview-url", () => {
    const fee = findFee("GET", "/sandbox/abc/ports/8080/preview-url");
    expect(fee).not.toBeNull();
    expect(fee!.amount).toBe("0.0001");
  });

  it("routes POST /sandbox/:id/autostop/:interval", () => {
    const fee = findFee("POST", "/sandbox/abc/autostop/30");
    expect(fee).not.toBeNull();
    expect(fee!.amount).toBe("0.0001");
  });

  it("routes PUT /sandbox/:id/labels", () => {
    const fee = findFee("PUT", "/sandbox/abc/labels");
    expect(fee).not.toBeNull();
    expect(fee!.amount).toBe("0.0001");
  });

  it("routes POST /sandbox/:id/autoarchive/:interval", () => {
    const fee = findFee("POST", "/sandbox/abc/autoarchive/60");
    expect(fee).not.toBeNull();
    expect(fee!.amount).toBe("0.0001");
  });

  it("routes POST /sandbox/:id/ssh-access", () => {
    const fee = findFee("POST", "/sandbox/abc/ssh-access");
    expect(fee).not.toBeNull();
    expect(fee!.amount).toBe("0.001");
  });
});

describe("applySurcharge", () => {
  it("applies 10% surcharge", () => {
    const result = applySurcharge({ amount: "0.01", description: "Create a sandbox" }, 0.10);
    expect(result.amount).toBe("0.011000");
    expect(result.description).toContain("+10% platform fee");
  });

  it("applies 20% surcharge", () => {
    const result = applySurcharge({ amount: "0.001", description: "Start" }, 0.20);
    expect(result.amount).toBe("0.001200");
    expect(result.description).toContain("+20% platform fee");
  });

  it("returns original fee when surcharge is 0", () => {
    const fee = { amount: "0.01", description: "Create" };
    const result = applySurcharge(fee, 0);
    expect(result).toBe(fee);
  });

  it("returns original fee when surcharge is negative", () => {
    const fee = { amount: "0.01", description: "Create" };
    const result = applySurcharge(fee, -0.05);
    expect(result).toBe(fee);
  });
});
