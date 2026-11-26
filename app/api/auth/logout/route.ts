import { NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/crm/auth-server";

export const dynamic = "force-dynamic";

export async function POST() {
  const res = NextResponse.json({ success: true });
  res.cookies.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  res.cookies.set("nexora_auth_user", "", { path: "/", maxAge: 0 });
  return res;
}
