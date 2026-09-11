import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui";
import JobForm from "@/components/JobForm";
import { updateJob } from "@/app/actions/jobs";

export const dynamic = "force-dynamic";

export default async function EditJobPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [job, customers, properties, serviceTypes] = await Promise.all([
    prisma.job.findUnique({ where: { id } }),
    prisma.customer.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.property.findMany({
      select: { id: true, customerId: true, label: true, addressLine: true },
    }),
    prisma.serviceType.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
  ]);
  if (!job) notFound();

  const action = updateJob.bind(null, id);

  return (
    <main className="p-6 md:p-8">
      <PageHeader title={`Edit ${job.title}`} />
      <JobForm action={action} customers={customers} properties={properties} serviceTypes={serviceTypes} job={job} />
    </main>
  );
}
