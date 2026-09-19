import { createHmac, timingSafeEqual } from "node:crypto";

/** Assina o corpo bruto do webhook com HMAC-SHA256. */
export function signPayload(rawBody: string, secret: string): string {
  return createHmac("sha256", secret).update(rawBody).digest("hex");
}

/**
 * Verifica a assinatura em tempo constante (evita timing attack). Nunca usar
 * `===` para comparar segredos/assinaturas.
 */
export function verifySignature(rawBody: string, secret: string, signature: string | null): boolean {
  if (!signature) return false;

  const expected = signPayload(rawBody, secret);
  const expectedBuffer = Buffer.from(expected, "hex");
  const providedBuffer = Buffer.from(signature, "hex");

  if (expectedBuffer.length !== providedBuffer.length) return false;
  return timingSafeEqual(expectedBuffer, providedBuffer);
}
