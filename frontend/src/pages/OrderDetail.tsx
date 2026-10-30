import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check } from "lucide-react";
import { toast } from "sonner";
import { apiGet, apiPost } from "@/lib/api";
import { Button, buttonVariants } from "@/components/ui/button";
import { ImageWithFallback } from "@/components/ImageWithFallback";
import { Skeleton } from "@/components/ui/skeleton";
import { useMe } from "@/hooks/useAuth";
import { apiErrorMessage, formatDateTime, formatINR } from "@/lib/format";
import type { Order } from "@/types";

const STEPS = ["Placed", "Processing", "Shipped", "Delivered"];

export default function OrderDetail() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const { data: user } = useMe();

  const { data: order, isLoading, isError } = useQuery({
    queryKey: ["order", id],
    queryFn: () => apiGet<Order>(`/orders/${id}`),
    retry: false,
  });

  const cancel = useMutation({
    mutationFn: () => apiPost<Order>(`/orders/${id}/cancel`),
    onSuccess: async (updated) => {
      qc.setQueryData(["order", id], updated);
      await qc.invalidateQueries({ queryKey: ["orders"] });
      await qc.invalidateQueries({ queryKey: ["cart-products"] });
      toast.success(`Order ${updated.id} cancelled. Stock has been restored.`);
    },
    onError: (err) => toast.error(apiErrorMessage(err, "Could not cancel this order.")),
  });

  if (isLoading) {
    return <Skeleton className="h-72 w-full" />;
  }

  if (isError || !order) {
    return (
      <div className="border border-border bg-card p-8 text-center" data-testid="order-detail-not-found">
        <h2 className="font-heading text-2xl font-medium">Order not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">This order may belong to another account.</p>
        <Link to="/account/orders" className={buttonVariants({ variant: "outline", className: "mt-6" })}>
          Back to My Orders
        </Link>
      </div>
    );
  }

  if (order.customer_id && user && order.customer_id !== user.id) {
    return (
      <div className="border border-border bg-card p-8 text-center" data-testid="order-detail-forbidden">
        <h2 className="font-heading text-2xl font-medium">Not your order</h2>
        <p className="mt-2 text-sm text-muted-foreground">This order belongs to a different account.</p>
        <Link to="/account/orders" className={buttonVariants({ variant: "outline", className: "mt-6" })}>
          Back to My Orders
        </Link>
      </div>
    );
  }

  const cancelled = order.status === "Cancelled";

  return (
    <div data-testid="order-detail-page">
      <Link to="/account/orders" className={buttonVariants({ variant: "ghost", size: "sm", className: "mb-4 -ml-2" })}>
        ← All Orders
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3 border border-border bg-card px-5 py-4">
        <div>
          <p className="font-mono text-lg font-semibold" data-testid="order-detail-id">{order.id}</p>
          <p className="text-xs text-muted-foreground">Placed {formatDateTime(order.placed_at)}</p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider ${
              cancelled ? "bg-destructive/10 text-destructive" : "bg-[#15803D]/10 text-[#15803D]"
            }`}
            data-testid="order-detail-status"
          >
            {order.status} · Payment {order.payment_status}
          </span>
          {!cancelled && (
            <Button
              variant="outline"
              size="sm"
              className="text-destructive hover:border-destructive hover:text-destructive"
              data-testid="order-detail-cancel-button"
              disabled={cancel.isPending}
              onClick={() => cancel.mutate()}
            >
              {cancel.isPending ? "Cancelling…" : "Cancel Order"}
            </Button>
          )}
        </div>
      </div>

      {/* status timeline */}
      <div className="mt-4 border border-border bg-card p-5" data-testid="order-detail-timeline">
        {cancelled ? (
          <p className="text-sm text-destructive">
            This order was cancelled on {formatDateTime(order.updated_at)}. No payment was collected; reserved stock has been returned to inventory.
          </p>
        ) : (
          <ol className="grid grid-cols-4">
            {STEPS.map((step, i) => (
              <li key={step} className="relative text-center">
                <div className={`mx-auto flex h-8 w-8 items-center justify-center rounded-full border text-xs ${i === 0 ? "border-foreground bg-foreground text-white" : "border-border text-muted-foreground"}`}>
                  {i === 0 ? <Check size={14} /> : i + 1}
                </div>
                <p className={`mt-2 text-xs ${i === 0 ? "font-semibold" : "text-muted-foreground"}`}>{step}</p>
                {i < STEPS.length - 1 && <div className="absolute left-1/2 top-4 h-px w-full bg-border" aria-hidden />}
              </li>
            ))}
          </ol>
        )}
      </div>

      {/* items */}
      <div className="mt-4 border border-border bg-card p-5" data-testid="order-detail-items">
        <h2 className="font-heading text-xl font-medium">Items ({order.items.length})</h2>
        <div className="mt-4 space-y-4">
          {order.items.map((item) => (
            <div key={`${item.product_id}-${item.size ?? ""}`} className="flex gap-4" data-testid={`order-detail-item-${item.sku}`}>
              <div className="h-20 w-16 shrink-0 overflow-hidden bg-[#F3EFEA]">
                <ImageWithFallback src={item.image} alt={item.name} className="h-full w-full object-cover" />
              </div>
              <div className="flex flex-1 flex-col text-sm">
                <Link to={`/product/${item.product_id}`} className="font-medium hover:text-sale">
                  {item.name}
                </Link>
                <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                  SKU {item.sku} · Size {item.size ?? "One size"} · {item.color ?? "—"} · Qty {item.quantity}
                </p>
                <p className="mt-auto font-mono">{formatINR(item.line_total)}</p>
              </div>
            </div>
          ))}
        </div>
        <dl className="mt-5 space-y-2 border-t border-border pt-4 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Subtotal</dt>
            <dd className="font-mono">{formatINR(order.subtotal)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Discount</dt>
            <dd className="font-mono text-sale">− {formatINR(order.discount_total)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Delivery</dt>
            <dd className="font-mono">{order.delivery_charge === 0 ? "Free" : formatINR(order.delivery_charge)}</dd>
          </div>
          <div className="flex justify-between border-t border-border pt-2 text-base font-medium">
            <dt>Total ({order.payment_method})</dt>
            <dd className="font-mono" data-testid="order-detail-total">{formatINR(order.total)}</dd>
          </div>
        </dl>
      </div>

      {/* address */}
      <div className="mt-4 border border-border bg-card p-5" data-testid="order-detail-address">
        <h2 className="font-heading text-xl font-medium">Delivery address</h2>
        <address className="mt-3 text-sm not-italic leading-relaxed text-muted-foreground">
          <span className="font-medium text-foreground">{order.shipping_address.full_name}</span>
          <br />
          {order.shipping_address.line1}
          {order.shipping_address.line2 ? `, ${order.shipping_address.line2}` : ""}
          <br />
          {order.shipping_address.city}, {order.shipping_address.state} {order.shipping_address.postal_code}
          <br />
          Phone: {order.shipping_address.phone}
        </address>
      </div>
    </div>
  );
}
