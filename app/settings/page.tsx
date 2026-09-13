import { getCompanyProfile } from "@/lib/companyProfile";
import { updateCompanyProfile } from "@/app/actions/company";
import { PageHeader, Field, inputClass, Button } from "@/components/ui";
import { CheckCircle2, Settings } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const [company, { saved }] = await Promise.all([getCompanyProfile(), searchParams]);

  return (
    <main className="p-6 md:p-8">
      <PageHeader
        title="Settings"
        subtitle="Company info used across quotes, invoices, emails, and the routing map."
        icon={Settings}
      />

      {saved === "1" && (
        <div className="mb-4 flex items-center gap-2 rounded-lg bg-forest-700/10 px-4 py-3 text-sm font-medium text-forest-700">
          <CheckCircle2 size={16} /> Saved.
        </div>
      )}

      <form action={updateCompanyProfile} className="card p-5 space-y-4 max-w-2xl">
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Company name">
            <input name="name" defaultValue={company.name} required className={inputClass} />
          </Field>
          <Field label="Tagline">
            <input name="tagline" defaultValue={company.tagline} className={inputClass} />
          </Field>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Phone">
            <input name="phone" defaultValue={company.phone} className={inputClass} />
          </Field>
          <Field label="Email">
            <input type="email" name="email" defaultValue={company.email} className={inputClass} />
          </Field>
        </div>

        <Field
          label="HQ / office address"
          hint="Used as the routing depot and one of your monitored weather areas — re-geocoded automatically if you change it."
        >
          <input name="addressLine" defaultValue={company.addressLine} required className={inputClass} />
        </Field>

        <div className="grid sm:grid-cols-3 gap-4">
          <Field label="City">
            <input name="city" defaultValue={company.city} required className={inputClass} />
          </Field>
          <Field label="State">
            <input name="state" defaultValue={company.state} required className={inputClass} />
          </Field>
          <Field label="Zip">
            <input name="zip" defaultValue={company.zip} className={inputClass} />
          </Field>
        </div>

        <Field label="Service area" hint="Shown on the dashboard.">
          <input name="serviceArea" defaultValue={company.serviceArea} className={inputClass} />
        </Field>

        <Field label="Website">
          <input name="website" defaultValue={company.website} className={inputClass} />
        </Field>

        <Field
          label="Google review link"
          hint="Paste your Google Business review link — used by the 'Request a review' button on completed jobs."
        >
          <input
            name="googleReviewUrl"
            defaultValue={company.googleReviewUrl ?? ""}
            placeholder="https://g.page/r/.../review"
            className={inputClass}
          />
        </Field>

        <Button type="submit">Save settings</Button>
      </form>
    </main>
  );
}
