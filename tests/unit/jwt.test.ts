import { describe, it, expect } from "vitest";
import { generateJWT, verifyJWT } from "../../src/auth/jwt";

const TEST_SECRET = "test-secret-key-for-testing-only-at-least-32-chars!!";

describe("generateJWT", () => {
  it("produces a three-part dot-separated string", async () => {
    const token = await generateJWT(TEST_SECRET, 3600);
    expect(token.split(".")).toHaveLength(3);
  });

  it("includes jti and address fields", async () => {
    const token = await generateJWT(TEST_SECRET, 3600, {
      jti: "test-jti",
      address: "0xABC",
    });
    const payload = await verifyJWT(token, TEST_SECRET);
    expect(payload).not.toBeNull();
    expect(payload!.jti).toBe("test-jti");
    expect(payload!.address).toBe("0xABC");
  });

  it("includes route and sandboxId when provided", async () => {
    const token = await generateJWT(TEST_SECRET, 3600, {
      route: "POST /sandbox",
      sandboxId: "sb-123",
    });
    const payload = await verifyJWT(token, TEST_SECRET);
    expect(payload!.route).toBe("POST /sandbox");
    expect(payload!.sandboxId).toBe("sb-123");
  });

  it("sets paid to true", async () => {
    const token = await generateJWT(TEST_SECRET, 3600);
    const payload = await verifyJWT(token, TEST_SECRET);
    expect(payload!.paid).toBe(true);
  });

  it("generates unique jti when not provided", async () => {
    const token1 = await generateJWT(TEST_SECRET, 3600);
    const token2 = await generateJWT(TEST_SECRET, 3600);
    const p1 = await verifyJWT(token1, TEST_SECRET);
    const p2 = await verifyJWT(token2, TEST_SECRET);
    expect(p1!.jti).not.toBe(p2!.jti);
  });
});

describe("verifyJWT", () => {
  it("returns payload for a freshly generated token", async () => {
    const token = await generateJWT(TEST_SECRET, 3600);
    const payload = await verifyJWT(token, TEST_SECRET);
    expect(payload).not.toBeNull();
    expect(payload!.paid).toBe(true);
  });

  it("returns null for a tampered signature", async () => {
    const token = await generateJWT(TEST_SECRET, 3600);
    const tampered = token.slice(0, -5) + "XXXXX";
    const payload = await verifyJWT(tampered, TEST_SECRET);
    expect(payload).toBeNull();
  });

  it("returns null for an expired token", async () => {
    // Generate a token that expired 10 seconds ago
    const token = await generateJWT(TEST_SECRET, -10);
    const payload = await verifyJWT(token, TEST_SECRET);
    expect(payload).toBeNull();
  });

  it("returns null for wrong secret", async () => {
    const token = await generateJWT(TEST_SECRET, 3600);
    const payload = await verifyJWT(token, "wrong-secret-key-that-is-different");
    expect(payload).toBeNull();
  });

  it("returns null for malformed token", async () => {
    expect(await verifyJWT("not.a.valid.token", TEST_SECRET)).toBeNull();
    expect(await verifyJWT("garbage", TEST_SECRET)).toBeNull();
    expect(await verifyJWT("", TEST_SECRET)).toBeNull();
  });

  it("round-trips all extended fields", async () => {
    const token = await generateJWT(TEST_SECRET, 3600, {
      jti: "my-jti",
      address: "0x1234567890abcdef",
      route: "POST /sandbox",
      sandboxId: "sandbox-abc",
    });
    const payload = await verifyJWT(token, TEST_SECRET);
    expect(payload).toMatchObject({
      jti: "my-jti",
      address: "0x1234567890abcdef",
      route: "POST /sandbox",
      sandboxId: "sandbox-abc",
      paid: true,
    });
  });
});
