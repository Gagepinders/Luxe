"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/passwords";
import { createSessionToken, SESSION_COOKIE } from "@/lib/session";

export async function login(formData: FormData) {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const next = String(formData.get("next") || "/");
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/";

  const user = email ? await prisma.user.findUnique({ where: { email } }) : null;
  const ok = user ? await verifyPassword(password, user.passwordHash) : false;
  if (!user || !ok) {
    redirect(`/login?error=1&next=${encodeURIComponent(safeNext)}`);
  }

  const token = await createSessionToken(user.id);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  redirect(safeNext);
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
  redirect("/login");
}
