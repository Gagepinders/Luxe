"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function addJobExpense(jobId: string, formData: FormData) {
  const description = String(formData.get("description") ?? "").trim();
  const category = String(formData.get("category") ?? "material");
  const amount = Number(formData.get("amount") ?? 0);
  if (!description || !amount) return;

  await prisma.jobExpense.create({
    data: { jobId, description, category, amount },
  });
  revalidatePath(`/jobs/${jobId}`);
}

export async function deleteJobExpense(expenseId: string, jobId: string) {
  await prisma.jobExpense.delete({ where: { id: expenseId } });
  revalidatePath(`/jobs/${jobId}`);
}
