"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

type MapPayload = {
  lat: number | null;
  lng: number | null;
  measurements: { id: string; label: string; type: string; sqft: number; points: [number, number][] }[];
  lawnSqft: number;
  driveSqft: number;
  walkwaySqft: number;
  mulchSqft: number;
  totalAcres: number;
};

function parseMapPayload(raw: FormDataEntryValue | null): MapPayload {
  if (!raw) {
    return {
      lat: null,
      lng: null,
      measurements: [],
      lawnSqft: 0,
      driveSqft: 0,
      walkwaySqft: 0,
      mulchSqft: 0,
      totalAcres: 0,
    };
  }
  try {
    return JSON.parse(String(raw));
  } catch {
    return {
      lat: null,
      lng: null,
      measurements: [],
      lawnSqft: 0,
      driveSqft: 0,
      walkwaySqft: 0,
      mulchSqft: 0,
      totalAcres: 0,
    };
  }
}

function propertyDataFromForm(formData: FormData) {
  const map = parseMapPayload(formData.get("mapPayload"));
  const boundaryGeoJson =
    map.measurements.length > 0
      ? JSON.stringify({
          type: "FeatureCollection",
          features: map.measurements.map((m) =>
            m.type === "obstacle"
              ? {
                  type: "Feature",
                  properties: { label: m.label, type: m.type, sqft: m.sqft },
                  geometry: {
                    type: "Point",
                    coordinates: [m.points[0][1], m.points[0][0]],
                  },
                }
              : {
                  type: "Feature",
                  properties: { label: m.label, type: m.type, sqft: m.sqft },
                  geometry: {
                    type: "Polygon",
                    coordinates: [m.points.map((p) => [p[1], p[0]])],
                  },
                }
          ),
        })
      : null;

  return {
    customerId: String(formData.get("customerId") ?? ""),
    label: String(formData.get("label") ?? "Main Property").trim() || "Main Property",
    addressLine: String(formData.get("addressLine") ?? "").trim(),
    city: String(formData.get("city") ?? "").trim(),
    state: String(formData.get("state") ?? "VT").trim(),
    zip: String(formData.get("zip") ?? "").trim(),
    lat: map.lat,
    lng: map.lng,
    lawnSqft: map.lawnSqft || null,
    driveSqft: map.driveSqft || null,
    walkwaySqft: map.walkwaySqft || null,
    mulchSqft: map.mulchSqft || null,
    totalAcres: map.totalAcres || null,
    boundaryGeoJson,
    measurements: JSON.stringify(map.measurements),
    gateCode: String(formData.get("gateCode") ?? "").trim() || null,
    accessNotes: String(formData.get("accessNotes") ?? "").trim() || null,
    hazards: String(formData.get("hazards") ?? "").trim() || null,
  };
}

export async function createProperty(formData: FormData) {
  const data = propertyDataFromForm(formData);
  if (!data.customerId) throw new Error("Customer is required");
  if (!data.addressLine) throw new Error("Address is required");

  const property = await prisma.property.create({ data });
  revalidatePath("/properties");
  revalidatePath(`/customers/${data.customerId}`);
  redirect(`/properties/${property.id}`);
}

export async function updateProperty(id: string, formData: FormData) {
  const data = propertyDataFromForm(formData);
  if (!data.addressLine) throw new Error("Address is required");

  await prisma.property.update({ where: { id }, data });
  revalidatePath("/properties");
  revalidatePath(`/properties/${id}`);
  revalidatePath(`/customers/${data.customerId}`);
  redirect(`/properties/${id}`);
}

// Used by the /map page's embedded measuring panel: creates or updates a
// property (optionally creating a brand-new customer first) without
// redirecting away, so the map stays put and just shows the fresh pin.
export async function saveMapProperty(
  formData: FormData
): Promise<{ propertyId: string; customerId: string; customerName: string }> {
  let customerId = String(formData.get("customerId") ?? "");
  const newCustomerName = String(formData.get("newCustomerName") ?? "").trim();
  let customerName = "";

  if (!customerId && newCustomerName) {
    const created = await prisma.customer.create({
      data: { name: newCustomerName, status: "lead", pipelineStage: "new", source: "map" },
    });
    customerId = created.id;
    customerName = created.name;
  }
  if (!customerId) {
    throw new Error("Select an existing customer or enter a name for a new one.");
  }
  if (!customerName) {
    const c = await prisma.customer.findUniqueOrThrow({
      where: { id: customerId },
      select: { name: true },
    });
    customerName = c.name;
  }

  const data = propertyDataFromForm(formData);
  data.customerId = customerId;
  if (!data.addressLine) throw new Error("Address is required");

  const propertyId = String(formData.get("propertyId") ?? "");
  const property = propertyId
    ? await prisma.property.update({ where: { id: propertyId }, data })
    : await prisma.property.create({ data });

  revalidatePath("/map");
  revalidatePath("/properties");
  revalidatePath(`/customers/${customerId}`);
  if (propertyId) revalidatePath(`/properties/${propertyId}`);

  return { propertyId: property.id, customerId, customerName };
}

export async function deleteProperty(id: string, customerId: string) {
  await prisma.property.delete({ where: { id } });
  revalidatePath("/properties");
  revalidatePath(`/customers/${customerId}`);
  redirect(`/customers/${customerId}`);
}
