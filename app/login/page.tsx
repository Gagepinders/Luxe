import { Leaf } from "lucide-react";
import { login } from "@/app/actions/auth";
import { inputClass } from "@/components/ui";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const params = await searchParams;
  const hasError = params.error === "1";
  const next = params.next || "/";

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="card w-full max-w-sm p-8">
        <div className="flex flex-col items-center gap-2 mb-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gold-500 text-forest-950">
            <Leaf size={22} />
          </div>
          <h1 className="text-lg font-semibold text-forest-950">Luxe Landscape & Snow</h1>
          <p className="text-xs text-forest-950/50">Sign in to the CRM</p>
        </div>

        {hasError && (
          <div className="mb-4 rounded-lg bg-danger-100 border border-danger px-3 py-2 text-xs text-danger">
            Incorrect email or password.
          </div>
        )}

        <form action={login} className="space-y-3">
          <input type="hidden" name="next" value={next} />
          <div>
            <label className="block text-sm font-medium text-forest-950/80 mb-1">Email</label>
            <input
              type="email"
              name="email"
              required
              autoFocus
              autoComplete="username"
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-forest-950/80 mb-1">Password</label>
            <input
              type="password"
              name="password"
              required
              autoComplete="current-password"
              className={inputClass}
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-lg bg-forest-700 px-4 py-2 text-sm font-medium text-white hover:bg-forest-800"
          >
            Sign in
          </button>
        </form>
      </div>
    </div>
  );
}
