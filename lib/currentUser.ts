import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session";

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const uid = await verifySessionToken(cookieStore.get(SESSION_COOKIE)?.value);
  if (!uid) return null;
  return prisma.user.findUnique({ where: { id: uid } });
}
