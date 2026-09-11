import { PageHeader } from "@/components/ui";
import CustomerForm from "@/components/CustomerForm";
import { createCustomer } from "@/app/actions/customers";

export const dynamic = "force-dynamic";

export default function NewCustomerPage() {
  return (
    <main className="p-6 md:p-8">
      <PageHeader title="New Customer" />
      <CustomerForm action={createCustomer} />
    </main>
  );
}
