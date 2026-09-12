import { Field, inputClass, Button } from "@/components/ui";
import CustomerJobSelect from "@/components/CustomerJobSelect";
import QuoteLineItemsEditor, {
  type LineItemRow,
  type ServiceTypeOption,
} from "@/components/QuoteLineItemsEditor";

type Customer = { id: string; name: string };
type Job = { id: string; customerId: string; title: string; price: number };

export default function InvoiceForm({
  action,
  customers,
  jobs,
  serviceTypes,
  defaultCustomerId,
  defaultJobId,
  invoice,
  initialItems = [],
}: {
  action: (formData: FormData) => void;
  customers: Customer[];
  jobs: Job[];
  serviceTypes: ServiceTypeOption[];
  defaultCustomerId?: string;
  defaultJobId?: string;
  invoice?: {
    id: string;
    customerId: string;
    jobId: string | null;
    dueAt: Date | null;
    notes: string | null;
  };
  initialItems?: LineItemRow[];
}) {
  const dueAtStr = invoice?.dueAt ? new Date(invoice.dueAt).toISOString().slice(0, 10) : "";

  return (
    <form action={action} className="card p-5 space-y-4 max-w-4xl">
      <CustomerJobSelect
        customers={customers}
        jobs={jobs}
        defaultCustomerId={invoice?.customerId ?? defaultCustomerId}
        defaultJobId={invoice?.jobId ?? defaultJobId}
      />

      <Field label="Due date">
        <input type="date" name="dueAt" defaultValue={dueAtStr} className={inputClass} />
      </Field>

      <Field label="Line items">
        <QuoteLineItemsEditor initialItems={initialItems} serviceTypes={serviceTypes} />
      </Field>

      <Field label="Notes">
        <textarea name="notes" defaultValue={invoice?.notes ?? ""} rows={3} className={inputClass} />
      </Field>

      <div className="flex gap-2 pt-2">
        <Button type="submit">{invoice ? "Save changes" : "Create invoice"}</Button>
        <Button href={invoice ? `/invoices/${invoice.id}` : "/invoices"} variant="secondary">
          Cancel
        </Button>
      </div>
    </form>
  );
}
