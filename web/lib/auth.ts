import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { pool } from "./db";

export type User = {
  id: number;
  username: string;
  label: string;
  categories: string[];
  isMaster: boolean;
};

const COOKIE = "nlm_session";
const MAX_AGE = 60 * 60 * 12; // 12h

function key() {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 32) throw new Error("AUTH_SECRET must be set (32+ chars)");
  return new TextEncoder().encode(s);
}

export async function startSession(userId: number) {
  const jwt = await new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(userId))
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(key());
  (await cookies()).set(COOKIE, jwt, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function endSession() {
  (await cookies()).delete(COOKIE);
}

/** Verifies the cookie AND re-checks the user row, so disabling a user cuts access immediately. */
export async function currentUser(): Promise<User | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key());
    const { rows } = await pool.query(
      "SELECT id, username, label, categories, is_master FROM dashboard_users WHERE id = $1 AND active",
      [Number(payload.sub)]
    );
    const r = rows[0];
    if (!r) return null;
    return { id: r.id, username: r.username, label: r.label, categories: r.categories, isMaster: r.is_master };
  } catch {
    return null;
  }
}
