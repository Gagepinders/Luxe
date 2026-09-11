"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  MapPinned,
  FileText,
  CalendarClock,
  Route,
  Leaf,
} from "lucide-react";

const NAV = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/properties", label: "Properties", icon: MapPinned },
  { href: "/quotes", label: "Quotes", icon: FileText },
  { href: "/jobs", label: "Jobs", icon: CalendarClock },
  { href: "/routes", label: "Routes", icon: Route },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex md:w-60 md:flex-col md:fixed md:inset-y-0 bg-forest-950 text-forest-50">
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

      <nav className="flex-1 px-3 py-4 space-y-1">
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
        <p>Chittenden County, VT</p>
        <p>(802) 735-7110</p>
      </div>
    </aside>
  );
}
