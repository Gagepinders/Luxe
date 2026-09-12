"use client";

import { useState } from "react";
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
  MoreHorizontal,
  X,
} from "lucide-react";

const PRIMARY = [
  { href: "/", label: "Home", icon: LayoutDashboard },
  { href: "/pipeline", label: "Pipeline", icon: Kanban },
  { href: "/jobs", label: "Jobs", icon: CalendarClock },
  { href: "/routes", label: "Routes", icon: Route },
];

const MORE = [
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/properties", label: "Properties", icon: MapPinned },
  { href: "/quotes", label: "Quotes", icon: FileText },
  { href: "/invoices", label: "Invoices", icon: Receipt },
  { href: "/campaigns", label: "Campaigns", icon: Mail },
];

export default function MobileNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const moreActive = MORE.some((item) => pathname.startsWith(item.href));

  return (
    <>
      {open && (
        <div className="md:hidden fixed inset-0 z-40 bg-black/40" onClick={() => setOpen(false)}>
          <div
            className="absolute bottom-16 inset-x-3 rounded-xl bg-forest-950 p-2 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-2 py-1.5">
              <p className="text-xs font-semibold uppercase tracking-wide text-forest-100/60">
                More
              </p>
              <button onClick={() => setOpen(false)} className="text-forest-100/60">
                <X size={16} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-1">
              {MORE.map((item) => {
                const active = pathname.startsWith(item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={`flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium ${
                      active ? "bg-forest-700 text-white" : "text-forest-100/80 hover:bg-forest-800"
                    }`}
                  >
                    <Icon size={16} />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}
      <nav className="no-print md:hidden fixed bottom-0 inset-x-0 z-40 bg-forest-950 border-t border-white/10 flex justify-between px-1 py-1.5">
        {PRIMARY.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-1 flex-col items-center gap-0.5 rounded-md py-1.5 text-[10px] font-medium ${
                active ? "text-gold-500" : "text-forest-100/70"
              }`}
            >
              <Icon size={18} />
              {item.label}
            </Link>
          );
        })}
        <button
          onClick={() => setOpen((v) => !v)}
          className={`flex flex-1 flex-col items-center gap-0.5 rounded-md py-1.5 text-[10px] font-medium ${
            moreActive ? "text-gold-500" : "text-forest-100/70"
          }`}
        >
          <MoreHorizontal size={18} />
          More
        </button>
      </nav>
    </>
  );
}
