"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSnowDispatchCandidates } from "@/lib/snowDispatch";

// Creates a job scheduled for today for every customer on the snow-removal
// list who doesn't already have one today — the "storm hit, dispatch
// everyone" button. Safe to click more than once: getSnowDispatchCandidates
// already filters out anyone dispatched today.
export async function dispatchSnowDay() {
  const candidates = await getSnowDispatchCandidates();
  if (candidates.length === 0) {
    redirect("/jobs?dispatched=0");
  }

  const today = new Date();
  today.setHours(8, 0, 0, 0);

  await prisma.job.createMany({
    data: candidates.map((c) => ({
      customerId: c.customerId,
      propertyId: c.propertyId,
      serviceTypeId: c.serviceTypeId,
      title: c.title,
      scheduledDate: today,
      crew: c.crew,
      price: c.price,
      recurrence: "none",
      notes: "Created by snow-day dispatch.",
    })),
  });

  for (const c of candidates) {
    await prisma.activity.create({
      data: {
        customerId: c.customerId,
        type: "job",
        body: `Snow-day dispatch: "${c.title}" scheduled for today.`,
      },
    });
  }

  revalidatePath("/jobs");
  revalidatePath("/routes");
  revalidatePath("/weather");
  revalidatePath("/");
  redirect(`/jobs?dispatched=${candidates.length}`);
}
