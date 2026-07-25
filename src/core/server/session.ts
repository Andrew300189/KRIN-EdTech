import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

const SESSION_COOKIE = "krin_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

function getSessionSecret() {
  const secret = process.env.NEXTAUTH_SECRET || process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION secret is missing. Set NEXTAUTH_SECRET or SESSION_SECRET.");
  }
  return secret;
}

function sign(payloadBase64: string) {
  return createHmac("sha256", getSessionSecret()).update(payloadBase64).digest("hex");
}

export async function createSession(userId: string) {
  const payload = {
    userId,
    nonce: randomBytes(8).toString("hex"),
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
  };

  const payloadBase64 = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const signature = sign(payloadBase64);
  const token = `${payloadBase64}.${signature}`;

  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function destroySession() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}

export async function getSessionUserId(): Promise<string | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const [payloadBase64, signature] = token.split(".");
  if (!payloadBase64 || !signature) return null;

  const expected = sign(payloadBase64);
  const a = Buffer.from(signature, "hex");
  const b = Buffer.from(expected, "hex");
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const payload = JSON.parse(Buffer.from(payloadBase64, "base64url").toString("utf8")) as {
      userId: string;
      exp: number;
    };

    if (!payload.userId || !payload.exp) return null;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;

    return payload.userId;
  } catch {
    return null;
  }
}
