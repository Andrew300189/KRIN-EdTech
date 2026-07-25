import { createHash, randomBytes, timingSafeEqual } from "crypto";

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const digest = createHash("sha256").update(`${salt}:${password}`).digest("hex");
  return `${salt}:${digest}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, digest] = stored.split(":");
  if (!salt || !digest) return false;

  const candidate = createHash("sha256").update(`${salt}:${password}`).digest("hex");
  const a = Buffer.from(digest, "hex");
  const b = Buffer.from(candidate, "hex");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
