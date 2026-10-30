import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api";
import { formatDate, formatDateTime, formatINR } from "@/lib/format";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { PageTitle } from "@/pages/manager/ManagerOverview";
import type { CustomerDetail, CustomerListResponse } from "@/managerTypes";

export default function ManagerCustomers() {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string | null>(null);
  const { data, isLoading } = useQuery({
    queryKey: ["manager", "customers", q, page],
    queryFn: () => apiGet<CustomerListResponse>(`/manager/customers?page=${page}&q=${encodeURIComponent(q.trim())}`),
    placeholderData: (prev) => prev,
  });
  const detail = useQuery({
    queryKey: ["manager", "customer", selected],
    queryFn: () => apiGet<CustomerDetail>(`/manager/customers/${encodeURIComponent(selected!)}`),
    enabled: !!selected,
  });
  const pages = data ? Math.max(1, Math.ceil(data.total / 25)) : 1;

  return (
    <div data-testid="manager-customers-page">
      <PageTitle overline="Purchase histories" title="Customers">
        <Input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Search name or email" className="w-64 bg-card" data-testid="customers-search-input" />
      </PageTitle>
      <p className="mb-4 text-xs text-muted-foreground">
        Includes registered accounts and guest checkouts (grouped by email). “Completed” = paid & not cancelled.
      </p>
      {isLoading && !data ? (
        <Skeleton className="h-80 w-full" />
      ) : (
        <div className="overflow-x-auto border border-border bg-card">
          <table className="w-full min-w-[720px] text-sm" data-testid="customers-table">
            <thead>
              <tr className="border-b border-foreground text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="p-3">Customer</th><th>Type</th><th className="text-right">Orders</th><th className="text-right">Completed</th><th className="text-right">Paid spend</th><th className="text-right">Order value</th><th className="p-3 text-right">Last order</th>
              </tr>
            </thead>
            <tbody>
              {data?.items.map((c) => (
                <tr key={c.key} onClick={() => setSelected(c.key)} className="cursor-pointer border-b border-border transition-colors hover:bg-secondary" data-testid={`customer-row-${c.email}`}>
                  <td className="p-3"><p className="font-medium">{c.name}</p><p className="text-xs text-muted-foreground">{c.email}</p></td>
                  <td className="text-xs">{c.is_guest ? "Guest" : `Member since ${formatDate(c.registered_at ?? "")}`}</td>
                  <td className="text-right font-mono">{c.orders}</td>
                  <td className="text-right font-mono">{c.completed_purchases}</td>
                  <td className="text-right font-mono">{formatINR(c.paid_spend)}</td>
                  <td className="text-right font-mono">{formatINR(c.order_value)}</td>
                  <td className="p-3 text-right text-xs text-muted-foreground">{c.last_order_at ? formatDate(c.last_order_at) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {data?.items.length === 0 && <p className="p-6 text-center text-sm text-muted-foreground">No customers found.</p>}
        </div>
      )}
      {pages > 1 && (
        <div className="mt-4 flex items-center gap-3 text-sm">
          <button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)} className="border border-border px-3 py-1 disabled:opacity-40" data-testid="customers-prev">Prev</button>
          <span className="font-mono">{page} / {pages}</span>
          <button type="button" disabled={page >= pages} onClick={() => setPage(page + 1)} className="border border-border px-3 py-1 disabled:opacity-40" data-testid="customers-next">Next</button>
        </div>
      )}

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent side="right" className="w-full overflow-y-auto p-6 sm:max-w-lg" data-testid="customer-detail-sheet">
          <SheetHeader className="p-0">
            <SheetTitle className="font-heading text-2xl">{detail.data?.customer.name ?? "Customer"}</SheetTitle>
          </SheetHeader>
          {detail.isLoading ? <Skeleton className="mt-4 h-40 w-full" /> : detail.data && (
            <div className="mt-4 space-y-4">
              <p className="text-sm text-muted-foreground">{detail.data.customer.email} · {detail.data.customer.orders} orders · {formatINR(detail.data.customer.paid_spend)} paid</p>
              {detail.data.orders.map((o) => (
                <div key={o.id} className="border border-border p-3 text-sm" data-testid={`customer-order-${o.id}`}>
                  <div className="flex justify-between gap-2"><span className="font-mono font-semibold">{o.id}</span><span className="font-mono">{formatINR(o.total)}</span></div>
                  <p className="mt-0.5 text-xs text-muted-foreground">{formatDateTime(o.placed_at)} · {o.status} · {o.payment_method} {o.payment_status}</p>
                  <ul className="mt-2 space-y-0.5 text-xs">
                    {o.items.map((it) => <li key={`${it.product_id}-${it.size}`}>{it.quantity} × {it.name} ({it.size ?? "One size"}, {it.color ?? "—"})</li>)}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
