import { describe, expect, it } from "vitest";

import { signPayload, verifySignature } from "./webhookSignature";

describe("webhook signature", () => {
  const secret = "super-secret";
  const body = JSON.stringify({ hello: "world" });

  it("aceita uma assinatura correta", () => {
    const signature = signPayload(body, secret);
    expect(verifySignature(body, secret, signature)).toBe(true);
  });

  it("rejeita assinatura de outro segredo", () => {
    const signature = signPayload(body, "wrong-secret");
    expect(verifySignature(body, secret, signature)).toBe(false);
  });

  it("rejeita corpo alterado depois de assinado", () => {
    const signature = signPayload(body, secret);
    const tamperedBody = JSON.stringify({ hello: "world", extra: true });
    expect(verifySignature(tamperedBody, secret, signature)).toBe(false);
  });

  it("rejeita quando não há assinatura", () => {
    expect(verifySignature(body, secret, null)).toBe(false);
  });
});
