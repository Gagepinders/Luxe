"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Kanban,
  Users,
  MapPinned,
  FileText,
  CalendarClock,
  Receipt,
  Route,
  Mail,
  PhoneCall,
  Leaf,
  UserCog,
  LogOut,
  CloudSnow,
  Calculator,
  BarChart3,
  Boxes,
  Map,
  Settings,
} from "lucide-react";
import { logout } from "@/app/actions/auth";
import { isChromelessPath } from "@/lib/publicPaths";

const NAV = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/pipeline", label: "Pipeline", icon: Kanban },
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/calls", label: "Calls", icon: PhoneCall },
  { href: "/properties", label: "Properties", icon: MapPinned },
  { href: "/map", label: "Map", icon: Map },
  { href: "/estimator", label: "Estimator", icon: Calculator },
  { href: "/quotes", label: "Quotes", icon: FileText },
  { href: "/jobs", label: "Jobs", icon: CalendarClock },
  { href: "/invoices", label: "Invoices", icon: Receipt },
  { href: "/routes", label: "Routes", icon: Route },
  { href: "/weather", label: "Weather", icon: CloudSnow },
  { href: "/inventory", label: "Materials & Equip.", icon: Boxes },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/campaigns", label: "Campaigns", icon: Mail },
  { href: "/team", label: "Team", icon: UserCog },
  { href: "/settings", label: "Settings", icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  if (isChromelessPath(pathname)) return null;

  return (
    <aside className="no-print hidden md:flex md:w-60 md:flex-col md:fixed md:inset-y-0 bg-forest-950 text-forest-50">
      <div className="flex items-center gap-2 px-5 py-5 border-b border-white/10">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gold-500 text-forest-950">
          <Leaf size={20} strokeWidth={2.5} />
        </div>
        <div>
          <p className="text-sm font-semibold leading-tight text-white">
            Luxe Landscape
          </p>
          <p className="text-[11px] uppercase tracking-wide text-forest-100/60">
            &amp; Snow CRM
          </p>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {NAV.map((item) => {
          const active =
            item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                active
                  ? "bg-forest-700 text-white"
                  : "text-forest-100/80 hover:bg-forest-800 hover:text-white"
              }`}
            >
              <Icon size={17} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="px-4 py-4 border-t border-white/10 text-[11px] text-forest-100/60">
        <p>Essex Junction, VT</p>
        <p>(802) 735-7110</p>
      </div>
      <form action={logout} className="px-3 pb-4">
        <button
          type="submit"
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-forest-100/80 hover:bg-forest-800 hover:text-white"
        >
          <LogOut size={17} />
          Log out
        </button>
      </form>
    </aside>
  );
}
