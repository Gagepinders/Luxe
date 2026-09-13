"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function createTodo(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return;
  const dueDateRaw = String(formData.get("dueDate") ?? "");
  const customerId = String(formData.get("customerId") ?? "") || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;

  await prisma.todo.create({
    data: {
      title,
      notes,
      dueDate: dueDateRaw ? new Date(dueDateRaw) : null,
      customerId,
    },
  });

  revalidatePath("/todos");
}

export async function toggleTodo(id: string, completed: boolean) {
  await prisma.todo.update({
    where: { id },
    data: { completed, completedAt: completed ? new Date() : null },
  });
  revalidatePath("/todos");
}

export async function deleteTodo(id: string) {
  await prisma.todo.delete({ where: { id } });
  revalidatePath("/todos");
}
