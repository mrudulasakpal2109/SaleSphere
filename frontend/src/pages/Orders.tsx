import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Package, PackageOpen } from "lucide-react";
import { apiGet } from "@/lib/api";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/EmptyState";
import { ImageWithFallback } from "@/components/ImageWithFallback";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate, formatINR } from "@/lib/format";
import type { Order } from "@/types";

// Order history for the signed-in customer.
export default function Orders() {
  const { data: orders, isLoading } = useQuery({
    queryKey: ["orders"],
    queryFn: () => apiGet<Order[]>("/orders"),
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!orders || orders.length === 0) {
    return (
      <EmptyState
        icon={<PackageOpen size={22} className="text-muted-foreground" />}
        title="No orders yet"
        description="When you place an order it will appear here, with live status and details."
        actionLabel="Start Shopping"
        actionTo="/new-arrivals"
        testId="orders-empty-state"
      />
    );
  }

  return (
    <div className="space-y-4" data-testid="orders-list">
      {orders.map((order) => (
        <div key={order.id} className="border border-border bg-card" data-testid={`order-card-${order.id}`}>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3 text-xs">
            <div className="flex flex-wrap gap-x-6 gap-y-1">
              <span className="font-mono font-semibold" data-testid={`order-id-${order.id}`}>{order.id}</span>
              <span className="text-muted-foreground">Placed {formatDate(order.placed_at)}</span>
              <span className="text-muted-foreground">
                {order.items.length} item{order.items.length === 1 ? "" : "s"} · {formatINR(order.total)} · {order.payment_method}
              </span>
            </div>
            <span
              className={`px-2 py-1 text-[11px] font-semibold uppercase tracking-wider ${
                order.status === "Cancelled" ? "bg-destructive/10 text-destructive" : "bg-[#15803D]/10 text-[#15803D]"
              }`}
              data-testid={`order-status-${order.id}`}
            >
              {order.status} · Payment {order.payment_status}
            </span>
          </div>
          <div className="flex items-center gap-4 px-5 py-4">
            <div className="flex gap-2">
              {order.items.slice(0, 3).map((item) => (
                <div key={`${item.product_id}-${item.size ?? ""}`} className="h-16 w-12 overflow-hidden bg-[#F3EFEA]">
                  <ImageWithFallback src={item.image} alt={item.name} className="h-full w-full object-cover" />
                </div>
              ))}
              {order.items.length > 3 && (
                <div className="flex h-16 w-12 items-center justify-center bg-secondary font-mono text-xs text-muted-foreground">
                  +{order.items.length - 3}
                </div>
              )}
            </div>
            <Link to={`/account/orders/${order.id}`} data-testid={`order-view-${order.id}`} className={buttonVariants({ variant: "outline", size: "sm", className: "ml-auto" })}>
              <Package size={14} /> View Details
            </Link>
          </div>
        </div>
      ))}
    </div>
  );
}
