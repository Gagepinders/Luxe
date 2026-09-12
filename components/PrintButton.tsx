"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui";

export default function PrintButton() {
  return (
    <Button variant="secondary" onClick={() => window.print()}>
      <Printer size={14} /> Print / PDF
    </Button>
  );
}
