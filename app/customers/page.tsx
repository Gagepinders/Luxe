import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader, Button, EmptyState, inputClass } from "@/components/ui";
import StatusDropdown from "@/components/StatusDropdown";
import { setCustomerStatus, setPipelineStage } from "@/app/actions/customers";
import { CUSTOMER_STATUS_OPTIONS, PIPELINE_STAGE_OPTIONS } from "@/lib/statusOptions";
import { initials } from "@/lib/format";
import { Plus, Search, Users } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; type?: string }>;
}) {
  const { q, status, type } = await searchParams;

  const customers = await prisma.customer.findMany({
    where: {
      AND: [
        q
          ? {
              OR: [
                { name: { contains: q } },
                { companyName: { contains: q } },
                { email: { contains: q } },
                { phone: { contains: q } },
              ],
            }
          : {},
        status ? { status } : {},
        type ? { type } : {},
      ],
    },
    include: {
      properties: { select: { id: true } },
      quotes: { select: { id: true, status: true } },
      jobs: { select: { id: true, status: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <main className="p-6 md:p-8">
      <PageHeader
        title="Customers"
        subtitle={`${customers.length} customer${customers.length === 1 ? "" : "s"}`}
        icon={Users}
        action={
          <Button href="/customers/new">
            <Plus size={16} /> New Customer
          </Button>
        }
      />

      <form className="flex flex-wrap gap-2 mb-5" method="get">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-forest-950/40"
          />
          <input
            name="q"
            defaultValue={q}
            placeholder="Search name, email, phone…"
            className={`${inputClass} pl-8`}
          />
        </div>
        <select name="type" defaultValue={type ?? ""} className={inputClass + " max-w-[160px]"}>
          <option value="">All types</option>
          <option value="residential">Residential</option>
          <option value="commercial">Commercial</option>
        </select>
        <select name="status" defaultValue={status ?? ""} className={inputClass + " max-w-[160px]"}>
          <option value="">All statuses</option>
          <option value="lead">Lead</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <Button type="submit" variant="secondary">
          Filter
        </Button>
      </form>

      {customers.length === 0 ? (
        <EmptyState
          title="No customers yet"
          description="Add your first customer to start tracking properties, quotes, and jobs."
          action={
            <Button href="/customers/new">
              <Plus size={16} /> New Customer
            </Button>
          }
        />
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-surface-muted text-left text-forest-950/60 text-xs uppercase tracking-wide">
              <tr>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3 hidden sm:table-cell">Contact</th>
                <th className="px-4 py-3 hidden md:table-cell">Properties</th>
                <th className="px-4 py-3 hidden md:table-cell">Won quotes</th>
                <th className="px-4 py-3 hidden lg:table-cell">Pipeline</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => {
                const won = c.quotes.filter((qq) => qq.status === "won").length;
                return (
                  <tr
                    key={c.id}
                    className="border-t border-border-subtle hover:bg-surface-muted/60"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/customers/${c.id}`}
                        className="flex items-center gap-3 font-medium text-forest-950"
                      >
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-forest-100 text-forest-700 text-xs font-semibold">
                          {initials(c.name)}
                        </span>
                        <span>
                          {c.name}
                          {c.companyName && (
                            <span className="block text-xs text-forest-950/50">
                              {c.companyName}
                            </span>
                          )}
                        </span>
                      </Link>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell text-forest-950/70">
                      {c.phone ? (
                        <a
                          href={`tel:${c.phone.replace(/[^\d+]/g, "")}`}
                          className="hover:text-forest-700 hover:underline"
                        >
                          {c.phone}
                        </a>
                      ) : (
                        c.email || "—"
                      )}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-forest-950/70">
                      {c.properties.length}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-forest-950/70">
                      {won}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <StatusDropdown
                        value={c.pipelineStage}
                        options={PIPELINE_STAGE_OPTIONS}
                        onChange={setPipelineStage.bind(null, c.id)}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <StatusDropdown
                        value={c.status}
                        options={CUSTOMER_STATUS_OPTIONS}
                        onChange={setCustomerStatus.bind(null, c.id)}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
