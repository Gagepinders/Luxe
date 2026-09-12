"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (pathname === "/login") {
    return <div className="flex-1">{children}</div>;
  }
  return <div className="flex-1 md:pl-60 pb-16 md:pb-0">{children}</div>;
}
