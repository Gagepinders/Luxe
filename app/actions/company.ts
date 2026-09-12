"use server";

import { prisma } from "@/lib/prisma";
import { geocodeAddress } from "@/lib/geocode";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

function str(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

export async function updateCompanyProfile(formData: FormData) {
  const addressLine = str(formData, "addressLine");
  const city = str(formData, "city");
  const state = str(formData, "state");
  const zip = str(formData, "zip");

  const current = await prisma.companyProfile.findUnique({ where: { id: "default" } });
  let lat = current?.lat ?? 44.5063689;
  let lng = current?.lng ?? -73.059018;

  const addressChanged =
    !current || addressLine !== current.addressLine || city !== current.city || state !== current.state;
  if (addressChanged && addressLine) {
    const matches = await geocodeAddress(`${addressLine}, ${city}, ${state} ${zip}`);
    if (matches[0]) {
      lat = matches[0].lat;
      lng = matches[0].lng;
    }
  }

  await prisma.companyProfile.upsert({
    where: { id: "default" },
    create: {
      id: "default",
      name: str(formData, "name") || "Luxe Landscape & Snow",
      tagline: str(formData, "tagline"),
      phone: str(formData, "phone"),
      email: str(formData, "email"),
      addressLine,
      city,
      state,
      zip,
      lat,
      lng,
      serviceArea: str(formData, "serviceArea"),
      website: str(formData, "website"),
      googleReviewUrl: str(formData, "googleReviewUrl") || null,
    },
    update: {
      name: str(formData, "name") || "Luxe Landscape & Snow",
      tagline: str(formData, "tagline"),
      phone: str(formData, "phone"),
      email: str(formData, "email"),
      addressLine,
      city,
      state,
      zip,
      lat,
      lng,
      serviceArea: str(formData, "serviceArea"),
      website: str(formData, "website"),
      googleReviewUrl: str(formData, "googleReviewUrl") || null,
    },
  });

  revalidatePath("/settings");
  revalidatePath("/");
  revalidatePath("/routes");
  revalidatePath("/weather");
  redirect("/settings?saved=1");
}
