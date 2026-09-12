import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/currentUser";
import { createUser, deleteUser } from "@/app/actions/users";
import { PageHeader, inputClass } from "@/components/ui";
import { Trash2, UserPlus } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function TeamPage() {
  const [users, currentUser] = await Promise.all([
    prisma.user.findMany({ orderBy: { createdAt: "asc" } }),
    getCurrentUser(),
  ]);

  return (
    <main className="p-6 md:p-8">
      <PageHeader
        title="Team"
        subtitle="Everyone with a login can see all customers, quotes, and pricing."
      />

      <div className="grid gap-6 md:grid-cols-2">
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-forest-950 mb-3">Accounts</h2>
          <ul className="divide-y divide-border-subtle">
            {users.map((u) => (
              <li key={u.id} className="flex items-center justify-between py-2.5 text-sm">
                <div>
                  <p className="font-medium text-forest-950">
                    {u.name}
                    {u.id === currentUser?.id && (
                      <span className="ml-1.5 text-xs text-forest-950/40">(you)</span>
                    )}
                  </p>
                  <p className="text-xs text-forest-950/50">{u.email}</p>
                </div>
                {users.length > 1 && (
                  <form action={deleteUser.bind(null, u.id)}>
                    <button
                      type="submit"
                      className="rounded-lg p-1.5 text-forest-950/40 hover:bg-danger-100 hover:text-danger"
                      title="Remove account"
                    >
                      <Trash2 size={15} />
                    </button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        </div>

        <div className="card p-5">
          <h2 className="text-sm font-semibold text-forest-950 mb-3 flex items-center gap-1.5">
            <UserPlus size={15} /> Add an account
          </h2>
          <form action={createUser} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-forest-950/70 mb-1">Name</label>
              <input name="name" required className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-medium text-forest-950/70 mb-1">Email</label>
              <input type="email" name="email" required className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-medium text-forest-950/70 mb-1">
                Temporary password
              </label>
              <input
                type="password"
                name="password"
                required
                minLength={8}
                className={inputClass}
              />
              <p className="mt-1 text-xs text-forest-950/45">At least 8 characters.</p>
            </div>
            <button
              type="submit"
              className="w-full rounded-lg bg-forest-700 px-4 py-2 text-sm font-medium text-white hover:bg-forest-800"
            >
              Create account
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
