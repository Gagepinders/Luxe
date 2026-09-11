import { Field, inputClass, Button } from "@/components/ui";

type Customer = {
  id: string;
  name: string;
  companyName: string | null;
  email: string | null;
  phone: string | null;
  type: string;
  status: string;
  tags: string | null;
  notes: string | null;
};

export default function CustomerForm({
  action,
  customer,
}: {
  action: (formData: FormData) => void;
  customer?: Customer;
}) {
  return (
    <form action={action} className="card p-5 space-y-4 max-w-2xl">
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Full name">
          <input
            name="name"
            required
            defaultValue={customer?.name}
            className={inputClass}
            placeholder="Jane Doe"
          />
        </Field>
        <Field label="Company (optional)">
          <input
            name="companyName"
            defaultValue={customer?.companyName ?? ""}
            className={inputClass}
            placeholder="Doe Properties LLC"
          />
        </Field>
        <Field label="Phone">
          <input
            name="phone"
            defaultValue={customer?.phone ?? ""}
            className={inputClass}
            placeholder="(802) 555-0100"
          />
        </Field>
        <Field label="Email">
          <input
            name="email"
            type="email"
            defaultValue={customer?.email ?? ""}
            className={inputClass}
            placeholder="jane@example.com"
          />
        </Field>
        <Field label="Type">
          <select
            name="type"
            defaultValue={customer?.type ?? "residential"}
            className={inputClass}
          >
            <option value="residential">Residential</option>
            <option value="commercial">Commercial</option>
          </select>
        </Field>
        <Field label="Status">
          <select
            name="status"
            defaultValue={customer?.status ?? "lead"}
            className={inputClass}
          >
            <option value="lead">Lead</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </Field>
      </div>
      <Field label="Tags (comma separated)" hint="e.g. VIP, snow-plan, mowing-weekly">
        <input
          name="tags"
          defaultValue={customer?.tags ?? ""}
          className={inputClass}
        />
      </Field>
      <Field label="Notes">
        <textarea
          name="notes"
          defaultValue={customer?.notes ?? ""}
          rows={3}
          className={inputClass}
        />
      </Field>
      <div className="flex gap-2 pt-2">
        <Button type="submit">{customer ? "Save changes" : "Create customer"}</Button>
        <Button href={customer ? `/customers/${customer.id}` : "/customers"} variant="secondary">
          Cancel
        </Button>
      </div>
    </form>
  );
}
