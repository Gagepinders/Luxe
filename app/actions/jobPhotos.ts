"use server";

import path from "path";
import fs from "fs/promises";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { ensureUploadsDir, safeExtension, getUploadsDir } from "@/lib/uploads";
import { revalidatePath } from "next/cache";

export async function uploadJobPhoto(jobId: string, formData: FormData) {
  const files = formData.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0);
  const caption = String(formData.get("caption") ?? "").trim() || null;
  if (files.length === 0) return;

  const dir = await ensureUploadsDir();

  for (const file of files) {
    const ext = safeExtension(file.name);
    const filename = `${randomBytes(12).toString("hex")}${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(path.join(dir, filename), buffer);
    await prisma.jobPhoto.create({
      data: { jobId, filename, caption: files.length === 1 ? caption : null },
    });
  }

  revalidatePath(`/jobs/${jobId}`);
}

export async function deleteJobPhoto(photoId: string, jobId: string) {
  const photo = await prisma.jobPhoto.findUnique({ where: { id: photoId } });
  if (photo) {
    await fs.unlink(path.join(getUploadsDir(), photo.filename)).catch(() => {});
    await prisma.jobPhoto.delete({ where: { id: photoId } });
  }
  revalidatePath(`/jobs/${jobId}`);
}
