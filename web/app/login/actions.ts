"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { pool } from "@/lib/db";
import { startSession, endSession } from "@/lib/auth";

// Valid bcrypt hash of a random string, compared when the username is unknown so timing doesn't reveal which usernames exist.
const DUMMY = bcrypt.hashSync(crypto.randomUUID(), 12);

const MAX_FAILS = 5; // per username per 15 minutes

export async function login(_prev: { error?: string } | undefined, form: FormData) {
  const username = String(form.get("username") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  if (!username || !password || password.length > 200) return { error: "Enter your username and password." };

  const { rows: att } = await pool.query(
    "SELECT count(*)::int AS n FROM dashboard_login_attempts WHERE username = $1 AND NOT success AND at > now() - interval '15 minutes'",
    [username]
  );
  if (att[0].n >= MAX_FAILS) return { error: "Too many attempts. Try again in 15 minutes." };

  const { rows } = await pool.query("SELECT id, password_hash FROM dashboard_users WHERE username = $1 AND active", [username]);
  const ok = await bcrypt.compare(password, rows[0]?.password_hash ?? DUMMY);
  const valid = ok && rows.length === 1;

  await pool.query("INSERT INTO dashboard_login_attempts (username, success) VALUES ($1, $2)", [username, valid]);
  if (!valid) return { error: "Incorrect username or password." };

  await pool.query("DELETE FROM dashboard_login_attempts WHERE at < now() - interval '7 days'");
  await startSession(rows[0].id);
  redirect("/");
}

export async function logout() {
  await endSession();
  redirect("/login");
}
