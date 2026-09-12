"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui";
import CustomerPropertySelect from "@/components/CustomerPropertySelect";
import { formatCurrency, formatSqft } from "@/lib/format";

type Customer = { id: string; name: string };
type Property = {
  id: string;
  customerId: string;
  label: string;
  addressLine: string;
  lawnSqft: number | null;
  driveSqft: number | null;
  walkwaySqft: number | null;
  mulchSqft: number | null;
};

const CATEGORIES: { key: keyof Property; label: string; rateGuess: RegExp }[] = [
  { key: "lawnSqft", label: "Lawn", rateGuess: /lawn|mow/i },
  { key: "driveSqft", label: "Driveway", rateGuess: /drive|plow|paver/i },
  { key: "walkwaySqft", label: "Walkway", rateGuess: /walk|sidewalk|shovel/i },
  { key: "mulchSqft", label: "Mulch beds", rateGuess: /mulch|bed/i },
];

export default function EstimatorTool({
  customers,
  properties,
  serviceTypes,
}: {
  customers: Customer[];
  properties: Property[];
  serviceTypes: { id: string; name: string; defaultUnit: string; defaultRate: number }[];
}) {
  const [customerId, setCustomerId] = useState("");
  const [propertyId, setPropertyId] = useState("");
  const property = properties.find((p) => p.id === propertyId) ?? null;

  const defaultRateFor = (guess: RegExp) => {
    const match = serviceTypes.find((st) => st.defaultUnit === "sqft" && guess.test(st.name));
    return match?.defaultRate ?? 0;
  };

  const [rates, setRates] = useState<Record<string, number>>({});

  const activeCategories = CATEGORIES.filter(
    (c) => ((property?.[c.key] as number | null) ?? 0) > 0
  );

  const rateFor = (key: string, guess: RegExp) =>
    rates[key] ?? defaultRateFor(guess);

  const total = useMemo(() => {
    if (!property) return 0;
    return CATEGORIES.reduce((sum, c) => {
      const sqft = (property[c.key] as number | null) ?? 0;
      if (sqft <= 0) return sum;
      const defaultRate =
        serviceTypes.find((st) => st.defaultUnit === "sqft" && c.rateGuess.test(st.name))
          ?.defaultRate ?? 0;
      const rate = rates[c.key] ?? defaultRate;
      return sum + sqft * rate;
    }, 0);
  }, [property, rates, serviceTypes]);

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="card p-5">
        <CustomerPropertySelect
          customers={customers}
          properties={properties}
          customerId={customerId}
          propertyId={propertyId}
          onCustomerChange={(id) => {
            setCustomerId(id);
            setPropertyId("");
          }}
          onPropertyChange={setPropertyId}
        />
      </div>

      {property && (
        <div className="card p-5">
          {activeCategories.length === 0 ? (
            <p className="text-sm text-forest-950/50">
              This property has no measured areas yet.{" "}
              <a href={`/properties/${property.id}/edit`} className="text-forest-700 hover:underline">
                Measure it on the map
              </a>{" "}
              first.
            </p>
          ) : (
            <>
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase tracking-wide text-forest-950/50">
                  <tr>
                    <th className="pb-2 pr-2">Area</th>
                    <th className="pb-2 pr-2 w-28">Measured</th>
                    <th className="pb-2 pr-2 w-32">Rate / sq ft</th>
                    <th className="pb-2 text-right w-28">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {activeCategories.map((c) => {
                    const sqft = (property[c.key] as number) ?? 0;
                    const rate = rateFor(c.key, c.rateGuess);
                    return (
                      <tr key={c.key} className="border-t border-border-subtle">
                        <td className="py-2 pr-2 font-medium text-forest-950">{c.label}</td>
                        <td className="py-2 pr-2 text-forest-950/70">{formatSqft(sqft)}</td>
                        <td className="py-2 pr-2">
                          <input
                            type="number"
                            step="0.01"
                            value={rate}
                            onChange={(e) =>
                              setRates((r) => ({ ...r, [c.key]: Number(e.target.value) }))
                            }
                            className="w-full rounded-md border border-border-subtle bg-surface px-2 py-1.5 text-xs"
                          />
                        </td>
                        <td className="py-2 text-right font-medium">
                          {formatCurrency(sqft * rate)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              <div className="flex items-center justify-between border-t border-border-subtle pt-3 mt-3">
                <p className="text-sm font-semibold text-forest-950">
                  Ballpark total: {formatCurrency(total)}
                </p>
                <Button href={`/quotes/new?customerId=${customerId}&propertyId=${propertyId}`}>
                  Turn into a quote
                </Button>
              </div>
              <p className="mt-2 text-xs text-forest-950/40">
                Ballpark only — rates default from your service types where names match. Fine-tune
                everything on the actual quote.
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
