import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, RefreshCw, Check } from "lucide-react";
import { toast } from "sonner";
import { apiGet, apiPost } from "@/lib/api";
import { formatINR } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { PageTitle } from "@/pages/manager/ManagerOverview";
import type { InventoryItem } from "@/managerTypes";

const FILTERS = [
  { value: "", label: "All Items" },
  { value: "low", label: "Low stock (≤5)" },
  { value: "out", label: "Out of stock (0)" },
];

const BADGE: Record<string, string> = {
  in_stock: "bg-[#15803D]/10 text-[#15803D] border-[#15803D]/20",
  low: "bg-[#D97706]/10 text-[#D97706] border-[#D97706]/20 font-semibold",
  out: "bg-destructive/10 text-destructive border-destructive/20 font-semibold",
};

export default function ManagerInventory() {
  const [params, setParams] = useSearchParams();
  const stock = params.get("stock") ?? "";
  const [q, setQ] = useState("");
  const [customQty, setCustomQty] = useState<Record<string, number>>({});
  const queryClient = useQueryClient();

  const qs = new URLSearchParams({
    ...(stock ? { stock } : {}),
    ...(q.trim() ? { q: q.trim() } : {}),
  }).toString();

  const { data, isLoading } = useQuery({
    queryKey: ["manager", "inventory", qs],
    queryFn: () => apiGet<InventoryItem[]>(`/manager/inventory?${qs}`),
    placeholderData: (prev) => prev,
  });

  const restockMutation = useMutation({
    mutationFn: ({ id, qty }: { id: string; qty: number }) =>
      apiPost<InventoryItem>(`/manager/inventory/${encodeURIComponent(id)}/restock`, { quantity: qty }),
    onSuccess: (updated, variables) => {
      queryClient.invalidateQueries({ queryKey: ["manager", "inventory"] });
      queryClient.invalidateQueries({ queryKey: ["manager", "overview"] });
      toast.success(`Restocked ${updated.name}: added +${variables.qty} units (total: ${updated.stock})`);
    },
    onError: () => {
      toast.error("Failed to add stock. Please try again.");
    },
  });

  const handleAddStock = (id: string, qty: number) => {
    if (qty <= 0) return;
    restockMutation.mutate({ id, qty });
  };

  return (
    <div data-testid="manager-inventory-page" className="space-y-6">
      <PageTitle overline="Real-time Warehouse & Storefront Stock" title="Inventory Management">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name, SKU, category…"
          className="w-72 bg-card"
          data-testid="inventory-search-input"
        />
      </PageTitle>

      {/* Filter and stats row */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
        <div className="flex gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              data-testid={`inventory-filter-${f.value || "all"}`}
              onClick={() => setParams(f.value ? { stock: f.value } : {})}
              className={`border px-3.5 py-1.5 text-xs font-medium uppercase tracking-[0.1em] transition ${
                stock === f.value
                  ? "border-foreground bg-foreground text-background"
                  : "border-border bg-card text-muted-foreground hover:border-foreground hover:text-foreground"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span>Initial catalog stock: <strong className="text-foreground">100 units/item</strong></span>
          <span>Total products: <strong className="text-foreground">{data?.length ?? "…"}</strong></span>
        </div>
      </div>

      {isLoading && !data ? (
        <Skeleton className="h-80 w-full" />
      ) : (
        <div className="overflow-x-auto border border-border bg-card shadow-sm">
          <table className="w-full min-w-[840px] text-sm" data-testid="inventory-table">
            <thead>
              <tr className="border-b border-border bg-[#EFECE6]/50 text-left text-xs uppercase tracking-[0.12em] text-muted-foreground">
                <th className="p-3.5">SKU</th>
                <th className="p-3.5">Product Name</th>
                <th className="p-3.5">Category</th>
                <th className="p-3.5 text-right">Price</th>
                <th className="p-3.5 text-right">Ordered Units</th>
                <th className="p-3.5 text-right">Current Stock</th>
                <th className="p-3.5 text-center">Status</th>
                <th className="p-3.5 text-right">Increase Stock</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data?.map((p) => {
                const addQty = customQty[p.id] ?? 50;
                return (
                  <tr key={p.id} className="transition-colors hover:bg-[#FAF8F5]" data-testid={`inventory-row-${p.sku}`}>
                    <td className="p-3.5 font-mono text-xs font-semibold text-muted-foreground">{p.sku}</td>
                    <td className="p-3.5 font-medium">{p.name}</td>
                    <td className="p-3.5 text-xs capitalize text-muted-foreground">
                      {p.category} <span className="text-border">/</span> {p.subcategory}
                    </td>
                    <td className="p-3.5 text-right font-mono font-medium">{formatINR(p.price)}</td>
                    <td className="p-3.5 text-right font-mono">
                      <span className="font-semibold">{p.units_ordered}</span>
                    </td>
                    <td className="p-3.5 text-right font-mono">
                      <span className={`text-base font-bold ${p.stock <= 5 ? "text-destructive" : "text-foreground"}`}>
                        {p.stock}
                      </span>
                    </td>
                    <td className="p-3.5 text-center">
                      <span className={`inline-block border px-2.5 py-0.5 text-[10px] uppercase tracking-wider ${BADGE[p.stock_status] ?? ""}`}>
                        {p.stock_status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="p-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleAddStock(p.id, 25)}
                          disabled={restockMutation.isPending}
                          className="border border-border bg-background px-2 py-1 font-mono text-xs transition hover:border-foreground hover:bg-foreground hover:text-white"
                          title="Add 25 units"
                        >
                          +25
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAddStock(p.id, 50)}
                          disabled={restockMutation.isPending}
                          className="border border-border bg-background px-2 py-1 font-mono text-xs transition hover:border-foreground hover:bg-foreground hover:text-white"
                          title="Add 50 units"
                        >
                          +50
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAddStock(p.id, 100)}
                          disabled={restockMutation.isPending}
                          className="border border-border bg-background px-2 py-1 font-mono text-xs font-semibold text-sale transition hover:bg-sale hover:text-white"
                          title="Add 100 units"
                        >
                          +100
                        </button>
                        <div className="ml-2 flex items-center gap-1 border border-border bg-background p-0.5">
                          <input
                            type="number"
                            min={1}
                            max={5000}
                            value={addQty}
                            onChange={(e) => setCustomQty({ ...customQty, [p.id]: parseInt(e.target.value) || 0 })}
                            className="w-12 bg-transparent text-center font-mono text-xs focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => handleAddStock(p.id, addQty)}
                            disabled={restockMutation.isPending || addQty <= 0}
                            className="flex h-5 w-5 items-center justify-center bg-foreground text-background transition hover:bg-sale"
                            title="Add custom quantity"
                          >
                            <Plus size={12} />
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {data?.length === 0 && (
            <p className="p-8 text-center text-sm text-muted-foreground">No products match this filter.</p>
          )}
        </div>
      )}
    </div>
  );
}
