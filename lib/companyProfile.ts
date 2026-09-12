import { prisma } from "@/lib/prisma";

export async function getCompanyProfile() {
  return prisma.companyProfile.upsert({
    where: { id: "default" },
    update: {},
    create: { id: "default" },
  });
}
