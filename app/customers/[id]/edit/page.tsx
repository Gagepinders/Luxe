import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui";
import CustomerForm from "@/components/CustomerForm";
import { updateCustomer } from "@/app/actions/customers";

export const dynamic = "force-dynamic";

export default async function EditCustomerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const customer = await prisma.customer.findUnique({ where: { id } });
  if (!customer) notFound();

  const action = updateCustomer.bind(null, id);

  return (
    <main className="p-6 md:p-8">
      <PageHeader title={`Edit ${customer.name}`} />
      <CustomerForm action={action} customer={customer} />
    </main>
  );
}
