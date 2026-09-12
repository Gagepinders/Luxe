"use server";

import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/passwords";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createUser(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!name) throw new Error("Name is required");
  if (!email) throw new Error("Email is required");
  if (password.length < 8) throw new Error("Password must be at least 8 characters");

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new Error("A user with that email already exists");

  const passwordHash = await hashPassword(password);
  await prisma.user.create({ data: { name, email, passwordHash } });

  revalidatePath("/team");
  redirect("/team");
}

export async function deleteUser(id: string) {
  const remaining = await prisma.user.count();
  if (remaining <= 1) throw new Error("Can't remove the last remaining account");
  await prisma.user.delete({ where: { id } });
  revalidatePath("/team");
}
