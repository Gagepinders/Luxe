"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

function num(formData: FormData, key: string, fallback = 0) {
  const raw = formData.get(key);
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}
function str(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

export async function createMaterial(formData: FormData) {
  const name = str(formData, "name");
  if (!name) throw new Error("Name is required");

  await prisma.materialStock.create({
    data: {
      name,
      unit: str(formData, "unit") || "unit",
      quantity: num(formData, "quantity"),
      lowStockAt: num(formData, "lowStockAt"),
      notes: str(formData, "notes") || null,
    },
  });
  revalidatePath("/inventory");
}

export async function addStock(formData: FormData) {
  const id = str(formData, "id");
  const amount = num(formData, "amount");
  const material = await prisma.materialStock.findUnique({ where: { id } });
  if (!material) return;
  await prisma.materialStock.update({
    where: { id },
    data: { quantity: material.quantity + Math.abs(amount) },
  });
  revalidatePath("/inventory");
}

export async function useStock(formData: FormData) {
  const id = str(formData, "id");
  const amount = num(formData, "amount");
  const material = await prisma.materialStock.findUnique({ where: { id } });
  if (!material) return;
  await prisma.materialStock.update({
    where: { id },
    data: { quantity: Math.max(0, material.quantity - Math.abs(amount)) },
  });
  revalidatePath("/inventory");
}

export async function deleteMaterial(id: string) {
  await prisma.materialStock.delete({ where: { id } });
  revalidatePath("/inventory");
}

export async function createEquipment(formData: FormData) {
  const name = str(formData, "name");
  if (!name) throw new Error("Name is required");

  const nextServiceDue = str(formData, "nextServiceDue");
  await prisma.equipment.create({
    data: {
      name,
      category: str(formData, "category") || "equipment",
      status: str(formData, "status") || "active",
      nextServiceDue: nextServiceDue ? new Date(nextServiceDue) : null,
      notes: str(formData, "notes") || null,
    },
  });
  revalidatePath("/inventory");
}

export async function markServiced(id: string, nextServiceInDays: number) {
  const now = new Date();
  const next = new Date(now.getTime() + nextServiceInDays * 24 * 60 * 60 * 1000);
  await prisma.equipment.update({
    where: { id },
    data: { lastServicedAt: now, nextServiceDue: next, status: "active" },
  });
  revalidatePath("/inventory");
}

export async function setEquipmentStatus(id: string, status: string) {
  await prisma.equipment.update({ where: { id }, data: { status } });
  revalidatePath("/inventory");
}

export async function deleteEquipment(id: string) {
  await prisma.equipment.delete({ where: { id } });
  revalidatePath("/inventory");
}
